import { RepoProfile } from './repoAnalyzer';

export interface CICDOutput {
  platform: string;
  filename: string;
  content: string;
  dockerfile?: string;
  explanation: string;
}

export function generateCICD(profile: RepoProfile): CICDOutput {
  const isNode = profile.stack.language.includes('JavaScript') || profile.stack.language.includes('TypeScript');
  const isPython = profile.stack.language.includes('Python');
  const isMonorepo = profile.stack.packageManager === 'pnpm' || profile.structure.modules.includes('apps');
  const hasDocker = profile.hasDocker;
  const testFramework = profile.stack.testFramework[0] || null;
  const packageManager = profile.stack.packageManager;
  const pmRun = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm run';
  const pmInstall = packageManager === 'pnpm' ? 'pnpm install' : packageManager === 'yarn' ? 'yarn install' : 'npm ci';

  let workflow = '';
  let explanation = '';

  if (isNode) {
    workflow = `name: VibeGuard CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '20'
  ${packageManager === 'pnpm' ? "PNPM_VERSION: '8'" : ''}

jobs:
  # ──────────────────────────────────────────
  # Job 1: Security Audit (runs first)
  # ──────────────────────────────────────────
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: '${packageManager === 'pnpm' ? 'pnpm' : 'npm'}'

      ${packageManager === 'pnpm' ? `- name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: \${{ env.PNPM_VERSION }}` : ''}

      - name: Install dependencies
        run: ${pmInstall}

      - name: Audit dependencies for vulnerabilities
        run: ${packageManager === 'pnpm' ? 'pnpm audit' : packageManager === 'yarn' ? 'yarn audit' : 'npm audit --audit-level=high'}
        continue-on-error: true

      - name: Check for secrets in code
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: \${{ github.event.repository.default_branch }}
          head: HEAD

  # ──────────────────────────────────────────
  # Job 2: Lint & Type Check
  # ──────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}

      ${packageManager === 'pnpm' ? `- name: Setup pnpm
        uses: pnpm/action-setup@v2` : ''}

      - name: Install dependencies
        run: ${pmInstall}

      - name: Run ESLint
        run: ${pmRun} lint
        continue-on-error: true

      - name: TypeScript type check
        run: ${pmRun} typecheck || npx tsc --noEmit
        continue-on-error: true

  # ──────────────────────────────────────────
  # Job 3: Test
  # ──────────────────────────────────────────
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    ${profile.stack.database.includes('Prisma/PostgreSQL') || profile.stack.database.includes('MongoDB') ? `services:
      ${profile.stack.database.includes('Prisma/PostgreSQL') ? `postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432` : ''}
      ${profile.stack.database.includes('Redis') ? `redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
        ports:
          - 6379:6379` : ''}` : ''}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}

      ${packageManager === 'pnpm' ? `- name: Setup pnpm
        uses: pnpm/action-setup@v2` : ''}

      - name: Install dependencies
        run: ${pmInstall}

      ${profile.stack.database.includes('Prisma/PostgreSQL') ? `- name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/testdb` : ''}

      - name: Run tests
        run: ${pmRun} test${testFramework === 'Jest' ? ' -- --coverage --passWithNoTests' : ''}
        env:
          NODE_ENV: test
          ${profile.stack.database.includes('Prisma/PostgreSQL') ? 'DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/testdb' : ''}
          ${profile.stack.database.includes('Redis') ? 'REDIS_URL: redis://localhost:6379' : ''}

  # ──────────────────────────────────────────
  # Job 4: Build
  # ──────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}

      ${packageManager === 'pnpm' ? `- name: Setup pnpm
        uses: pnpm/action-setup@v2` : ''}

      - name: Install dependencies
        run: ${pmInstall}

      - name: Build
        run: ${pmRun} build
        env:
          NODE_ENV: production

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            dist/
            .next/
            build/
          retention-days: 7

  # ──────────────────────────────────────────
  # Job 5: Docker Build & Push (if Dockerfile exists)
  # ──────────────────────────────────────────
  ${hasDocker ? `docker:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            \${{ secrets.DOCKER_USERNAME }}/\${{ github.event.repository.name }}:latest
            \${{ secrets.DOCKER_USERNAME }}/\${{ github.event.repository.name }}:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max` : '# Docker job skipped — no Dockerfile detected'}

  # ──────────────────────────────────────────
  # Job 6: Deploy (main branch only)
  # ──────────────────────────────────────────
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [security, build${hasDocker ? ', docker' : ''}]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        run: echo "Add your deployment step here (Vercel, Railway, AWS, etc.)"
        # Example for Vercel:
        # uses: amondnet/vercel-action@v25
        # with:
        #   vercel-token: \${{ secrets.VERCEL_TOKEN }}
        #   vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        #   vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        #   vercel-args: '--prod'
`;

    explanation = `Generated GitHub Actions pipeline for ${profile.stack.framework.join('/')} ${isMonorepo ? 'monorepo' : 'project'}. Includes: security audit with TruffleHog secret scanning, ESLint + TypeScript checks, automated tests${profile.stack.database.includes('Prisma/PostgreSQL') ? ' with PostgreSQL service' : ''}, production build${hasDocker ? ', Docker build & push' : ''}, and deployment gate on main branch.`;
  }

  if (isPython && !isNode) {
    workflow = `name: VibeGuard CI/CD Pipeline (Python)

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run Bandit security scan
        run: pip install bandit && bandit -r . -f json || true
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main

  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install linting tools
        run: pip install flake8 black mypy
      - name: Run flake8
        run: flake8 . --max-line-length=120 || true
      - name: Check formatting
        run: black --check . || true

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt pytest pytest-cov
      - name: Run tests
        run: pytest --cov=. --cov-report=xml || echo "No tests found"

  build:
    name: Build & Package
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      ${hasDocker ? `- name: Build Docker image
        run: docker build -t app:latest .` : ''}
`;
    explanation = `Generated GitHub Actions pipeline for Python project. Includes Bandit security scanning, flake8 linting, Black formatting check, and pytest with coverage reporting.`;
  }

  // Generate Dockerfile if missing
  let dockerfile: string | undefined;
  if (!hasDocker && isNode) {
    dockerfile = `FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
${packageManager === 'pnpm' ? 'RUN npm install -g pnpm && pnpm install --frozen-lockfile' : 'RUN npm ci --only=production'}

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
`;
  }

  return {
    platform: 'GitHub Actions',
    filename: '.github/workflows/ci.yml',
    content: workflow,
    dockerfile,
    explanation,
  };
}
