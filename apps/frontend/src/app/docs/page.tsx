"use client";

import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { BookOpen, Shield, Zap, Cpu, Server } from 'lucide-react';

export default function DocsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">VibeGuard Documentation</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-200 border-b border-slate-800 pb-3">The Agents</h2>
          <p className="text-slate-400">VibeGuard uses specialized AI agents to scan your codebase across four distinct vectors:</p>
          
          <div className="grid gap-4 mt-6">
            <DocCard 
              icon={<Cpu />} 
              title="Bug Predictor" 
              color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
              desc="Detects unhandled Promise rejections, infinite recursion loops, null dereferences, and logic errors using pure syntax tree AST analysis." 
            />
            <DocCard 
              icon={<Shield />} 
              title="Security Scanner" 
              color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20"
              desc="The core auditor. Finds Injection vulnerabilities (SQLi, Command), cross-site scripting (XSS), insecure deserialization, and hardcoded credentials matching OWASP & CWE guidelines." 
            />
            <DocCard 
              icon={<Zap />} 
              title="API Risk Auditor" 
              color="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/20"
              desc="Identifies missing error handlers in fetch/axios logic, unprotected Webhooks, absent rate limiting, and hardcoded API tokens in Authorization mechanisms." 
            />
            <DocCard 
              icon={<Server />} 
              title="Deployment Checker" 
              color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20"
              desc="Scans config files, dockerfiles and environment files to prevent shipping code running as root, left-over console/debug statements, or exposed .env variables." 
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-200 border-b border-slate-800 pb-3">VibeScore Metric</h2>
          <p className="text-slate-400">
            The <strong>VibeScore</strong> is a density-based evaluation of your code's integrity out of 100. Rather than simply counting the number of findings, VibeScore weights vulnerabilities by severity and normalizes them against the scale of your repository (per 1000 lines of code).
          </p>
          <ul className="list-disc pl-6 text-slate-400 space-y-2">
            <li><strong>Critical (10)</strong>: Direct code execution, SQLi, root privileges.</li>
            <li><strong>High (5)</strong>: XSS, hardcoded secrets, unprotected webhooks.</li>
            <li><strong>Medium (2)</strong>: Unhandled promises, missing rate limits.</li>
            <li><strong>Low (1)</strong>: console.logs left behind, hardcoded internal port numbers.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-200 border-b border-slate-800 pb-3">Security and Privacy</h2>
          <p className="text-slate-400">
            VibeGuard runs entirely on your local machine using containerized tools and local LLM endpoints. 
            Code is parsed with AST trees and no proprietary source code leaves your network for analysis. AI fix suggestions securely talk to the Groq API when enabled.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}

function DocCard({ icon, title, desc, color, bg, border }: any) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
      <div className={`mt-1 p-3 rounded-xl ${bg} ${border} border`}>
        {React.cloneElement(icon, { className: `w-6 h-6 ${color}` })}
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
