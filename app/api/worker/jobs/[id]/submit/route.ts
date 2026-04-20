import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const submitProofSchema = z.object({
  publishedUrl: z.string().url(),
  proofScreenshot: z.string().min(1).optional()
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'worker' || session.user.workerStatus !== 'approved') {
      return NextResponse.json({ error: "Unauthorized or not approved" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const result = submitProofSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 });
    }

    const { publishedUrl, proofScreenshot } = result.data;

    // Verify ownership and status
    const job = await db.reviewItem.findUnique({
      where: { id },
      include: { campaign: true }
    });

    if (!job || job.assignedWorkerId !== session.user.id) {
      return NextResponse.json({ error: "Job not found or not assigned to you" }, { status: 404 });
    }

    // Allow re-submit from pending_verify (worker edits before admin reviews)
    if (job.status !== 'assigned' && job.status !== 'pending_verify') {
      return NextResponse.json({ error: "Job cannot be edited in its current state" }, { status: 400 });
    }

    if (job.campaign.status === 'cancelled' || job.campaign.status === 'paused') {
      return NextResponse.json({ error: "Campaign is no longer active" }, { status: 400 });
    }

    const updatedJob = await db.reviewItem.update({
      where: { id },
      data: {
        status: 'pending_verify',
        publishedUrl,
        proofScreenshot: proofScreenshot || null,
        proofSubmittedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error("Submit job error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
