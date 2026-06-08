import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { prisma } from '../db';
import { StaticAnalyzer } from '../services/analyzer';
import { runBugPredictor } from '../agents/bugPredictor';
import { runSecurityScanner } from '../agents/securityScanner';
import { runApiRiskAuditor } from '../agents/apiRiskAuditor';
import { runDeploymentChecker } from '../agents/deploymentChecker';
import fs from 'fs/promises';
import path from 'path';
import { analyzeRepo } from '../agents/repoAnalyzer';
import { generateCICD } from '../agents/cicdGenerator';
import { generateArchitectureDiagram } from '../agents/architectureDiagram';
import { generateDebugReport } from '../agents/autoDebugger';

const analyzer = new StaticAnalyzer();

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export async function runAnalysis(scanId: string, scanDir: string) {
  console.log(`[Worker] Starting analysis for scan ${scanId}`);
  await analyzer.init();

  try {
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'running' } });

    // Step 1: Analyze repo profile FIRST
    console.log(`[RepoAnalyzer] Profiling repository...`);
    const repoProfile = await analyzeRepo(scanDir);
    console.log(`[RepoAnalyzer] Stack detected: ${repoProfile.stack.language.join(', ')} | ${repoProfile.stack.framework.join(', ')}`);

    // Step 2: Generate CI/CD pipeline
    const cicdOutput = generateCICD(repoProfile);
    console.log(`[CICDGenerator] Generated ${cicdOutput.platform} pipeline`);

    // Step 3: Generate architecture diagram
    const diagram = generateArchitectureDiagram(repoProfile, scanDir);
    console.log(`[DiagramAgent] Generated architecture diagram`);

    const allFiles = await walkDir(scanDir);
    let totalLines = 0;
    let totalWeightedScore = 0;
    const WEIGHTS: Record<string, number> = { critical: 10, high: 5, medium: 2, low: 1, info: 0 };

    for (const file of allFiles) {
      const filePath = path.isAbsolute(file) ? file : path.join(scanDir, file);
      const relPath = path.isAbsolute(file) ? path.relative(scanDir, file) : file;

      let stats;
      try { stats = await fs.stat(filePath); } catch { continue; }
      if (stats.isDirectory()) continue;

      let content: string;
      try { content = await fs.readFile(filePath, 'utf-8'); } catch { continue; }
      totalLines += content.split('\n').length;

      const ext = path.extname(relPath).toLowerCase();
      const fileName = path.basename(relPath).toLowerCase();

      // Determine language
      let lang: 'javascript' | 'typescript' | 'python' | null = null;
      if (['.js', '.jsx', '.mjs'].includes(ext)) lang = 'javascript';
      if (['.ts', '.tsx'].includes(ext)) lang = 'typescript';
      if (ext === '.py') lang = 'python';

      const allFindings: any[] = [];

      // Agent 1: Bug Predictor (JS/TS only via AST)
      if (lang === 'javascript' || lang === 'typescript') {
        try {
          const tree = await analyzer.analyze(content, lang);
          if (tree) {
            const bugFindings = runBugPredictor(tree.rootNode, content, relPath);
            allFindings.push(...bugFindings);
          }
        } catch (e) { console.warn(`Bug predictor failed on ${relPath}:`, e); }
      }

      // Agent 2: Security Scanner (all languages)
      if (lang) {
        try {
          const tree = await analyzer.analyze(content, lang);
          if (tree) {
            const secFindings = runSecurityScanner(tree.rootNode, content, relPath, lang);
            allFindings.push(...secFindings);
          }
        } catch (e) { console.warn(`Security scanner failed on ${relPath}:`, e); }
      }

      // Agent 3: API Risk Auditor (text-based, all files)
      try {
        const apiFindings = runApiRiskAuditor(content, relPath);
        allFindings.push(...apiFindings);
      } catch (e) { console.warn(`API auditor failed on ${relPath}:`, e); }

      // Agent 4: Deployment Checker (config files)
      if (fileName.includes('dockerfile') || fileName.includes('docker-compose') ||
          ['.yml', '.yaml', '.env', '.tf'].includes(ext)) {
        try {
          const depFindings = runDeploymentChecker(content, relPath);
          allFindings.push(...depFindings);
        } catch (e) { console.warn(`Deployment checker failed on ${relPath}:`, e); }
      }

      // Save all findings to DB
      for (const rawFinding of allFindings) {
        totalWeightedScore += WEIGHTS[rawFinding.severity] || 0;
        
        // Sanitize object for Prisma
        const { ruleId, category, ...finding } = rawFinding;

        try {
          await prisma.finding.upsert({
            where: {
              findingKey: {
                scanId,
                filePath: relPath,
                lineStart: finding.lineStart,
                lineEnd: finding.lineEnd,
                title: finding.title,
              }
            },
            update: { ...finding, filePath: relPath, analyzer: category },
            create: { scanId, ...finding, filePath: relPath, analyzer: category },
          });
        } catch (e) { console.warn(`Failed to save finding:`, e); }
      }
    }

    const density = totalLines > 0 ? (totalWeightedScore / (totalLines / 1000)) : 0;
    const vibeScore = Math.max(0, Math.round(100 - (density * 2)));

    console.log(`[Worker] Scan ${scanId} complete. Lines: ${totalLines}, Score: ${totalWeightedScore}, Density: ${density.toFixed(2)}, VibeScore: ${vibeScore}`);

    // Step 4: After ALL findings collected, run auto-debugger
    const allCollectedFindings = await prisma.finding.findMany({ where: { scanId } });
    const debugReport = generateDebugReport(allCollectedFindings as any);
    console.log(`[AutoDebugger] Generated ${debugReport.totalPatches} patches`);

    // Step 5: Save all outputs to scan record
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'complete',
        vibeScore,
        repoProfile: JSON.stringify(repoProfile),
        cicdYaml: cicdOutput.content,
        cicdDockerfile: cicdOutput.dockerfile || null,
        architectureDiagram: diagram.mermaid,
        debugReport: JSON.stringify(debugReport),
      }
    });

  } catch (error) {
    console.error(`[Worker] Scan ${scanId} failed:`, error);
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'failed' } });
  }
}
