const { StaticAnalyzer } = require('./apps/backend/dist/services/analyzer');
const fs = require('fs/promises');
const path = require('path');

async function verify() {
  const analyzer = new StaticAnalyzer();
  await analyzer.init();

  const repoDir = 'C:\\Users\\devan\\OneDrive\\Desktop\\Vibeguard\\apps\\backend\\stress-test-repo';
  
  console.log('--- STARTING RECALIBRATION VERIFICATION ---');
  
  const files = await fs.readdir(repoDir, { recursive: true });
  let totalLines = 0;
  let totalWeightedScore = 0;

  const WEIGHTS = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
    info: 0
  };

  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let processedCount = 0;
  for (const file of files) {
    const filePath = path.join(repoDir, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) continue;

    const ext = path.extname(file);
    let lang = null;
    if (ext === '.js') lang = 'javascript';
    if (ext === '.ts' || ext === '.tsx') lang = 'typescript';
    if (ext === '.py') lang = 'python';

    if (lang) {
      const content = await fs.readFile(filePath, 'utf-8');
      totalLines += content.split('\n').length;
      
      const tree = await analyzer.analyze(content, lang);
      const findings = analyzer.findBugs(tree, file, content);
      
      for (const f of findings) {
        totalWeightedScore += WEIGHTS[f.severity] || 0;
        counts[f.severity]++;
        if (f.severity === 'critical' && processedCount < 20) {
          console.log(`[Sample Critical] ${f.title} in ${f.filePath}`);
        }
      }
      processedCount++;
    }
  }

  const density = totalLines > 0 ? (totalWeightedScore / (totalLines / 1000)) : 0;
  const vibeScore = Math.max(0, Math.round(100 - (density * 5)));

  console.log(`Processed ${processedCount} files (${totalLines} lines).`);
  console.log(`Breakdown:`, counts);
  console.log(`Weighted Score: ${totalWeightedScore}`);
  console.log(`Density (findings per 1k lines): ${density.toFixed(2)}`);
  console.log(`Final VibeScore (factor 5): ${vibeScore}`);
  
  // Try factor 2
  const alternativeVibeScore = Math.max(0, Math.round(100 - (density * 2)));
  console.log(`Final VibeScore (factor 2): ${alternativeVibeScore}`);
  
  if (vibeScore > 0) {
    console.log('--- VERIFICATION SUCCESS: Score is above 0 ---');
  } else {
    console.log('--- VERIFICATION FAILED: Score is still 0 ---');
  }
}

verify().catch(console.error);
