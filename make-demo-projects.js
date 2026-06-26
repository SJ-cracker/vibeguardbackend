const AdmZip = require('adm-zip');
const fs = require('fs');

function createNebulaCommerce() {
  const zip = new AdmZip();
  
  // Metadata
  zip.addFile('vibeguard-demo.json', Buffer.from(JSON.stringify({ projectName: 'NebulaCommerce' }, null, 2)));

  // Stripe secret key vulnerability
  zip.addFile('services/payment-service/src/stripe.ts', Buffer.from([
    'const STRIPE_SECRET = "sk_live_fake_secret";',
    'export function processStripePayment(amount: number) {',
    '  console.log("Stripe secret is " + STRIPE_SECRET);',
    '  return { success: true };',
    '}',
  ].join('\n')));

  // Missing retry / rate limiting
  zip.addFile('services/order-service/src/processOrders.ts', Buffer.from([
    "import axios from 'axios';",
    'export async function processOrders(orders: any[]) {',
    "  const paymentEndpoint = 'http://payment-service/pay';",
    '  for (const order of orders) {',
    '    const payload = { amount: order.total };',
    '    await axios.post(paymentEndpoint, payload);',
    '  }',
    '}',
  ].join('\n')));

  // React Render loop
  zip.addFile('frontend/src/components/Dashboard.tsx', Buffer.from([
    "import { useEffect, useState } from 'react';",
    'export function Dashboard() {',
    '  const [orders, setOrders] = useState([]);',
    '  useEffect(() => {',
    "    fetch('/api/orders').then(res => res.json()).then(data => setOrders(data));",
    '    setOrders([]);',
    '  });',
    '  return <div>Dashboard</div>;',
    '}',
  ].join('\n')));

  // SQL Injection
  zip.addFile('services/auth-service/src/searchUsers.ts', Buffer.from([
    "import { db } from './db';",
    'export async function searchUsers(email: string) {',
    "  const query = `SELECT * FROM users WHERE email='${email}'`;",
    '  return db.execute(query);',
    '}',
  ].join('\n')));

  // JWT Validation
  zip.addFile('services/auth-service/src/jwt.ts', Buffer.from([
    "import jwt from 'jsonwebtoken';",
    'export function verifyToken(token: string) {',
    '  return jwt.verify(token, "secret");',
    '}',
  ].join('\n')));

  // Docker USER root
  zip.addFile('docker/api.Dockerfile', Buffer.from([
    'FROM node:18',
    'WORKDIR /app',
    'COPY . .',
    'USER root',
    'EXPOSE 5432',
    'CMD ["node", "src/index.js"]',
  ].join('\n')));

  // Exposed config secrets
  zip.addFile('.env.example', Buffer.from([
    'DB_URL=postgresql://postgres:password123@localhost:5432/nebula',
    'API_SECRET=sk_live_hidden_secret_abc123',
    'REDIS_URL=redis://localhost:6379',
  ].join('\n')));

  // Add dummy files to simulate large enterprise layout
  zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'nebula-monorepo', private: true, version: '1.0.0' }, null, 2)));
  zip.addFile('services/inventory-service/src/index.ts', Buffer.from('console.log("Inventory service online");'));
  zip.addFile('services/analytics-service/src/index.ts', Buffer.from('console.log("Analytics service online");'));
  zip.addFile('services/notification-service/src/index.ts', Buffer.from('console.log("Notification service online");'));
  zip.addFile('shared/utils.ts', Buffer.from('export const sleep = (ms) => new Promise(r => setTimeout(r, ms));'));

  zip.writeZip('./NebulaCommerce.zip');
  console.log('Created NebulaCommerce.zip');
}

function createOrionCloud() {
  const zip = new AdmZip();
  
  // Metadata
  zip.addFile('vibeguard-demo.json', Buffer.from(JSON.stringify({ projectName: 'OrionCloud' }, null, 2)));

  // Terraform security group wildcard Ingress
  zip.addFile('infra/terraform/main.tf', Buffer.from([
    'resource "aws_security_group" "open" {',
    '  name = "open-sg"',
    '  ingress {',
    '    from_port   = 0',
    '    to_port     = 0',
    '    protocol    = "-1"',
    '    cidr_blocks = ["0.0.0.0/0"]',
    '  }',
    '}',
  ].join('\n')));

  // Kubernetes secret exposure and privileged pod container
  zip.addFile('infra/kubernetes/deployment.yaml', Buffer.from([
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: orion-api',
    'spec:',
    '  template:',
    '    spec:',
    '      containers:',
    '      - name: api',
    '        image: orion-api:latest',
    '        securityContext:',
    '          privileged: true',
    '        env:',
    '        - name: AWS_SECRET',
    '          value: "fake-secret"',
  ].join('\n')));

  // Insecure github action deployment echo secret
  zip.addFile('.github/workflows/deploy.yml', Buffer.from([
    'name: Deploy',
    'on: [push]',
    'jobs:',
    '  deploy:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '    - name: Deploy',
    '      run: |',
    '        echo $PRODUCTION_SECRET',
  ].join('\n')));

  // Dummy helm variables
  zip.addFile('infra/helm/values.yaml', Buffer.from([
    'replicaCount: 1',
    'image:',
    '  repository: nginx',
    '  tag: stable',
  ].join('\n')));
  zip.addFile('infra/helm/Chart.yaml', Buffer.from([
    'apiVersion: v2',
    'name: orion-chart',
    'version: 1.0.0',
  ].join('\n')));

  zip.writeZip('./OrionCloud.zip');
  console.log('Created OrionCloud.zip');
}

function createPulseAI() {
  const zip = new AdmZip();
  
  // Metadata
  zip.addFile('vibeguard-demo.json', Buffer.from(JSON.stringify({ projectName: 'PulseAI' }, null, 2)));

  // Patient raw dict exposure (HIPAA PHI leak)
  zip.addFile('api/routes/patients.py', Buffer.from([
    'from fastapi import APIRouter',
    'router = APIRouter()',
    '@router.get("/patient/{id}")',
    'def get_patient(id: int):',
    '    return patient.__dict__',
  ].join('\n')));

  // Unsafe upload path traversal
  zip.addFile('api/routes/upload.py', Buffer.from([
    'from fastapi import APIRouter, UploadFile',
    'router = APIRouter()',
    '@router.post("/upload")',
    'def upload_file(file: UploadFile):',
    '    file.save(file.filename)',
    '    return {"success": True}',
  ].join('\n')));

  // Global shared predictions state race condition
  zip.addFile('workers/prediction.py', Buffer.from([
    'global predictions',
    'predictions = []',
    'def run_prediction(data):',
    '    predictions.append(data)',
    '    return predictions',
  ].join('\n')));

  // Wildcard CORS and missing rate limit
  zip.addFile('api/main.py', Buffer.from([
    'from fastapi import FastAPI',
    'from fastapi.middleware.cors import CORSMiddleware',
    'app = FastAPI()',
    'app.add_middleware(',
    '    CORSMiddleware,',
    '    allow_origins=["*"],',
    '    allow_credentials=True,',
    '    allow_methods=["*"],',
    '    allow_headers=["*"],',
    ')',
    '@app.post("/predict")',
    'def predict():',
    '    return {"prediction": "healthy"}',
  ].join('\n')));

  zip.writeZip('./PulseAI.zip');
  console.log('Created PulseAI.zip');
}

createNebulaCommerce();
createOrionCloud();
createPulseAI();
