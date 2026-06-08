import fs from 'fs/promises';
import path from 'path';

export interface RepoProfile {
  stack: {
    language: string[];
    framework: string[];
    packageManager: string;
    runtime: string;
    testFramework: string[];
    database: string[];
    cicd: string[];
  };
  structure: {
    entryPoints: string[];
    configFiles: string[];
    totalFiles: number;
    totalLines: number;
    filesByType: Record<string, number>;
    modules: string[];
  };
  dependencies: {
    production: Record<string, string>;
    development: Record<string, string>;
    python: string[];
  };
  hasDocker: boolean;
  hasTests: boolean;
  hasCICD: boolean;
  hasEnvFile: boolean;
}

export async function analyzeRepo(scanDir: string): Promise<RepoProfile> {
  const profile: RepoProfile = {
    stack: {
      language: [],
      framework: [],
      packageManager: 'unknown',
      runtime: 'unknown',
      testFramework: [],
      database: [],
      cicd: [],
    },
    structure: {
      entryPoints: [],
      configFiles: [],
      totalFiles: 0,
      totalLines: 0,
      filesByType: {},
      modules: [],
    },
    dependencies: {
      production: {},
      development: {},
      python: [],
    },
    hasDocker: false,
    hasTests: false,
    hasCICD: false,
    hasEnvFile: false,
  };

  async function walkDir(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', '__pycache__', '.next', 'dist', 'build'].includes(entry.name)) {
          files.push(...await walkDir(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allFiles = await walkDir(scanDir);
  profile.structure.totalFiles = allFiles.length;

  for (const filePath of allFiles) {
    const relPath = path.relative(scanDir, filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Count by extension
    profile.structure.filesByType[ext] = (profile.structure.filesByType[ext] || 0) + 1;

    // Detect languages
    if (['.js', '.jsx', '.mjs'].includes(ext) && !profile.stack.language.includes('JavaScript')) {
      profile.stack.language.push('JavaScript');
    }
    if (['.ts', '.tsx'].includes(ext) && !profile.stack.language.includes('TypeScript')) {
      profile.stack.language.push('TypeScript');
    }
    if (ext === '.py' && !profile.stack.language.includes('Python')) {
      profile.stack.language.push('Python');
    }
    if (ext === '.go' && !profile.stack.language.includes('Go')) {
      profile.stack.language.push('Go');
    }
    if (['.java', '.kt'].includes(ext) && !profile.stack.language.includes('Java/Kotlin')) {
      profile.stack.language.push('Java/Kotlin');
    }
    if (ext === '.rs' && !profile.stack.language.includes('Rust')) {
      profile.stack.language.push('Rust');
    }

    // Count lines
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      profile.structure.totalLines += content.split('\n').length;

      // Detect frameworks from file content
      if (content.includes('from fastapi') || content.includes('import fastapi')) {
        if (!profile.stack.framework.includes('FastAPI')) profile.stack.framework.push('FastAPI');
      }
      if (content.includes('from django') || content.includes('import django')) {
        if (!profile.stack.framework.includes('Django')) profile.stack.framework.push('Django');
      }
      if (content.includes("require('express')") || content.includes("from 'express'")) {
        if (!profile.stack.framework.includes('Express')) profile.stack.framework.push('Express');
      }
      if (content.includes("require('fastify')") || content.includes("from 'fastify'")) {
        if (!profile.stack.framework.includes('Fastify')) profile.stack.framework.push('Fastify');
      }
      if (content.includes("from 'next'") || content.includes('"next"')) {
        if (!profile.stack.framework.includes('Next.js')) profile.stack.framework.push('Next.js');
      }
      if (content.includes("from 'react'") || content.includes('"react"')) {
        if (!profile.stack.framework.includes('React')) profile.stack.framework.push('React');
      }
      if (content.includes('prisma') || content.includes('@prisma')) {
        if (!profile.stack.database.includes('Prisma/PostgreSQL')) profile.stack.database.push('Prisma/PostgreSQL');
      }
      if (content.includes('mongoose') || content.includes('mongodb')) {
        if (!profile.stack.database.includes('MongoDB')) profile.stack.database.push('MongoDB');
      }
      if (content.includes('redis') || content.includes('ioredis')) {
        if (!profile.stack.database.includes('Redis')) profile.stack.database.push('Redis');
      }
    } catch {}

    // Detect config and special files
    if (fileName === 'package.json' && !relPath.includes('node_modules')) {
      try {
        const pkg = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        profile.dependencies.production = pkg.dependencies || {};
        profile.dependencies.development = pkg.devDependencies || {};
        profile.stack.packageManager = 'npm';

        // Detect test frameworks
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.jest) profile.stack.testFramework.push('Jest');
        if (allDeps.vitest) profile.stack.testFramework.push('Vitest');
        if (allDeps.mocha) profile.stack.testFramework.push('Mocha');
        if (allDeps.cypress) profile.stack.testFramework.push('Cypress');

        // Runtime detection
        if (pkg.engines?.node) profile.stack.runtime = `Node.js ${pkg.engines.node}`;
        else profile.stack.runtime = 'Node.js';
      } catch {}
    }

    if (fileName === 'requirements.txt') {
      try {
        const reqs = await fs.readFile(filePath, 'utf-8');
        profile.dependencies.python = reqs.split('\n').filter(Boolean);
        if (!profile.stack.runtime.includes('Python')) profile.stack.runtime = 'Python';
        if (reqs.includes('pytest')) profile.stack.testFramework.push('pytest');
      } catch {}
    }

    if (fileName === 'pnpm-workspace.yaml') profile.stack.packageManager = 'pnpm';
    if (fileName === 'yarn.lock') profile.stack.packageManager = 'yarn';

    // Detect Docker
    if (fileName === 'dockerfile' || fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') {
      profile.hasDocker = true;
    }

    // Detect existing CI/CD
    if (relPath.includes('.github/workflows')) {
      profile.hasCICD = true;
      profile.stack.cicd.push('GitHub Actions');
    }
    if (fileName === '.gitlab-ci.yml') {
      profile.hasCICD = true;
      profile.stack.cicd.push('GitLab CI');
    }
    if (fileName === 'jenkinsfile') {
      profile.hasCICD = true;
      profile.stack.cicd.push('Jenkins');
    }

    // Detect tests
    if (relPath.includes('test') || relPath.includes('spec') || relPath.includes('__tests__')) {
      profile.hasTests = true;
    }

    // Detect .env
    if (fileName === '.env' || fileName === '.env.example') {
      profile.hasEnvFile = true;
    }

    // Entry points
    if (['index.js', 'main.js', 'app.js', 'server.js', 'index.ts', 'main.ts', 'app.ts', 'main.py', 'app.py'].includes(fileName)) {
      profile.structure.entryPoints.push(relPath);
    }

    // Config files
    if (['package.json', 'tsconfig.json', 'vite.config.ts', 'next.config.js', 'webpack.config.js', 'docker-compose.yml', '.env.example', 'requirements.txt', 'pyproject.toml'].includes(fileName)) {
      profile.structure.configFiles.push(relPath);
    }

    // Top-level modules (directories)
    const parts = relPath.split(path.sep);
    if (parts.length >= 2 && !profile.structure.modules.includes(parts[0])) {
      profile.structure.modules.push(parts[0]);
    }
  }

  return profile;
}
