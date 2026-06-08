import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // User seeding
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vibeguard.io' },
    update: {},
    create: {
      email: 'admin@vibeguard.io',
      name: 'Admin User',
      role: 'admin',
    },
  })
  
  console.log(`Created admin user with ID: ${adminUser.id}`)
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
