import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Query SystemConfig once before transaction
    const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
    const holdingDays = config?.holdingDays ?? 7;

    const jobResult = await db.$transaction(async (tx) => {
      const job = await tx.reviewItem.findUnique({
        where: { id },
        include: {
          campaign: {
            include: { mapLocation: true }
          },
          assignedWorker: {
            include: { wallet: true }
          }
        }
      });

      if (!job || job.status !== 'pending_verify') {
        throw new Error("Job not found or not in pending_verify state");
      }

      const releaseAt = new Date();
      releaseAt.setDate(releaseAt.getDate() + holdingDays);

      const updatedJob = await tx.reviewItem.update({
        where: { id },
        data: {
          status: 'holding',
          releaseAt
        }
      });

      return updatedJob;
    });

    return NextResponse.json({ success: true, job: jobResult });
  } catch (error: unknown) {
    console.error("Approve job error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const isClientError = message.includes("not found") || message.includes("not in");
    return NextResponse.json(
      { error: isClientError ? message : "Internal Server Error" },
      { status: isClientError ? 400 : 500 }
    );
  }
}
