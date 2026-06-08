import { SyntaxNode } from 'web-tree-sitter';

export interface AgentFinding {
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  fixSuggestion: string;
  effort: 'quick' | 'medium' | 'complex';
  cweId?: string;
  owaspCategory?: string;
}

export function runBugPredictor(tree: SyntaxNode, code: string, filePath: string): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const lines = code.split('\n');

  function getSnippet(startLine: number, endLine: number) {
    return lines.slice(Math.max(0, startLine - 1), endLine).join('\n');
  }

  function walk(node: SyntaxNode) {
    // BUG-001: Missing error handling on async calls
    if (node.type === 'await_expression') {
      let parent = node.parent;
      let hasTryCatch = false;
      while (parent) {
        if (parent.type === 'try_statement') { hasTryCatch = true; break; }
        parent = parent.parent;
      }
      if (!hasTryCatch) {
        findings.push({
          ruleId: 'BUG-001',
          title: 'Unhandled Promise Rejection',
          description: 'Async call without try/catch — unhandled rejection will crash the process in Node.js.',
          severity: 'medium',
          category: 'bug',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Wrap this await in a try/catch block or add .catch() handler.',
          effort: 'quick',
        });
      }
    }

    // BUG-002: Infinite recursion risk — function calls itself without base case guard
    if (node.type === 'function_declaration' || node.type === 'function') {
      const funcName = node.childForFieldName('name')?.text;
      if (funcName) {
        const body = node.childForFieldName('body')?.text || '';
        const hasBaseCase = body.includes('if') || body.includes('return') && !body.includes(funcName);
        const callsSelf = body.includes(funcName + '(');
        if (callsSelf && !hasBaseCase) {
          findings.push({
            ruleId: 'BUG-002',
            title: 'Infinite Recursion Risk',
            description: `Function "${funcName}" calls itself without a visible base case guard.`,
            severity: 'high',
            category: 'bug',
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
            fixSuggestion: 'Add a base case condition that returns before the recursive call.',
            effort: 'medium',
          });
        }
      }
    }

    // BUG-003: Null dereference — property access on potentially null value
    if (node.type === 'member_expression') {
      const obj = node.childForFieldName('object');
      if (obj && (obj.text === 'null' || obj.text === 'undefined')) {
        findings.push({
          ruleId: 'BUG-003',
          title: 'Null Dereference',
          description: 'Accessing property on a value that may be null or undefined.',
          severity: 'high',
          category: 'bug',
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
          codeSnippet: getSnippet(node.startPosition.row + 1, node.endPosition.row + 1),
          fixSuggestion: 'Use optional chaining (?.) or add null check before accessing property.',
          effort: 'quick',
          cweId: 'CWE-476',
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
