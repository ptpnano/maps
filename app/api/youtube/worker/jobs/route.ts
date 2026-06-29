import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "Deprecated endpoint. Use POST /api/youtube/worker/claims for chunk-claim distribution.",
  }, { status: 410 });
}
