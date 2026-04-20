import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contentMode: z.enum(['ai', 'custom']).optional(),
  customContents: z.array(z.string()).optional(),
  aiKeywords: z.array(z.string()).optional(),
  imageMode: z.enum(['none', 'manual', 'ai']).optional(),
  imageMinCount: z.number().int().min(0).max(20).optional(),
  imageMaxCount: z.number().int().min(0).max(20).optional(),
  customImages: z.array(z.string().min(1)).optional(),
  allowDuplicateContent: z.boolean().optional(),
  allowDuplicateImages: z.boolean().optional(),
});

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await db.campaign.findUnique({
      where: { 
        id: params.id,
        clientId: session.user.id
      },
      include: {
        mapLocation: true,
        pricingTier: true,
        tierItems: { include: { pricingTier: true } },
        reviewItems: {
          include: {
            pricingTier: { select: { level: true, name: true } },
            assignedWorker: { select: { name: true } },
            assignedAccount: { select: { accountName: true } },
          },
          orderBy: { scheduledAt: 'asc' }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Fetch campaign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const campaign = await db.campaign.findUnique({
      where: { id: params.id, clientId: session.user.id }
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (!['pending', 'active', 'paused'].includes(campaign.status)) {
      return NextResponse.json({ error: "Cannot edit a completed or cancelled campaign" }, { status: 400 });
    }

    // Validate image range if both provided
    const newMin = data.imageMinCount ?? campaign.imageMinCount;
    const newMax = data.imageMaxCount ?? campaign.imageMaxCount;
    if (newMax < newMin) {
      return NextResponse.json({ error: "imageMaxCount must be >= imageMinCount" }, { status: 400 });
    }

    const updated = await db.campaign.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contentMode !== undefined && { contentMode: data.contentMode }),
        ...(data.customContents !== undefined && { customContents: data.customContents }),
        ...(data.aiKeywords !== undefined && { aiKeywords: data.aiKeywords }),
        ...(data.imageMode !== undefined && { imageMode: data.imageMode }),
        ...(data.imageMinCount !== undefined && { imageMinCount: data.imageMinCount }),
        ...(data.imageMaxCount !== undefined && { imageMaxCount: data.imageMaxCount }),
        ...(data.customImages !== undefined && { customImages: data.customImages }),
        ...(data.allowDuplicateContent !== undefined && { allowDuplicateContent: data.allowDuplicateContent }),
        ...(data.allowDuplicateImages !== undefined && { allowDuplicateImages: data.allowDuplicateImages }),
      }
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("Patch campaign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

