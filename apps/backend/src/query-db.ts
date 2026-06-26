import { prisma } from './db';

async function run() {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { findings: true }
  });
  console.log(`Total scans found: ${scans.length}`);
  scans.forEach((scan, idx) => {
    console.log(`Scan ${idx + 1}:`);
    console.log('  SCAN ID:', scan.id);
    console.log('  VibeScore:', scan.vibeScore);
    console.log('  Status:', scan.status);
    console.log('  Findings Count:', scan.findings.length);
    const debug = scan.debugReport ? JSON.parse(scan.debugReport) : null;
    console.log('  Debug Patches Count:', debug?.patches?.length || 0);
    console.log('  Debug Patches:', debug?.patches?.map((p: any) => ({ ruleId: p.ruleId, applied: p.applied })));
    console.log('---');
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
