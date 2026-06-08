import fs from 'fs/promises';
import { StaticAnalyzer } from './src/services/analyzer';
import { runBugPredictor } from './src/agents/bugPredictor';
import { runSecurityScanner } from './src/agents/securityScanner';

async function test() {
  const content = `
const password = "hardcoded_secret_123";
const apiKey = "sk-abc123supersecretkey";

function runQuery(userInput) {
  const query = "SELECT * FROM users WHERE id = " + userInput;
  db.execute(query);
}

function renderPage(userInput) {
  document.getElementById("output").innerHTML = userInput;
}

function dangerousEval(code) {
  eval(code);
}

const exec = require('child_process').exec;
exec(userInput);

function infinite() {
  infinite();
}
`;
  const analyzer = new StaticAnalyzer();
  await analyzer.init();
  const tree = await analyzer.analyze(content, 'javascript');
  if (!tree) throw new Error("No tree");
  const bugs = runBugPredictor(tree.rootNode, content, 'test.js');
  const secs = runSecurityScanner(tree.rootNode, content, 'test.js', 'javascript');
  console.log("BUGS:", bugs.length);
  console.log("SECS:", secs.length);
  console.log(bugs);
  console.log(secs);
}

test().catch(console.error);
