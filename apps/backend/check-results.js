const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFindings() {
  const findings = await prisma.finding.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('--- SAMPLE FINDINGS ---');
  findings.forEach(f => {
    console.log(`[${f.severity}] ${f.title} in ${f.filePath}:${f.lineStart}`);
    console.log(`  Snippet: ${f.codeSnippet.replace(/\n/g, ' ').substring(0, 100)}...`);
    console.log('---');
  });

  const count = await prisma.finding.count();
  console.log(`Total findings in DB: ${count}`);
}

checkFindings().catch(console.error).finally(() => prisma.$disconnect());
