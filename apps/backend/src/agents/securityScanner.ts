import { SyntaxNode } from 'web-tree-sitter';
import { AgentFinding } from './bugPredictor';

export function runSecurityScanner(tree: SyntaxNode, code: string, filePath: string, language: string): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const lines = code.split('\n');

  function getSnippet(startLine: number, endLine: number) {
    return lines.slice(Math.max(0, startLine - 1), endLine).join('\n');
  }

  function walk(node: SyntaxNode) {
    const text = node.text;

    // SEC-001: eval() usage
    if (node.type === 'call_expression') {
      const fn = node.childForFieldName('function')?.text;
      if (fn === 'eval') {
        findings.push({
          ruleId: 'SEC-001',
          title: 'Dangerous eval() Call',
          description: 'eval() executes arbitrary code and is a critical injection vector.',
          severity: 'critical',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Replace eval() with safer alternatives like JSON.parse() for data or Function constructor with strict validation.',
          effort: 'medium',
          cweId: 'CWE-94',
          owaspCategory: 'A03:2021 Injection',
        });
      }

      // SEC-002: SQL Injection
      const callText = node.text;
      if (/\b(query|execute|raw|sql)\s*\(/.test(callText) && /\+\s*(req\.|request\.|params\.|body\.|query\.)/.test(callText)) {
        findings.push({
          ruleId: 'SEC-002',
          title: 'Potential SQL Injection',
          description: 'User input concatenated directly into SQL query string.',
          severity: 'critical',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL strings.',
          effort: 'medium',
          cweId: 'CWE-89',
          owaspCategory: 'A03:2021 Injection',
        });
      }

      // SEC-004: Command Injection
      if (/\b(exec|execSync|spawn|spawnSync|system)\b/.test(fn || '') && node.text.includes('req.')) {
        findings.push({
          ruleId: 'SEC-004',
          title: 'Potential Command Injection',
          description: 'User-controlled input passed to shell execution function.',
          severity: 'critical',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Validate and sanitize all inputs. Use allowlists. Avoid shell=True patterns.',
          effort: 'complex',
          cweId: 'CWE-78',
          owaspCategory: 'A03:2021 Injection',
        });
      }

      // SEC-006: XSS via innerHTML
      if (node.text.includes('innerHTML') && !node.text.includes('DOMPurify')) {
        findings.push({
          ruleId: 'SEC-006',
          title: 'Insecure DOM Manipulation (XSS)',
          description: 'innerHTML assignment without sanitization enables Cross-Site Scripting.',
          severity: 'high',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Use textContent instead, or sanitize with DOMPurify before innerHTML assignment.',
          effort: 'quick',
          cweId: 'CWE-79',
          owaspCategory: 'A03:2021 Injection',
        });
      }
    }

    // SEC-003: Hardcoded secrets
    if (node.type === 'variable_declarator' || node.type === 'assignment_expression') {
      const nodeText = node.text.toLowerCase();
      const secretPatterns = ['password', 'passwd', 'secret', 'apikey', 'api_key', 'token', 'private_key', 'access_key'];
      const hasSecretName = secretPatterns.some(p => nodeText.includes(p));
      const hasStringValue = /"[^"]{6,}"|'[^']{6,}'/.test(node.text);
      const isEnvVar = node.text.includes('process.env');
      if (hasSecretName && hasStringValue && !isEnvVar) {
        findings.push({
          ruleId: 'SEC-003',
          title: 'Hardcoded Secret/Credential',
          description: 'Sensitive credential hardcoded in source code — visible to anyone with repo access.',
          severity: 'high',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Move to environment variables. Use process.env.SECRET_NAME and add to .env file (gitignored).',
          effort: 'quick',
          cweId: 'CWE-798',
          owaspCategory: 'A02:2021 Cryptographic Failures',
        });
      }
    }

    // SEC-007: CORS wildcard
    if (node.text.includes('cors') && node.text.includes('*')) {
      findings.push({
        ruleId: 'SEC-007',
        title: 'CORS Wildcard Configuration',
        description: 'CORS set to allow all origins (*) — exposes API to cross-origin attacks.',
        severity: 'medium',
        category: 'security',
        lineStart: node.startPosition.row + 1,
        lineEnd: node.endPosition.row + 1,
        codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
        fixSuggestion: 'Restrict CORS to specific trusted origins instead of wildcard.',
        effort: 'quick',
        cweId: 'CWE-942',
        owaspCategory: 'A05:2021 Security Misconfiguration',
      });
    }

    // Python-specific
    if (language === 'python') {
      if (node.text.includes('pickle.loads') || node.text.includes('pickle.load')) {
        findings.push({
          ruleId: 'PY-SEC-002',
          title: 'Python Insecure Deserialization',
          description: 'pickle.loads on untrusted data allows arbitrary code execution.',
          severity: 'critical',
          category: 'security',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Use JSON or another safe serialization format instead of pickle for untrusted data.',
          effort: 'medium',
          cweId: 'CWE-502',
          owaspCategory: 'A08:2021 Integrity Failures',
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  }

  walk(tree);
  return findings;
}
