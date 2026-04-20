import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const defaultTiers = await db.pricingTier.findMany({
      where: { isActive: true },
      orderBy: { pricePerReview: 'asc' }
    });

    return NextResponse.json({ tiers: defaultTiers });
  } catch (error) {
    console.error("Fetch pricing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
