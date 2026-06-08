const FormData = require('form-data');
const fs = require('fs');
async function run() {
  const form = new FormData();
  form.append('file', fs.createReadStream('C:/Users/devan/OneDrive/Desktop/Vibeguard/test.zip'));
  
  const uploadRes = await fetch('http://localhost:3001/v1/scans', {
    method: 'POST',
    body: form,
    headers: form.getHeaders ? form.getHeaders() : {} // Node 18 fetch compat
  });
  const uploadData = await uploadRes.json();
  console.log('Upload:', uploadData);
  
  const id = uploadData.scan_id;
  if (!id) return;
  
  await new Promise(r => setTimeout(r, 6000)); // wait for worker
  
  const req = await fetch('http://localhost:3001/v1/scans/' + id);
  const data = await req.json();
  console.log('Status:', data.status, '| Score:', data.vibeScore, '| Findings:', data.findings?.length);
}
run().catch(console.error);
