import { AgentFinding } from './bugPredictor';

export function runApiRiskAuditor(code: string, filePath: string): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const lines = code.split('\n');

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const snippet = lines.slice(Math.max(0, i - 1), i + 2).join('\n');

    // API-001: Missing error handling on fetch/axios
    if (/\bfetch\s*\(|axios\.(get|post|put|delete|patch)\s*\(/.test(line)) {
      const surroundingCode = lines.slice(Math.max(0, i - 2), i + 5).join('\n');
      if (!surroundingCode.includes('catch') && !surroundingCode.includes('.catch(')) {
        findings.push({
          ruleId: 'API-001',
          title: 'Missing API Error Handling',
          description: 'API call without error handling — network failures and 4xx/5xx responses will be silently ignored.',
          severity: 'medium',
          category: 'api',
          lineStart: lineNum,
          lineEnd: lineNum,
          codeSnippet: snippet,
          fixSuggestion: 'Add try/catch or .catch() to handle network errors. Check response.ok for HTTP errors.',
          effort: 'quick',
        });
      }
    }

    // API-002: Missing rate limit handling
    if (/\bsetInterval\s*\(.*fetch|axios/.test(line) || (/fetch|axios/.test(line) && /for\s*\(|while\s*\(/.test(lines.slice(Math.max(0, i-3), i).join('\n')))) {
      findings.push({
        ruleId: 'API-002',
        title: 'Missing Rate Limit Handling',
        description: 'API calls in a loop without rate limiting or backoff — will trigger rate limit errors.',
        severity: 'medium',
        category: 'api',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Add exponential backoff, respect Retry-After headers, and implement request queuing.',
        effort: 'medium',
      });
    }

    // API-003: Hardcoded API URLs (should use env vars)
    if (/https?:\/\/api\.[a-z]+\.(com|io|dev)/.test(line) && !line.includes('process.env')) {
      findings.push({
        ruleId: 'API-003',
        title: 'Hardcoded API Endpoint URL',
        description: 'API base URL hardcoded in source — makes environment switching (dev/staging/prod) error-prone.',
        severity: 'low',
        category: 'api',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Move API base URL to environment variable: process.env.API_BASE_URL',
        effort: 'quick',
      });
    }

    // API-004: Missing webhook signature verification
    if (/webhook|stripe.*webhook|twilio.*webhook/i.test(line) && !/signature|verify|validateSignature/i.test(lines.slice(Math.max(0, i-5), i+5).join('\n'))) {
      findings.push({
        ruleId: 'API-004',
        title: 'Missing Webhook Signature Verification',
        description: 'Webhook endpoint without signature verification — anyone can send fake webhook events.',
        severity: 'high',
        category: 'api',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Verify webhook signatures using the provider\'s SDK (e.g., stripe.webhooks.constructEvent()).',
        effort: 'medium',
        cweId: 'CWE-345',
        owaspCategory: 'A02:2021 Cryptographic Failures',
      });
    }

    // API-005: API key in Authorization header hardcoded
    if (/Authorization.*Bearer\s+['"'][a-zA-Z0-9_\-]{20,}/.test(line)) {
      findings.push({
        ruleId: 'API-005',
        title: 'Hardcoded Bearer Token',
        description: 'API bearer token hardcoded in source code.',
        severity: 'high',
        category: 'api',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Load token from environment variable: process.env.API_TOKEN',
        effort: 'quick',
        cweId: 'CWE-798',
        owaspCategory: 'A02:2021 Cryptographic Failures',
      });
    }
  });

  return findings;
}
