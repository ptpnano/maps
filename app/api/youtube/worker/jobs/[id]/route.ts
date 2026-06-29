import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({
    error: "Deprecated endpoint. Use PATCH /api/youtube/worker/claims/{claimTargetId}.",
  }, { status: 410 });
}
