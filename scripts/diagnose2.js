const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const tmsId = '0b052607-5dbc-43ff-8739-39a960d644f2';
  const mapLocId = 'd2039af6-5454-4543-9dcf-e606f009569b';

  // Check AccountMapUsage
  const usages = await db.accountMapUsage.findMany({
    where: { account: { workerId: tmsId } },
    select: { accountId: true, mapLocationId: true, usedAt: true }
  });
  console.log('AccountMapUsage for tms:', JSON.stringify(usages, null, 2));

  // Check MapLocation cooldown
  const loc = await db.mapLocation.findUnique({
    where: { id: mapLocId },
    select: { id: true, name: true, cooldownUntil: true }
  });
  console.log('MapLocation:', JSON.stringify(loc, null, 2));

  // Check PricingTier details  
  const tiers = await db.pricingTier.findMany({
    where: { id: { in: ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'] } },
    select: { id: true, name: true, level: true, minAccountLevel: true, maxAccountLevel: true }
  });
  console.log('PricingTiers:', JSON.stringify(tiers, null, 2));

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
