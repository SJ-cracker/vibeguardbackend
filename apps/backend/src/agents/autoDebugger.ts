import { AgentFinding } from './bugPredictor';

export interface DebugPatch {
  findingId?: string;
  ruleId: string;
  title: string;
  filePath: string;
  lineStart: number;
  severity: string;
  patchType: 'code_replace' | 'config_add' | 'dependency_add' | 'env_var';
  before: string;
  after: string;
  explanation: string;
  command?: string;
}

export interface DebugReport {
  totalPatches: number;
  autoFixable: number;
  manualRequired: number;
  patches: DebugPatch[];
  priorityOrder: string[];
  summary: string;
}

export function generateDebugReport(findings: any[]): DebugReport {
  const patches: DebugPatch[] = [];

  // Sort findings by severity weight
  const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const sorted = [...findings].sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

  for (const finding of sorted) {
    const patch = generatePatch(finding);
    if (patch) patches.push(patch);
  }

  const autoFixable = patches.filter(p => p.patchType === 'code_replace').length;
  const manualRequired = patches.filter(p => p.patchType !== 'code_replace').length;

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  return {
    totalPatches: patches.length,
    autoFixable,
    manualRequired,
    patches,
    priorityOrder: sorted.map(f => f.ruleId),
    summary: `Found ${findings.length} issues requiring attention. ${criticalCount} critical and ${highCount} high severity issues need immediate action. ${autoFixable} issues have auto-generated code fixes. ${manualRequired} require manual review.`,
  };
}

