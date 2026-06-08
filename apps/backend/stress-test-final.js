const { PrismaClient } = require('@prisma/client');
const { StaticAnalyzer } = require('./dist/services/analyzer');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function runStressTest() {
  console.log('--- STARTING STRESS TEST ---');
  
  try {
    let user = await prisma.user.findUnique({ where: { email: 'test@vibeguard.ai' } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'test@vibeguard.ai', name: 'Stress Test User' }
      });
    }

    const scan = await prisma.scan.create({
      data: { userId: user.id, status: 'running' }
    });
    console.log('Created scan record:', scan.id);

    const scanDir = path.resolve(__dirname, 'stress-test-repo');
    const analyzer = new StaticAnalyzer();
    await analyzer.init();

    const allFiles = await getFiles(scanDir);
    console.log(`Discovered ${allFiles.length} files total.`);

    let totalLines = 0;
    let totalWeightedScore = 0;
    let findingsCount = 0;

    const WEIGHTS = { critical: 10, high: 5, medium: 2, low: 1, info: 0 };

    for (const filePath of allFiles) {
      if (filePath.includes('node_modules') || filePath.includes('.git')) continue;
      
      const ext = path.extname(filePath);
      let lang = null;
      if (ext === '.js') lang = 'javascript';
      else if (ext === '.ts' || ext === '.tsx') lang = 'typescript';
      else if (ext === '.py') lang = 'python';

      if (lang) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          totalLines += content.split('\n').length;
          
          const tree = await analyzer.analyze(content, lang);
          const relativePath = path.relative(scanDir, filePath);
          const findings = analyzer.findBugs(tree, relativePath, content);

          for (const finding of findings) {
            totalWeightedScore += WEIGHTS[finding.severity] || 0;
            await prisma.finding.upsert({
              where: {
                findingKey: {
                  scanId: scan.id,
                  filePath: relativePath,
                  lineStart: finding.lineStart,
                  lineEnd: finding.lineEnd,
                  title: finding.title
                }
              },
              update: { ...finding, filePath: relativePath },
              create: { scanId: scan.id, ...finding, filePath: relativePath }
            });
            findingsCount++;
          }
        } catch (err) {
          // Skip
        }
      }
    }

    const density = totalLines > 0 ? (totalWeightedScore / (totalLines / 1000)) : 0;
    const vibeScore = Math.max(0, Math.round(100 - (density * 2)));

    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: 'complete', vibeScore }
    });

    console.log(`--- STRESS TEST COMPLETE ---`);
    console.log(`Total lines: ${totalLines}`);
    console.log(`Total findings: ${findingsCount}`);
    console.log(`Final VibeScore: ${vibeScore}`);
    console.log(`Scan ID: ${scan.id}`);

  } catch (err) {
    console.error('CRITICAL ERROR:', err);
  }
}

runStressTest().catch(console.error).finally(() => prisma.$disconnect());
