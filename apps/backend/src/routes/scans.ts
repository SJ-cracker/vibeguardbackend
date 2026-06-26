import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { runAnalysis } from '../workers/analysisWorker';
import { prisma } from '../db';
import { handleFileUpload, handleZipUpload, handleGitClone } from '../utils/ingestion';
import { z } from 'zod';
import { generateFixSuggestion, generateScanSummary, chatWithCodebase } from '../services/groq';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { getScanDir } from '../utils/storage';
import { StaticAnalyzer } from '../services/analyzer';


export const scanRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/v1/scans', async (request, reply) => {
    let scanId = '';
    let scanDir = '';

    // Mock user for now
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'system@vibeguard.io',
          name: 'System User',
        }
      });
    }

    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        status: 'pending',
      }
    });
    scanId = scan.id;

    if (request.isMultipart()) {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const fileBuffer = await data.toBuffer();
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const existingScan = await prisma.scan.findFirst({
        where: { fileHash, status: 'complete' },
        include: { findings: true },
        orderBy: { createdAt: 'desc' },
      });

      if (existingScan) {
        await prisma.scan.delete({ where: { id: scanId } });
        return reply.status(200).send({ scan_id: existingScan.id, status: 'complete', cached: true });
      }

      await prisma.scan.update({ where: { id: scanId }, data: { fileHash } });

      if (data.filename.endsWith('.zip')) {
        scanDir = await handleZipUpload(scanId, fileBuffer);
      } else {
        scanDir = await handleFileUpload(scanId, data.filename, fileBuffer);
      }
    } else {
      const bodySchema = z.object({
        git_url: z.string().url().optional(),
        repo_import: z.string().optional()
      });

      const body = bodySchema.parse(request.body);
      if (body.git_url) {
        scanDir = await handleGitClone(scanId, body.git_url);
      } else {
        return reply.status(400).send({ error: 'Invalid request: provide git_url or upload a file' });
      }
    }

    runAnalysis(scanId, scanDir).catch(console.error);

    return reply.status(202).send({ scan_id: scanId, status: 'pending' });
  });

  // List recent scans
  fastify.get('/v1/scans', async (request, reply) => {
    const scans = await prisma.scan.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { _count: { select: { findings: true } } }
    });
    return scans;
  });

  // Get single scan with findings
  fastify.get('/v1/scans/:scanId', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { findings: true }
    });
    if (!scan) return reply.status(404).send({ error: 'Not found' });
    return scan;
  });

  // AI fix suggestion for a single finding
  fastify.post('/v1/scans/:scanId/findings/:findingId/fix', async (request, reply) => {
    const { findingId } = request.params as { scanId: string; findingId: string };
    const finding = await prisma.finding.findUnique({ where: { id: findingId } });
    if (!finding) return reply.status(404).send({ error: 'Finding not found' });
    const fix = await generateFixSuggestion(finding as any);
    return { fix };
  });

  // AI natural language summary of a scan
  fastify.get('/v1/scans/:scanId/summary', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { findings: true }
    });
    if (!scan) return reply.status(404).send({ error: 'Scan not found' });
    const summary = await generateScanSummary({
      vibeScore: scan.vibeScore || 0,
      totalFindings: scan.findings.length,
      critical: scan.findings.filter((f: any) => f.severity === 'critical').length,
      high: scan.findings.filter((f: any) => f.severity === 'high').length,
      medium: scan.findings.filter((f: any) => f.severity === 'medium').length,
      low: scan.findings.filter((f: any) => f.severity === 'low').length,
      findings: scan.findings,
    });
    return { summary };
  });

  // Chat with codebase security context
  fastify.post('/v1/scans/:scanId/chat', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const { question } = request.body as { question: string };
    if (!question) return reply.status(400).send({ error: 'question is required' });
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { findings: true }
    });
    if (!scan) return reply.status(404).send({ error: 'Scan not found' });
    const answer = await chatWithCodebase(question, {
      vibeScore: scan.vibeScore || 0,
      findings: scan.findings as any,
    });
    return { answer };
  });

  // GET /v1/scans/:scanId/debug — return auto-debug patches
  fastify.get('/v1/scans/:scanId/debug', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { findings: true }
    });
    if (!scan) return reply.status(404).send({ error: 'Not found' });
    return {
      report: scan.debugReport ? JSON.parse(scan.debugReport) : null,
      findings: scan.findings,
    };
  });

  // POST /v1/scans/:scanId/debug/apply — apply auto-debug patch to codebase
  fastify.post('/v1/scans/:scanId/debug/apply', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const { patchIndex } = request.body as { patchIndex: number };

    if (patchIndex === undefined) {
      return reply.status(400).send({ error: 'patchIndex is required' });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { findings: true }
    });

    if (!scan) return reply.status(404).send({ error: 'Scan not found' });
    if (!scan.debugReport) return reply.status(400).send({ error: 'No debug report found' });

    const debugReport = JSON.parse(scan.debugReport);
    const patch = debugReport.patches?.[patchIndex];

    if (!patch) return reply.status(404).send({ error: 'Patch not found' });
    if (patch.applied) return reply.status(400).send({ error: 'Patch already applied' });

    const scanDir = getScanDir(scanId);
    const filePath = path.join(scanDir, patch.filePath);

    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      return reply.status(400).send({ error: `Could not read file: ${patch.filePath}` });
    }

    const lines = fileContent.split('\n');
    let updatedContent = '';

    // Attempt to replace exact snippet if found
    if (fileContent.includes(patch.before)) {
      updatedContent = fileContent.replace(patch.before, patch.after);
    } else {
      // Fallback: replace using finding lineStart and lineEnd
      const finding = scan.findings.find(
        (f: any) => f.filePath === patch.filePath && f.lineStart === patch.lineStart
      );
      const lineEnd = finding ? finding.lineEnd : patch.lineStart;
      
      const startIdx = patch.lineStart - 1;
      const endIdx = lineEnd - 1;

      if (startIdx >= 0 && startIdx < lines.length && endIdx >= startIdx && endIdx < lines.length) {
        lines.splice(startIdx, (endIdx - startIdx) + 1, patch.after);
        updatedContent = lines.join('\n');
      } else {
        return reply.status(400).send({
          error: `Could not locate vulnerable code at line ${patch.lineStart} in ${patch.filePath}`
        });
      }
    }

    const originalContent = fileContent;

    try {
      // Write modified code
      await fs.writeFile(filePath, updatedContent, 'utf-8');

      // Syntax Validation
      const ext = path.extname(filePath).toLowerCase();
      let lang: 'javascript' | 'typescript' | 'python' | null = null;
      if (['.js', '.jsx', '.mjs'].includes(ext)) lang = 'javascript';
      if (['.ts', '.tsx'].includes(ext)) lang = 'typescript';
      if (ext === '.py') lang = 'python';

      if (lang) {
        const analyzer = new StaticAnalyzer();
        await analyzer.init();
        const tree = await analyzer.analyze(updatedContent, lang);
        if (tree.rootNode.hasError()) {
          throw new Error('Syntax validation failed: applied patch introduced syntax errors');
        }
      }

      // Success: Save applied state
      patch.applied = true;
      debugReport.patches[patchIndex] = patch;
      
      // Update totals
      debugReport.autoFixable = debugReport.patches.filter((p: any) => p.patchType === 'code_replace' && !p.applied).length;
      
      await prisma.scan.update({
        where: { id: scanId },
        data: { debugReport: JSON.stringify(debugReport) }
      });

      // Remove the resolved finding from DB
      const finding = scan.findings.find(
        (f: any) => f.filePath === patch.filePath && f.lineStart === patch.lineStart
      );
      if (finding) {
        await prisma.finding.delete({ where: { id: finding.id } });
      }

      return { success: true, message: 'Fix applied successfully and validated.' };
    } catch (err: any) {
      // Rollback to original content
      await fs.writeFile(filePath, originalContent, 'utf-8');
      return reply.status(500).send({
        error: `Failed to apply patch: ${err.message || err}`
      });
    }
  });

  // GET /v1/scans/:scanId/cicd — return generated CI/CD pipeline
  fastify.get('/v1/scans/:scanId/cicd', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return reply.status(404).send({ error: 'Not found' });
    return {
      yaml: scan.cicdYaml,
      dockerfile: scan.cicdDockerfile,
      profile: scan.repoProfile ? JSON.parse(scan.repoProfile) : null,
    };
  });

  // GET /v1/scans/:scanId/diagram — return architecture diagram
  fastify.get('/v1/scans/:scanId/diagram', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return reply.status(404).send({ error: 'Not found' });
    return {
      mermaid: scan.architectureDiagram,
      profile: scan.repoProfile ? JSON.parse(scan.repoProfile) : null,
    };
  });
}
