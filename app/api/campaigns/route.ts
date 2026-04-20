import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createCampaignSchema = z.object({
  mapLocation: z.object({
    googlePlaceId: z.string(),
    googleMapsUrl: z.string().url(),
    name: z.string().nullish(),
    address: z.string().nullish()
  }),
  tiers: z.array(z.object({
    pricingTierId: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    quantity: z.number().int().min(1),
  })).min(1, 'Phải chọn ít nhất 1 loại tài khoản'),
  target5Star: z.number().int().min(0).default(0),
  target4Star: z.number().int().min(0).default(0),
  target3Star: z.number().int().min(0).default(0),
  contentMode: z.enum(['ai', 'custom']).default('ai'),
  customContents: z.array(z.string()).default([]),
  aiKeywords: z.array(z.string()).default([]),
  imageMode: z.enum(['none', 'manual', 'ai']).default('none'),
  imageMinCount: z.number().int().min(0).max(10).default(0),
  imageMaxCount: z.number().int().min(0).max(10).default(0),
  allowDuplicateContent: z.boolean().default(true),
  allowDuplicateImages: z.boolean().default(true),
  maxReviewsPerDay: z.number().int().min(1).default(5)
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createCampaignSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Calculate total reviews from tiers
    const totalReviews = data.tiers.reduce((sum, t) => sum + t.quantity, 0);

    // Validate total matching targets
    const totalTargets = data.target5Star + data.target4Star + data.target3Star;
    if (totalTargets !== totalReviews) {
      return NextResponse.json({ error: "Tổng sao mục tiêu phải bằng tổng review" }, { status: 400 });
    }

    // Validate image config
    if (data.imageMode !== 'none' && data.imageMaxCount < data.imageMinCount) {
      return NextResponse.json({ error: "Số ảnh tối đa phải >= tối thiểu" }, { status: 400 });
    }

    // Content mode validation
    if (data.contentMode === 'ai' && data.aiKeywords.length === 0) {
      return NextResponse.json({ error: "Chế độ AI yêu cầu ít nhất 1 keyword" }, { status: 400 });
    }

    // Lookup all pricing tiers and validate
    const tierIds = data.tiers.map(t => t.pricingTierId);
    const pricingTiers = await db.pricingTier.findMany({
      where: { id: { in: tierIds }, isActive: true }
    });

    if (pricingTiers.length !== tierIds.length) {
      return NextResponse.json({ error: "Một hoặc nhiều gói dịch vụ không hợp lệ" }, { status: 400 });
    }

    const tierMap = new Map(pricingTiers.map(t => [t.id, t]));

    // Calculate total budget across all tiers
    let totalBudget = 0;
    for (const tierItem of data.tiers) {
      const tier = tierMap.get(tierItem.pricingTierId)!;
      totalBudget += tier.pricePerReview.toNumber() * tierItem.quantity;
    }

    // Find max warrantyDays across tiers
    const maxWarrantyDays = Math.max(...pricingTiers.map(t => t.warrantyDays));

    // Execute atomic transaction for campaign creation & escrow
    const campaignAction = await db.$transaction(async (tx) => {
      // 1. Check wallet and deduct
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id }
      });

      if (!wallet || wallet.availableBalance.toNumber() < totalBudget) {
        throw new Error("Insufficient balance");
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalBudget },
          frozenBalance: { increment: totalBudget }
        }
      });

      // 2. Add transaction log
      const idempotencyKey = `freeze_campaign_${randomUUID()}`;
      const tLog = await tx.transactionLog.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          type: 'freeze',
          oldBalance: wallet.availableBalance,
          newBalance: updatedWallet.availableBalance,
          changeAmount: -totalBudget,
          reason: `Freeze for ${totalReviews} reviews (multi-tier)`,
          idempotencyKey
        }
      });

      // 3. Upsert Map Location — update URL/name if location already exists
      const mapLocation = await tx.mapLocation.upsert({
        where: { googlePlaceId: data.mapLocation.googlePlaceId },
        update: {
          googleMapsUrl: data.mapLocation.googleMapsUrl,
          name: data.mapLocation.name,
          address: data.mapLocation.address,
        },
        create: {
          googlePlaceId: data.mapLocation.googlePlaceId,
          googleMapsUrl: data.mapLocation.googleMapsUrl,
          name: data.mapLocation.name,
          address: data.mapLocation.address
        }
      });

      // 4. Create Campaign (status = pending for admin approval)
      const warrantyUntil = new Date();
      warrantyUntil.setDate(warrantyUntil.getDate() + maxWarrantyDays);

      const campaign = await tx.campaign.create({
        data: {
          clientId: session.user.id,
          mapLocationId: mapLocation.id,
          totalReviews: totalReviews,
          target5Star: data.target5Star,
          target4Star: data.target4Star,
          target3Star: data.target3Star,
          contentMode: data.contentMode,
          customContents: data.customContents,
          aiKeywords: data.aiKeywords,
          imageMode: data.imageMode,
          imageMinCount: data.imageMode !== 'none' ? data.imageMinCount : 0,
          imageMaxCount: data.imageMode !== 'none' ? data.imageMaxCount : 0,
          allowDuplicateContent: data.allowDuplicateContent,
          allowDuplicateImages: data.allowDuplicateImages,
          totalBudget: totalBudget,
          frozenAmount: totalBudget,
          status: 'pending',
          maxReviewsPerDay: data.maxReviewsPerDay,
          warrantyUntil: warrantyUntil
        }
      });

      // 5. Create CampaignTierItems
      await tx.campaignTierItem.createMany({
        data: data.tiers.map(t => ({
          campaignId: campaign.id,
          pricingTierId: t.pricingTierId,
          quantity: t.quantity
        }))
      });

      // Update referenceId in tLog
      await tx.transactionLog.update({
        where: { id: tLog.id },
        data: { referenceType: 'campaign', referenceId: campaign.id }
      });

      // 6. Generate ReviewItems with per-tier pricing
      // Build review items array respecting tier quantities
      const reviewItemsToCreate: any[] = [];

      // Build stars array
      let starsArray = [
        ...Array(data.target5Star).fill(5),
        ...Array(data.target4Star).fill(4),
        ...Array(data.target3Star).fill(3),
      ];
      // Fisher-Yates shuffle
      for (let i = starsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [starsArray[i], starsArray[j]] = [starsArray[j], starsArray[i]];
      }

      // Build tier assignment array (which tier each review belongs to)
      const tierAssignments: { tierId: string; clientPrice: number; workerPayout: number }[] = [];
      for (const tierItem of data.tiers) {
        const tier = tierMap.get(tierItem.pricingTierId)!;
        for (let i = 0; i < tierItem.quantity; i++) {
          tierAssignments.push({
            tierId: tier.id,
            clientPrice: tier.pricePerReview.toNumber(),
            workerPayout: tier.workerPayout.toNumber()
          });
        }
      }
      // Shuffle tier assignments too so they mix with stars
      for (let i = tierAssignments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tierAssignments[i], tierAssignments[j]] = [tierAssignments[j], tierAssignments[i]];
      }

      // Distribute reviews across days
      let dayIndex = 0;
      let countOnDay = 0;
      for (let i = 0; i < totalReviews; i++) {
        if (countOnDay >= data.maxReviewsPerDay) {
          dayIndex++;
          countOnDay = 0;
        }
        countOnDay++;

        const hour = Math.floor(Math.random() * (21 - 9 + 1)) + 9;
        const minute = Math.floor(Math.random() * 60);

        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + dayIndex);
        scheduledAt.setHours(hour, minute, 0, 0);

        // Random image count if images enabled
        let imageCount = 0;
        if (data.imageMode !== 'none') {
          imageCount = data.imageMinCount + Math.floor(Math.random() * (data.imageMaxCount - data.imageMinCount + 1));
        }

        reviewItemsToCreate.push({
          campaignId: campaign.id,
          pricingTierId: tierAssignments[i].tierId,
          targetRating: starsArray[i],
          clientPrice: tierAssignments[i].clientPrice,
          workerPayout: tierAssignments[i].workerPayout,
          imageCount,
          scheduledAt,
          status: 'pending'
        });
      }

      await tx.reviewItem.createMany({
        data: reviewItemsToCreate
      });

      return campaign;
    });

    return NextResponse.json({ success: true, campaign: campaignAction }, { status: 201 });

  } catch (error: any) {
    console.error("Campaign create error:", error);
    if (error.message === "Insufficient balance") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'client') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await db.campaign.findMany({
      where: { clientId: session.user.id },
      include: {
        mapLocation: true,
        tierItems: { include: { pricingTier: true } },
        pricingTier: true,
        _count: {
          select: {
            reviewItems: {
              where: { status: { in: ['live', 'holding'] } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Campaign list error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
