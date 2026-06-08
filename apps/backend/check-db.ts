import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const scans = await prisma.scan.findMany({ include: { findings: true }, orderBy: { createdAt: 'desc' }, take: 1 });
  console.log('Result:', JSON.stringify(scans, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
