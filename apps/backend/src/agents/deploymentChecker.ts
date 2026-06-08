import { AgentFinding } from './bugPredictor';

export function runDeploymentChecker(code: string, filePath: string): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const lines = code.split('\n');
  const fileName = filePath.toLowerCase();

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const snippet = lines.slice(Math.max(0, i - 1), i + 2).join('\n');

    // DEP-001: console.log in production code
    if (/console\.(log|debug|info)\s*\(/.test(line) && !line.includes('//')) {
      findings.push({
        ruleId: 'DEP-001',
        title: 'console.log in Production Code',
        description: 'Debug logging left in production code leaks internal data and impacts performance.',
        severity: 'low',
        category: 'deployment',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Replace with a proper logger (winston, pino) that respects LOG_LEVEL environment variable.',
        effort: 'quick',
      });
    }

    // DEP-002: Hardcoded port numbers
    if (/\blisten\s*\(\s*[0-9]{4,5}/.test(line) && !line.includes('process.env')) {
      findings.push({
        ruleId: 'DEP-002',
        title: 'Hardcoded Port Number',
        description: 'Port hardcoded in source — should come from environment variable for deployment flexibility.',
        severity: 'low',
        category: 'deployment',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Use process.env.PORT || 3000 to allow runtime configuration.',
        effort: 'quick',
      });
    }

    // DEP-003: .env file referenced in code (may be committed)
    if (/require\s*\(\s*['"]\.env['"]\s*\)/.test(line)) {
      findings.push({
        ruleId: 'DEP-003',
        title: 'Potential .env File Exposure',
        description: '.env file being loaded directly — ensure it is in .gitignore.',
        severity: 'medium',
        category: 'deployment',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Verify .env is in .gitignore. Use dotenv package properly and never commit .env files.',
        effort: 'quick',
        cweId: 'CWE-312',
      });
    }

    // DEP-004: Docker - running as root
    if (fileName.includes('dockerfile') && /^USER\s+root/i.test(line)) {
      findings.push({
        ruleId: 'DEP-004',
        title: 'Docker Container Running as Root',
        description: 'Container running as root — container escape gives full host access.',
        severity: 'high',
        category: 'deployment',
        lineStart: lineNum,
        lineEnd: lineNum,
        codeSnippet: snippet,
        fixSuggestion: 'Add "USER node" or create a non-root user in your Dockerfile.',
        effort: 'quick',
        cweId: 'CWE-250',
      });
    }

    // DEP-005: Missing health check
    if (fileName.includes('dockerfile') && !code.includes('HEALTHCHECK')) {
      if (i === 0) { // Report once per file
        findings.push({
          ruleId: 'DEP-005',
          title: 'Missing Docker HEALTHCHECK',
          description: 'Dockerfile has no HEALTHCHECK instruction — orchestrators cannot detect unhealthy containers.',
          severity: 'medium',
          category: 'deployment',
          lineStart: 1,
          lineEnd: 1,
          codeSnippet: line,
          fixSuggestion: 'Add HEALTHCHECK CMD curl --fail http://localhost:3000/health || exit 1',
          effort: 'quick',
        });
      }
    }
  });

  return findings;
}
