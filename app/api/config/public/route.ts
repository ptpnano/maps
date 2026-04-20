import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  let config = await db.systemConfig.findUnique({
    where: { id: 'default' },
    select: { bankName: true, bankAccount: true, bankAccountHolder: true, bankQrUrl: true },
  });

  if (!config) {
    return NextResponse.json({ bankName: null, bankAccount: null, bankAccountHolder: null, bankQrUrl: null });
  }

  return NextResponse.json(config);
}
