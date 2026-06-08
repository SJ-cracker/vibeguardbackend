import Groq from 'groq-sdk';

const MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

// Lazy client — instantiated only when the API key is present
function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured. Set it in apps/backend/.env');
  }
  return new Groq({ apiKey });
}

// 1. AI fix suggestion for a single finding
export async function generateFixSuggestion(finding: {
  title: string;
  description: string;
  codeSnippet: string;
  filePath: string;
  severity: string;
  cweId?: string;
}): Promise<string> {
  const groq = getClient();
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a senior security engineer. Given a code vulnerability, provide a concise actionable fix.
Return ONLY the fix explanation and corrected code snippet. Be specific and practical.`
      },
      {
        role: 'user',
        content: `Finding: ${finding.title}
Severity: ${finding.severity}
File: ${finding.filePath}
${finding.cweId ? `CWE: ${finding.cweId}` : ''}
Description: ${finding.description}
Vulnerable Code:
\`\`\`
${finding.codeSnippet}
\`\`\`
Provide a fix.`
      }
    ],
    max_tokens: 512,
  });
  return chat.choices[0]?.message?.content || 'No fix suggestion available.';
}

// 2. Natural language summary of full scan
export async function generateScanSummary(scan: {
  vibeScore: number;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: { title: string; severity: string; filePath: string }[];
}): Promise<string> {
  const groq = getClient();
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a security audit assistant. Summarize a code scan in 3-4 sentences.
Be direct, professional, highlight the most critical risks. No bullet points.`
      },
      {
        role: 'user',
        content: `VibeScore: ${scan.vibeScore}/100
Total Findings: ${scan.totalFindings} (Critical: ${scan.critical}, High: ${scan.high}, Medium: ${scan.medium}, Low: ${scan.low})
Top findings:
${scan.findings.slice(0, 10).map(f => `- [${f.severity.toUpperCase()}] ${f.title} in ${f.filePath}`).join('\n')}
Write a concise executive summary.`
      }
    ],
    max_tokens: 256,
  });
  return chat.choices[0]?.message?.content || 'Summary unavailable.';
}

// 3. Chat with codebase security context
export async function chatWithCodebase(
  question: string,
  context: {
    findings: { title: string; severity: string; filePath: string; description: string }[];
    vibeScore: number;
  }
): Promise<string> {
  const groq = getClient();
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are VibeGuard AI, a security assistant with access to a project's scan results.
Answer questions about the codebase security based on the findings. Be concise and helpful.`
      },
      {
        role: 'user',
        content: `Scan context:
VibeScore: ${context.vibeScore}/100
Findings:
${context.findings.slice(0, 20).map(f =>
  `- [${f.severity.toUpperCase()}] ${f.title} in ${f.filePath}: ${f.description}`
).join('\n')}

User question: ${question}`
      }
    ],
    max_tokens: 512,
  });
  return chat.choices[0]?.message?.content || 'Unable to answer.';
}
