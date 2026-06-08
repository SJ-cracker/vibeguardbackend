import { RepoProfile } from './repoAnalyzer';

export interface DiagramOutput {
  mermaid: string;
  title: string;
  description: string;
}

export function generateArchitectureDiagram(profile: RepoProfile, scanDir: string): DiagramOutput {
  const { stack, structure, dependencies } = profile;
  const isFullStack = stack.framework.some(f => ['Next.js', 'React', 'Vue'].includes(f)) &&
    stack.framework.some(f => ['Express', 'Fastify', 'FastAPI', 'Django'].includes(f));
  const isMonorepo = structure.modules.includes('apps') || structure.modules.includes('packages');

  let diagram = `flowchart TB\n`;
  diagram += `  classDef frontend fill:#1e3a5f,stroke:#3b82f6,color:#93c5fd\n`;
  diagram += `  classDef backend fill:#1a3a2a,stroke:#10b981,color:#6ee7b7\n`;
  diagram += `  classDef database fill:#3b1f1f,stroke:#ef4444,color:#fca5a5\n`;
  diagram += `  classDef infra fill:#2d2a1a,stroke:#f59e0b,color:#fcd34d\n`;
  diagram += `  classDef external fill:#1f1f3b,stroke:#8b5cf6,color:#c4b5fd\n`;
  diagram += `  classDef agent fill:#1a2a3b,stroke:#60a5fa,color:#bfdbfe\n\n`;

  // User entry point
  diagram += `  USER([👤 User / Browser])\n\n`;

  // Frontend nodes
  const frontendFramework = stack.framework.find(f => ['Next.js', 'React', 'Vue', 'Angular', 'Svelte'].includes(f));
  if (frontendFramework || structure.modules.includes('frontend')) {
    diagram += `  subgraph FRONTEND["🖥️ Frontend Layer"]\n`;
    diagram += `    direction TB\n`;
    if (frontendFramework === 'Next.js') {
      diagram += `    FE_APP["Next.js App\n(App Router)"]\n`;
      diagram += `    FE_PAGES["Pages / Components"]\n`;
      diagram += `    FE_API["API Routes"]\n`;
    } else if (frontendFramework) {
      diagram += `    FE_APP["${frontendFramework} App"]\n`;
      diagram += `    FE_PAGES["Components"]\n`;
    } else {
      diagram += `    FE_APP["Frontend App"]\n`;
    }
    diagram += `  end\n\n`;
  }

  // Backend nodes
  const backendFramework = stack.framework.find(f => ['Express', 'Fastify', 'FastAPI', 'Django', 'Flask'].includes(f));
  if (backendFramework || structure.modules.includes('backend') || structure.entryPoints.length > 0) {
    diagram += `  subgraph BACKEND["⚙️ Backend Layer"]\n`;
    diagram += `    direction TB\n`;
    diagram += `    BE_SERVER["${backendFramework || 'API'} Server"]\n`;
    diagram += `    BE_ROUTES["Route Handlers"]\n`;
    diagram += `    BE_MIDDLEWARE["Middleware\n(Auth / Validation)"]\n`;
    if (Object.keys(dependencies.production).includes('bullmq') || Object.keys(dependencies.production).includes('bull')) {
      diagram += `    BE_QUEUE["Job Queue\n(BullMQ)"]\n`;
      diagram += `    BE_WORKER["Background Workers"]\n`;
    }
    diagram += `  end\n\n`;
  }

  // Database nodes
  if (stack.database.length > 0) {
    diagram += `  subgraph DATA["💾 Data Layer"]\n`;
    diagram += `    direction LR\n`;
    if (stack.database.includes('Prisma/PostgreSQL')) {
      diagram += `    DB_POSTGRES[("PostgreSQL\n(via Prisma ORM)")]\n`;
    }
    if (stack.database.includes('MongoDB')) {
      diagram += `    DB_MONGO[("MongoDB\n(via Mongoose)")]\n`;
    }
    if (stack.database.includes('Redis')) {
      diagram += `    DB_REDIS[("Redis\n(Cache / Queue)")]\n`;
    }
    diagram += `  end\n\n`;
  }

  // Infrastructure
  if (profile.hasDocker) {
    diagram += `  subgraph INFRA["🐳 Infrastructure"]\n`;
    diagram += `    direction LR\n`;
    diagram += `    DOCKER["Docker\nContainers"]\n`;
    if (stack.cicd.length > 0) {
      diagram += `    CICD["CI/CD\n(${stack.cicd[0]})"]\n`;
    }
    diagram += `  end\n\n`;
  }

  // External services from dependencies
  const hasStripe = Object.keys(dependencies.production).includes('stripe');
  const hasOpenAI = Object.keys(dependencies.production).includes('openai');
  const hasSendGrid = Object.keys(dependencies.production).includes('@sendgrid/mail');
  const hasTwilio = Object.keys(dependencies.production).includes('twilio');
  const hasClerk = Object.keys(dependencies.production).includes('@clerk/nextjs');

  if (hasStripe || hasOpenAI || hasSendGrid || hasTwilio || hasClerk) {
    diagram += `  subgraph EXTERNAL["🌐 External Services"]\n`;
    diagram += `    direction LR\n`;
    if (hasStripe) diagram += `    EXT_STRIPE["💳 Stripe\nPayments API"]\n`;
    if (hasOpenAI) diagram += `    EXT_OPENAI["🤖 OpenAI\nAPI"]\n`;
    if (hasSendGrid) diagram += `    EXT_SENDGRID["📧 SendGrid\nEmail API"]\n`;
    if (hasTwilio) diagram += `    EXT_TWILIO["📱 Twilio\nSMS API"]\n`;
    if (hasClerk) diagram += `    EXT_CLERK["🔐 Clerk\nAuth"]\n`;
    diagram += `  end\n\n`;
  }

  // Connections
  diagram += `  %% -- Connections --\n`;
  diagram += `  USER -->|"HTTP Request"| ${frontendFramework ? 'FE_APP' : 'BE_SERVER'}\n`;

  if (frontendFramework) {
    diagram += `  FE_APP --> FE_PAGES\n`;
    diagram += `  FE_APP -->|"REST / tRPC"| BE_SERVER\n`;
  }

  if (backendFramework) {
    diagram += `  BE_SERVER --> BE_MIDDLEWARE\n`;
    diagram += `  BE_MIDDLEWARE --> BE_ROUTES\n`;
    if (Object.keys(dependencies.production).includes('bullmq')) {
      diagram += `  BE_ROUTES -->|"Enqueue Job"| BE_QUEUE\n`;
      diagram += `  BE_QUEUE --> BE_WORKER\n`;
    }
  }

  if (stack.database.includes('Prisma/PostgreSQL')) {
    diagram += `  BE_ROUTES -->|"Prisma ORM"| DB_POSTGRES\n`;
    if (Object.keys(dependencies.production).includes('bullmq')) {
      diagram += `  BE_WORKER -->|"Write Results"| DB_POSTGRES\n`;
    }
  }
  if (stack.database.includes('Redis')) {
    diagram += `  BE_SERVER -->|"Cache / Pub-Sub"| DB_REDIS\n`;
    if (Object.keys(dependencies.production).includes('bullmq')) {
      diagram += `  BE_QUEUE -->|"Job Storage"| DB_REDIS\n`;
    }
  }
  if (stack.database.includes('MongoDB')) {
    diagram += `  BE_ROUTES -->|"Mongoose"| DB_MONGO\n`;
  }

  if (hasStripe) diagram += `  BE_ROUTES -->|"Stripe SDK"| EXT_STRIPE\n`;
  if (hasOpenAI) diagram += `  BE_ROUTES -->|"OpenAI SDK"| EXT_OPENAI\n`;
  if (hasSendGrid) diagram += `  BE_ROUTES -->|"Email"| EXT_SENDGRID\n`;
  if (hasTwilio) diagram += `  BE_ROUTES -->|"SMS"| EXT_TWILIO\n`;
  if (hasClerk) diagram += `  FE_APP -->|"Auth"| EXT_CLERK\n`;

  if (profile.hasDocker) {
    diagram += `  DOCKER -->|"Runs"| BE_SERVER\n`;
    if (stack.cicd.length > 0) diagram += `  CICD -->|"Deploys"| DOCKER\n`;
  }

  // Apply classes
  if (frontendFramework || structure.modules.includes('frontend')) {
    diagram += `\n  class FE_APP,FE_PAGES frontend\n`;
  }
  diagram += `  class BE_SERVER,BE_ROUTES,BE_MIDDLEWARE,BE_QUEUE,BE_WORKER backend\n`;
  if (stack.database.length > 0) {
    diagram += `  class DB_POSTGRES,DB_MONGO,DB_REDIS database\n`;
  }
  if (profile.hasDocker) {
    diagram += `  class DOCKER,CICD infra\n`;
  }
  if (hasStripe || hasOpenAI || hasSendGrid || hasTwilio || hasClerk) {
    diagram += `  class EXT_STRIPE,EXT_OPENAI,EXT_SENDGRID,EXT_TWILIO,EXT_CLERK external\n`;
  }

  const title = `${stack.framework.join(' + ') || stack.language.join('/')} Architecture`;
  const description = `${isMonorepo ? 'Monorepo' : 'Single-repo'} project using ${stack.language.join(', ')}${stack.framework.length > 0 ? ` with ${stack.framework.join(', ')}` : ''}. ${stack.database.length > 0 ? `Data layer: ${stack.database.join(', ')}.` : ''} ${structure.totalFiles} files, ~${structure.totalLines.toLocaleString()} lines of code.`;

  return { mermaid: diagram, title, description };
}