function generatePatch(finding: any): DebugPatch | null {
  const base = {
    findingId: finding.id,
    ruleId: finding.ruleId,
    title: finding.title,
    filePath: finding.filePath,
    lineStart: finding.lineStart,
    severity: finding.severity,
  };

  switch (finding.ruleId) {
    case 'SEC-001': // eval()
      return {
        ...base,
        patchType: 'code_replace',
        before: `eval(${finding.codeSnippet?.match(/eval\(([^)]+)\)/)?.[1] || 'userInput'})`,
        after: `// Safe alternative — parse JSON data:
JSON.parse(userInput)
// Or for math expressions, use a safe evaluator:
// import { evaluate } from 'mathjs';
// evaluate(userInput)`,
        explanation: 'Replace eval() with JSON.parse() for data parsing, or use a sandboxed math library for expressions. eval() executes arbitrary JavaScript and is a critical security hole.',
      };

    case 'SEC-002': // SQL Injection
      return {
        ...base,
        patchType: 'code_replace',
        before: `const query = "SELECT * FROM users WHERE id = " + userId;
db.execute(query);`,
        after: `// Use parameterized queries — NEVER concatenate user input
const query = "SELECT * FROM users WHERE id = ?";
db.execute(query, [userId]);

// With an ORM (Prisma example):
// const user = await prisma.user.findUnique({ where: { id: userId } });`,
        explanation: 'Always use parameterized queries or an ORM. Never concatenate user input into SQL strings — this allows attackers to manipulate the query structure.',
      };

    case 'SEC-003': // Hardcoded secrets
      return {
        ...base,
        patchType: 'env_var',
        before: `const apiKey = "sk-hardcoded-secret-key-abc123";
const password = "hardcoded_password_123";`,
        after: `// Move ALL secrets to environment variables
const apiKey = process.env.API_KEY;
const password = process.env.DB_PASSWORD;

// Validate they exist at startup:
if (!process.env.API_KEY) throw new Error('API_KEY environment variable is required');`,
        explanation: 'Move secret to .env file (add to .gitignore), then access via process.env. Add validation at startup so missing secrets fail fast rather than silently.',
        command: 'echo "API_KEY=your_key_here" >> .env && echo ".env" >> .gitignore',
      };

    case 'SEC-004': // Command injection
      return {
        ...base,
        patchType: 'code_replace',
        before: `exec(\`ping -c 1 \${hostname}\`);
exec(userInput);`,
        after: `// Never pass user input to shell commands
// Use allowlist validation:
const ALLOWED_HOSTS = ['localhost', 'internal.service.com'];
if (!ALLOWED_HOSTS.includes(hostname)) {
  throw new Error('Host not allowed');
}
// Use array form (no shell interpolation):
const { execFile } = require('child_process');
execFile('ping', ['-c', '1', hostname], (err, stdout) => {
  console.log(stdout);
});`,
        explanation: 'Use execFile() instead of exec() to avoid shell injection. Validate inputs against an allowlist before use. Never pass unsanitized user input to shell commands.',
      };

    case 'SEC-006': // XSS innerHTML
      return {
        ...base,
        patchType: 'code_replace',
        before: `element.innerHTML = userContent;
document.getElementById("output").innerHTML = input;`,
        after: `// Option 1: Use textContent (safe, no HTML rendering)
element.textContent = userContent;

// Option 2: Sanitize with DOMPurify before innerHTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userContent);`,
        explanation: 'innerHTML with unsanitized input allows XSS attacks. Use textContent for plain text, or DOMPurify.sanitize() if HTML rendering is required.',
        command: 'npm install dompurify && npm install --save-dev @types/dompurify',
      };

    case 'BUG-001': // Unhandled async
      return {
        ...base,
        patchType: 'code_replace',
        before: `const data = await fetchData();
const result = await processData(data);`,
        after: `// Wrap all awaits in try/catch
try {
  const data = await fetchData();
  const result = await processData(data);
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  // Handle gracefully — don't crash the process
  throw new AppError('Data processing failed', { cause: error });
}`,
        explanation: 'Unhandled promise rejections crash Node.js processes. Always wrap async operations in try/catch and handle errors explicitly.',
      };

    case 'API-001': // Missing API error handling
      return {
        ...base,
        patchType: 'code_replace',
        before: `const response = await fetch(url);
const data = await response.json();`,
        after: `// Always handle API errors explicitly
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) }); // 10s timeout
  
  if (!response.ok) {
    throw new Error(\`API error \${response.status}: \${response.statusText}\`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  if (error.name === 'TimeoutError') {
    throw new Error('API request timed out');
  }
  throw error;
}`,
        explanation: 'Check response.ok for HTTP errors, add a timeout to prevent hanging requests, and handle network failures with try/catch.',
      };

    case 'API-002': // Rate limiting in loops
      return {
        ...base,
        patchType: 'code_replace',
        before: `for (const userId of userIds) {
  const response = await fetch(\`/api/users/\${userId}\`);
}`,
        after: `// Use batching + delay to respect rate limits
const BATCH_SIZE = 10;
const DELAY_MS = 1000; // 1 second between batches

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
  const batch = userIds.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(id => fetch(\`/api/users/\${id}\`)));
  
  if (i + BATCH_SIZE < userIds.length) {
    await sleep(DELAY_MS); // Rate limit: pause between batches
  }
}`,
        explanation: 'Process API calls in batches with delays between each batch to avoid hitting rate limits. Use Promise.all() within each batch for parallelism.',
      };

    case 'API-004': // Missing webhook verification
      return {
        ...base,
        patchType: 'code_replace',
        before: `async function handleStripeWebhook(req, res) {
  const event = req.body;
  // No verification
  processEvent(event);
}`,
        after: `import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.rawBody; // Ensure raw body is available
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }
  
  // Now safe to process
  processEvent(event);
  res.json({ received: true });
}`,
        explanation: 'Always verify webhook signatures using the provider SDK. Without verification, anyone can send fake webhook events to trigger payments, cancellations, or other critical actions.',
      };

    case 'API-005': // Hardcoded bearer token
      return {
        ...base,
        patchType: 'env_var',
        before: `headers: { 'Authorization': 'Bearer hardcoded_token_abc123' }`,
        after: `// Load token from environment variable
const token = process.env.API_TOKEN;
if (!token) throw new Error('API_TOKEN is required');

headers: { 'Authorization': \`Bearer \${token}\` }`,
        explanation: 'Never hardcode tokens. Store in environment variables and validate at startup. Rotate the exposed token immediately as it may already be compromised.',
        command: 'echo "API_TOKEN=your_token_here" >> .env',
      };

    case 'DEP-001': // console.log
      return {
        ...base,
        patchType: 'dependency_add',
        before: `console.log('Processing user:', userId);
console.error('Something went wrong:', err);`,
        after: `// Use structured logging with pino or winston
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

logger.info({ userId }, 'Processing user');
logger.error({ err }, 'Something went wrong');`,
        explanation: 'Replace console.log with a structured logger (pino/winston) that respects LOG_LEVEL environment variable. This prevents debug output in production and enables log aggregation.',
        command: 'npm install pino && npm install --save-dev pino-pretty',
      };

    case 'PY-SEC-002': // pickle
      return {
        ...base,
        patchType: 'code_replace',
        before: `import pickle
data = pickle.loads(user_data)`,
        after: `import json

# Use JSON for safe serialization of untrusted data
data = json.loads(user_data)

# If you need to serialize complex Python objects, use a safe alternative:
# import msgpack
# data = msgpack.unpackb(user_data, raw=False)`,
        explanation: 'pickle.loads() on untrusted data allows arbitrary code execution — an attacker can craft a pickle payload that runs any Python code on your server. Use JSON or msgpack instead.',
      };

    default:
      return null;
  }
}
