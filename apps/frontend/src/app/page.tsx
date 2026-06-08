"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Upload, Zap, Lock, Cpu, ArrowRight, Loader2 } from 'lucide-react';
import { createScan } from '../services/api';

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await createScan(formData);

      // Redirect to dashboard
      router.push(`/dashboard/${response.scan_id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Analysis engine failed to initialize. Please check backend status.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-20 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest animate-fade-in">
            <Zap className="w-3 h-3 fill-emerald-400" /> VibeGuard Engine v1.0 Live
          </div>

          <h1 className="text-7xl font-black tracking-tighter leading-none italic">
            SECURE YOUR <span className="text-gradient underline decoration-emerald-500/30 underline-offset-8">VIBE.</span>
          </h1>

          <p className="text-xl text-slate-400 leading-relaxed font-medium">
            The quality gate for AI-generated code. Instant AST-based security audits and bug prediction for Cursor, Bolt, and v0 projects.
          </p>
        </div>

        {/* Upload Portal */}
        <div className="w-full max-w-xl group">
          <label className={`
            relative flex flex-col items-center justify-center p-12 
            rounded-[2.5rem] border-2 border-dashed transition-all duration-500 cursor-pointer
            ${isUploading ? 'bg-emerald-500/10 border-emerald-500 animate-pulse' : 'bg-slate-950/40 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/40'}
          `}>
            <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />

            <div className={`p-6 rounded-3xl bg-slate-900 border border-slate-800 mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-2xl ${isUploading ? 'bg-emerald-500 border-emerald-400' : ''}`}>
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-black animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-emerald-400" />
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">Drop your ZIP archive</h3>
              <p className="text-slate-500 font-medium">Automatic language detection for JS, TS, and Python</p>
            </div>

            {error && <p className="mt-6 text-rose-400 text-sm font-bold bg-rose-400/10 px-4 py-2 rounded-xl border border-rose-400/20">{error}</p>}

            <div className="mt-10 flex items-center gap-6 opacity-40 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <Shield className="w-3 h-3" /> Encrypted Analysis
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <Lock className="w-3 h-3" /> Local Private Inference
              </div>
            </div>
          </label>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-32">
          <FeatureCard
            icon={<Shield />}
            title="Deep AST Auditing"
            description="Goes beyond regex. Our engine understands your code's structure to find logical vulnerabilities."
          />
          <FeatureCard
            icon={<Cpu />}
            title="Local AI Inference"
            description="Your IP stays yours. All analysis happens in your private VibeGuard instance."
          />
          <FeatureCard
            icon={<ArrowRight />}
            title="Instant Remediation"
            description="Every finding comes with a plain-English explanation and a copy-paste fix."
          />
        </div>
      </main>

      <footer className="relative z-10 mt-20 border-t border-slate-900 p-10 text-center text-[10px] uppercase tracking-[0.2em] font-bold text-slate-700">
        © 2026 VIBEGUARD.AI // BUILT FOR THE POST-IDE ERA
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-950/20 border border-slate-900 hover:border-slate-800 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500 group-hover:text-black transition-all">
        {React.cloneElement(icon as any, { className: 'w-6 h-6' })}
      </div>
      <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
      <p className="text-slate-500 text-sm leading-relaxed font-medium">{description}</p>
    </div>
  );
}
