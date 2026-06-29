import { NextResponse } from "next/server";
import { ensureYoutubeServiceConfigs } from "@/lib/youtube-config";

export async function GET() {
  try {
    const configs = await ensureYoutubeServiceConfigs();
    return NextResponse.json({
      services: configs.map((cfg) => ({
        serviceType: cfg.serviceType,
        name: cfg.name,
        isActive: cfg.isActive,
        minQuantity: cfg.minQuantity,
        maxQuantity: cfg.maxQuantity,
        defaultQuantity: cfg.defaultQuantity,
        pricePerUnit: cfg.pricePerUnit,
        requireApproval: cfg.requireApproval,
      })),
    });
  } catch (error) {
    console.error("YouTube public config error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
