const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: ['thanh@gmail.com', 'tms@gmail.com'] } },
    select: { id: true, email: true, name: true, role: true, workerStatus: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  for (const u of users) {
    const accs = await db.workerAccount.findMany({
      where: { workerId: u.id },
      select: { id: true, accountName: true, level: true, status: true, nextAvailableAt: true }
    });
    console.log('\nACCOUNTS for ' + u.email + ':', JSON.stringify(accs, null, 2));

    const campaigns = await db.campaign.findMany({
      where: { clientId: u.id },
      select: { id: true, status: true, totalReviews: true, mapLocationId: true },
      take: 10
    });
    console.log('\nCAMPAIGNS for ' + u.email + ':', JSON.stringify(campaigns, null, 2));

    if (campaigns.length > 0) {
      const jobs = await db.reviewItem.findMany({
        where: { campaignId: { in: campaigns.map(c => c.id) } },
        select: { id: true, status: true, assignedWorkerId: true, pricingTierId: true, targetRating: true },
        take: 20
      });
      console.log('\nREVIEW ITEMS for ' + u.email + ':', JSON.stringify(jobs, null, 2));
    }
  }

  // Also check all ReviewItems with pending status
  const pendingJobs = await db.reviewItem.findMany({
    where: { status: 'pending' },
    include: {
      campaign: { select: { status: true, mapLocationId: true } },
      pricingTier: { select: { minAccountLevel: true, maxAccountLevel: true, name: true } }
    },
    take: 20
  });
  console.log('\nALL PENDING JOBS (' + pendingJobs.length + '):', JSON.stringify(pendingJobs.map(j => ({
    id: j.id, status: j.status, campaignStatus: j.campaign?.status,
    tierMin: j.pricingTier?.minAccountLevel, tierMax: j.pricingTier?.maxAccountLevel,
    tierName: j.pricingTier?.name
  })), null, 2));

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
