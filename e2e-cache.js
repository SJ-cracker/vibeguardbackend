const FormData = require('form-data');
const fs = require('fs');

async function upload() {
  const form = new FormData();
  form.append('file', fs.createReadStream('C:/Users/devan/OneDrive/Desktop/Vibeguard/test.zip'));
  
  const uploadRes = await fetch('http://localhost:3001/v1/scans', {
    method: 'POST',
    body: form,
    headers: form.getHeaders ? form.getHeaders() : {}
  });
  const data = await uploadRes.json();
  console.log('Result:', data);
}

upload().catch(console.error);
