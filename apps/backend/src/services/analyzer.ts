import Parser from 'web-tree-sitter';
import path from 'path';

export class StaticAnalyzer {
  private parser: Parser | null = null;
  private languages: Record<string, Parser.Language> = {};

  async init() {
    if (this.parser) return;
    await Parser.init();
    this.parser = new Parser();
  }

  private getRootNodeModules() {
    if (process.env.VERCEL) {
      return path.resolve(process.cwd(), 'node_modules');
    }
    const fs = require('fs');
    let current = __dirname;
    // Walk up directories looking for the monorepo root (turbo.json)
    while (current !== path.parse(current).root) {
      // turbo.json is the definitive monorepo root marker — stop here
      if (fs.existsSync(path.join(current, 'turbo.json'))) {
        const potential = path.join(current, 'node_modules');
        if (fs.existsSync(potential)) {
          return potential;
        }
      }
      current = path.dirname(current);
    }
    return path.resolve(process.cwd(), '../../node_modules');
  }

  async loadLanguage(language: 'javascript' | 'typescript' | 'python') {
    if (this.languages[language]) return this.languages[language];

    const rootNodeModules = this.getRootNodeModules();
    const grammarPath = path.join(
      rootNodeModules, 
      'tree-sitter-wasms', 
      'out', 
      `tree-sitter-${language}.wasm`
    );

    const lang = await Parser.Language.load(grammarPath);
    this.languages[language] = lang;
    return lang;
  }

  async analyze(fileContent: string, language: 'javascript' | 'typescript' | 'python'): Promise<Parser.Tree> {
    if (!this.parser) await this.init();

    const lang = await this.loadLanguage(language);
    this.parser!.setLanguage(lang);

    const tree = this.parser!.parse(fileContent);
    return tree;
  }

