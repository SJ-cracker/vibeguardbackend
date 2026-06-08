const AdmZip = require('adm-zip');
const zip = new AdmZip();
zip.addFile('vulnerable.js', Buffer.from([
  'const password = "secret123";',
  'eval(userInput);',
  'const hash = Math.random();',
  'console.log(password);',
].join('\n')));
zip.writeZip('./test-fresh.zip');
console.log('Created test-fresh.zip');
