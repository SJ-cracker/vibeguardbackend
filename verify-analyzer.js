const { StaticAnalyzer } = require('./dist/services/analyzer');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const analyzer = new StaticAnalyzer();
    await analyzer.init();
    
    const testFile = path.resolve(__dirname, 'test-snippet.js');
    const content = fs.readFileSync(testFile, 'utf-8');
    
    console.log('--- Analyzing test-snippet.js ---');
    const tree = await analyzer.analyze(content, 'javascript');
    const findings = analyzer.findBugs(tree, 'test-snippet.js');
    
    console.log('Findings found:', findings.length);
    findings.forEach(f => {
      console.log(`[${f.severity}] ${f.title} (${f.lineStart}-${f.lineEnd})`);
      console.log(`  Description: ${f.description}`);
      console.log(`  Snippet: ${f.codeSnippet.replace(/\n/g, ' ')}`);
    });
    
    if (findings.length >= 2) {
      console.log('\n--- VERIFICATION SUCCESS ---');
    } else {
      console.log('\n--- VERIFICATION FAILURE (Expected at least 2 findings) ---');
    }
  } catch (e) {
    console.error('Error during verification:', e);
  }
})();