  findBugs(tree: Parser.Tree, filePath: string, fileContent: string, language: 'javascript' | 'typescript' | 'python' = 'javascript') {
    const findings: any[] = [];
    const lang = tree.getLanguage();
    const lines = fileContent.split('\n');
    const isPython = language === 'python';
    const isJS = language === 'javascript' || language === 'typescript';

    const rules = [
      {
        id: 'BUG-001',
        title: 'Empty catch block detected',
        severity: 'low',
        analyzer: 'bug',
        description: 'Silently swallowed errors can make debugging difficult.',
        query: `(catch_clause body: (statement_block "{" "}") @empty_catch)`,
        fixSuggestion: 'Log the error or re-throw it.',
        effort: 'quick',
        cweId: 'CWE-754',
        owaspCategory: 'Error Handling'
      },
      {
        id: 'SEC-001',
        title: 'Dangerous eval() call',
        severity: 'critical',
        analyzer: 'security',
        description: 'Use of eval() can lead to arbitrary code execution.',
        query: `(call_expression function: (identifier) @func_name (#eq? @func_name "eval")) @eval_call`,
        fixSuggestion: 'Use JSON.parse() or other safer alternatives.',
        effort: 'medium',
        cweId: 'CWE-94',
        owaspCategory: 'A03:2021-Injection'
      },
      {
        id: 'SEC-002',
        title: 'Potential SQL Injection',
        severity: 'critical',
        analyzer: 'security',
        description: 'Using template strings or string concatenation in database queries can lead to SQL injection.',
        query: `
          (call_expression
            function: (member_expression property: (property_identifier) @method (#match? @method "^(query|\\$queryRaw|execute)$"))
            arguments: (arguments [
              (template_string) @sql
              (binary_expression operator: "+") @sql
            ])
          ) @sql_injection
        `,
        fixSuggestion: 'Use parameterized queries or prepared statements.',
        effort: 'complex',
        cweId: 'CWE-89',
        owaspCategory: 'A03:2021-Injection'
      },
      {
        id: 'SEC-003',
        title: 'Hardcoded Secret/Credential',
        severity: 'high',
        analyzer: 'security',
        description: 'Hardcoding secrets in source code is a major security risk.',
        query: `
          (variable_declarator
            name: (identifier) @var_name 
            (#match? @var_name "(password|secret|api_key|apikey|token|auth_token|private_key|passwd|pwd|credential|PASSWORD|SECRET|API_KEY|APIKEY|TOKEN|PRIVATE_KEY)")
            value: (string) @val
          ) @hardcoded_secret
        `,
        fixSuggestion: 'Use environment variables or a secret management service.',
        effort: 'medium',
        cweId: 'CWE-798',
        owaspCategory: 'A07:2021-Identification and Authentication Failures'
      },
      {
        id: 'SEC-004',
        title: 'Insecure Randomness',
        severity: 'medium',
        analyzer: 'security',
        description: 'Math.random() is not cryptographically secure.',
        query: `
          (call_expression
            function: (member_expression object: (identifier) @obj (#eq? @obj "Math") property: (property_identifier) @prop (#eq? @prop "random"))
          ) @insecure_random
        `,
        fixSuggestion: 'Use crypto.getRandomValues() or the node:crypto module.',
        effort: 'quick',
        cweId: 'CWE-330',
        owaspCategory: 'A02:2021-Cryptographic Failures'
      },
      {
        id: 'SEC-005',
        title: 'Potential Command Injection',
        severity: 'critical',
        analyzer: 'security',
        description: 'Executing shell commands with unsanitized input can lead to system compromise.',
        query: `
          (call_expression
            function: (identifier) @func (#match? @func "^(exec|spawn|execSync)$")
          ) @cmd_injection
        `,
        fixSuggestion: 'Avoid shell execution if possible, or strictly sanitize inputs.',
        effort: 'complex',
        cweId: 'CWE-78',
        owaspCategory: 'A03:2021-Injection'
      },
      {
        id: 'SEC-006',
        title: 'Insecure DOM Manipulation (XSS)',
        severity: 'high',
        analyzer: 'security',
        description: 'Using innerHTML can lead to Cross-Site Scripting (XSS) vulnerabilities.',
        query: `
          (assignment_expression
            left: (member_expression property: (property_identifier) @prop (#eq? @prop "innerHTML"))
          ) @xss_vulnerability
        `,
        fixSuggestion: 'Use textContent or innerText instead.',
        effort: 'medium',
        cweId: 'CWE-79',
        owaspCategory: 'A03:2021-Injection'
      },
      {
        id: 'BUG-002',
        title: 'Use of console.log in Production',
        severity: 'info',
        analyzer: 'bug',
        description: 'Console logs should be removed or replaced with a proper logging framework in production.',
        query: `
          (call_expression
            function: (member_expression object: (identifier) @obj (#eq? @obj "console") property: (property_identifier) @prop (#eq? @prop "log"))
          ) @console_log
        `,
        fixSuggestion: 'Remove or use a logger like pino or winston.',
        effort: 'quick',
        cweId: 'N/A',
        owaspCategory: 'Best Practice'
      },
      {
        id: 'SEC-007',
        title: 'Insecure JWT Configuration',
        severity: 'high',
        analyzer: 'security',
        description: 'JWT signing without strong algorithms or hardcoded secrets.',
        query: `
          (call_expression
            function: (member_expression property: (property_identifier) @method (#eq? @method "sign"))
            arguments: (arguments (object) (string) @secret)
          ) @jwt_warning
        `,
        fixSuggestion: 'Ensure the secret is loaded from environment variables.',
        effort: 'medium',
        cweId: 'CWE-345',
        owaspCategory: 'A02:2021-Cryptographic Failures'
      },
      {
        id: 'BUG-003',
        title: 'Potential Infinite Loop',
        severity: 'medium',
        analyzer: 'bug',
        description: 'While loops with constant true condition can cause hangs if not exited properly.',
        query: `(while_statement condition: (parenthesized_expression (true)) @infinite_loop)`,
        fixSuggestion: 'Ensure there is a break or return statement inside the loop.',
        effort: 'medium',
        cweId: 'CWE-835',
        owaspCategory: 'Efficiency/Resource Management'
      },
      {
        id: 'PY-SEC-001',
        title: 'Python SQL Injection',
        severity: 'critical',
        analyzer: 'security',
        language: 'python',
        description: 'Using f-strings or string formatting in execute() calls can lead to SQL injection.',
        query: `
          (call
            function: (attribute attribute: (identifier) @method (#eq? @method "execute"))
            arguments: (argument_list 
              [
                (string (interpolation)) @sql_fstring
                (binary_operator left: (string) right: (_) @args (#eq? @args "%"))
              ]
            )
          ) @py_sql_injection
        `,
        fixSuggestion: 'Use parameterized queries provided by the DB driver.',
        effort: 'complex',
        cweId: 'CWE-89',
        owaspCategory: 'A03:2021-Injection'
      },
      {
        id: 'PY-SEC-002',
        title: 'Python Insecure Deserialization',
        severity: 'critical',
        analyzer: 'security',
        language: 'python',
        description: 'Using pickle.load() on untrusted data can lead to arbitrary code execution.',
        query: `
          (call
            function: (attribute object: (identifier) @obj (#eq? @obj "pickle") attribute: (identifier) @method (#eq? @method "load"))
          ) @pickle_vuln
        `,
        fixSuggestion: 'Use safer alternatives like json or hmac-verified pickles.',
        effort: 'medium',
        cweId: 'CWE-502',
        owaspCategory: 'A08:2021-Software and Data Integrity Failures'
      },
      {
        id: 'PY-SEC-003',
        title: 'Python Weak Hash (MD5)',
        severity: 'medium',
        analyzer: 'security',
        language: 'python',
        description: 'MD5 is cryptographically broken and should not be used for security purposes.',
        query: `
          (call
            function: (attribute object: (identifier) @obj (#eq? @obj "hashlib") attribute: (identifier) @method (#eq? @method "md5"))
          ) @weak_hash
        `,
        fixSuggestion: 'Use SHA-256 or better.',
        effort: 'quick',
        cweId: 'CWE-327',
        owaspCategory: 'A02:2021-Cryptographic Failures'
      },
      {
        id: 'SEC-008',
        title: 'Prototype Pollution Vulnerability',
        severity: 'high',
        analyzer: 'security',
        description: 'Directly accessing __proto__ can lead to Prototype Pollution.',
        query: `
          (member_expression
            property: (property_identifier) @prop (#eq? @prop "__proto__")
          ) @proto_pollution
        `,
        fixSuggestion: 'Use Object.getPrototypeOf() or MAP objects.',
        effort: 'medium',
        cweId: 'CWE-1321',
        owaspCategory: 'A08:2021-Software and Data Integrity Failures'
      },
      {
        id: 'SEC-009',
        title: 'Insecure Cookie Configuration',
        severity: 'low',
        analyzer: 'security',
        description: 'Cookies without httpOnly or secure flags can be stolen via XSS.',
        query: `
          (pair
            key: (property_identifier) @key (#match? @key "httpOnly|secure")
            value: (false) @val
          ) @insecure_cookie
        `,
        fixSuggestion: 'Set httpOnly and secure to true for all sensitive cookies.',
        effort: 'quick',
        cweId: 'CWE-614',
        owaspCategory: 'A01:2021-Broken Access Control'
      },
      {
        id: 'SEC-010',
        title: 'Insecure File Upload',
        severity: 'high',
        analyzer: 'security',
        description: 'File upload without explicit size limits can lead to Denial of Service.',
        query: `
          (call_expression
            function: (member_expression property: (property_identifier) @prop (#match? @prop "upload|uploadFile"))
          ) @upload_vuln
        `,
        fixSuggestion: 'Implement file size limits and scan uploads for malware.',
        effort: 'complex',
        cweId: 'CWE-434',
        owaspCategory: 'A08:2021-Software and Data Integrity Failures'
      },
      {
        id: 'BUG-004',
        title: 'Missing await on Async Call',
        severity: 'medium',
        analyzer: 'bug',
        description: 'Calling an async function without await may lead to race conditions.',
        query: `
          (expression_statement
            (call_expression
              function: (identifier) @func
            )
          ) @missing_await
        `,
        fixSuggestion: 'Add await before the function call.',
        effort: 'quick',
        cweId: 'N/A',
        owaspCategory: 'Best Practice'
      },
      {
        id: 'SEC-011',
        title: 'Dangerous XML Parsing (XXE)',
        severity: 'critical',
        analyzer: 'security',
        description: 'XML parsing without disabling external entities can lead to XXE attacks.',
        query: `
          (call_expression
            function: (member_expression object: (identifier) @obj (#eq? @obj "libxmljs") property: (property_identifier) @prop (#eq? @prop "parseXml"))
          ) @xxe_vuln
        `,
        fixSuggestion: 'Disable external entity loading in XML parser settings.',
        effort: 'medium',
        cweId: 'CWE-611',
        owaspCategory: 'A05:2021-Security Misconfiguration'
      }
    ];

    for (const rule of rules) {
      // Skip rules meant for a different language
      const ruleLang = (rule as any).language;
      if (ruleLang === 'python' && !isPython) continue;
      if (ruleLang === 'javascript' && !isJS) continue;

      try {
        const query = lang.query(rule.query);
        const matches = query.matches(tree.rootNode);
        
        for (const match of matches) {
          const capture = match.captures[0];
          const node = capture.node;
          const startRow = node.startPosition.row;
          const endRow = node.endPosition.row;
          
          const contextStart = Math.max(0, startRow - 5);
          const contextEnd = Math.min(lines.length - 1, endRow + 5);
          const codeSnippetWithContext = lines.slice(contextStart, contextEnd + 1).join('\n');

          findings.push({
            severity: rule.severity,
            analyzer: rule.analyzer,
            title: rule.title,
            description: rule.description,
            filePath,
            lineStart: startRow + 1,
            lineEnd: endRow + 1,
            codeSnippet: codeSnippetWithContext,
            fixSuggestion: rule.fixSuggestion,
            effort: rule.effort || 'medium',
            cweId: rule.cweId,
            owaspCategory: rule.owaspCategory
          });
        }
      } catch (e) {
        console.warn(`[Analyzer] Rule ${rule.id} failed:`, e);
      }
    }

    return findings;
  }
}
