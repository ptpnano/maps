import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Setup Pricing Tiers
  const basicTier = await prisma.pricingTier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      level: 'basic',
      name: 'Khởi Nghiệp',
      pricePerReview: 30000,
      workerPayout: 20000,
      platformFee: 10000,
      warrantyDays: 30,
      minReviews: 1,
      maxReviews: 100
    },
  })

  const silverTier = await prisma.pricingTier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      level: 'silver',
      name: 'Phá Đảo',
      pricePerReview: 50000,
      workerPayout: 35000,
      platformFee: 15000,
      warrantyDays: 30,
      minReviews: 10,
      maxReviews: 500
    },
  })

  const vipTier = await prisma.pricingTier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      level: 'vip',
      name: 'Thống Trị',
      pricePerReview: 80000,
      workerPayout: 55000,
      platformFee: 25000,
      warrantyDays: 30,
      minReviews: 50,
      maxReviews: 1000
    },
  })

  console.log('Pricing Tiers seeded.')

  // Create an Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mapboost.vn' },
    update: {},
    create: {
      email: 'admin@mapboost.vn',
      name: 'Super Admin',
      passwordHash: adminPassword,
      role: 'admin',
      wallet: {
        create: {}
      }
    },
  })

  console.log('Admin user seeded.')

  // Create a Demo Client
  const clientPassword = await bcrypt.hash('client123', 10)
  const client = await prisma.user.upsert({
    where: { email: 'client@mapboost.vn' },
    update: {},
    create: {
      email: 'client@mapboost.vn',
      name: 'Demo Client',
      passwordHash: clientPassword,
      role: 'client',
      wallet: {
        create: {
          availableBalance: 5000000 // give 5M to test
        }
      }
    },
  })
  
  console.log('Demo Client seeded.')

  // Create an Approved Worker with an Account
  const workerPassword = await bcrypt.hash('worker123', 10)
  const worker = await prisma.user.upsert({
    where: { email: 'worker@mapboost.vn' },
    update: {},
    create: {
      email: 'worker@mapboost.vn',
      name: 'Demo Worker',
      passwordHash: workerPassword,
      role: 'worker',
      workerStatus: 'approved',
      wallet: {
        create: {}
      },
      workerAccounts: {
        create: [
          {
            accountName: 'Local Guide 1',
            level: 6,
            accountEmail: 'guide1@gmail.com'
          }
        ]
      }
    },
  })

  console.log('Demo Worker seeded.')

  // Create default SystemConfig
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      holdingDays: 7,
      jobTimeoutMinutes: 30,
    },
  })

  console.log('SystemConfig seeded.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
