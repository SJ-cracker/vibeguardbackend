import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { runAnalysis } from '../workers/analysisWorker';
import { prisma } from '../db';
import { handleFileUpload, handleZipUpload, handleGitClone } from '../utils/ingestion';
import { z } from 'zod';
import { generateFixSuggestion, generateScanSummary, chatWithCodebase } from '../services/groq';
import crypto from 'crypto';

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
