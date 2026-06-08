"use client";

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Scan, getScans } from '../../services/api';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getScans()
      .then(setScans)
      .catch((err) => {
        console.error(err);
        setError('Failed to load recent scans');
      })
      .finally(() => setLoading(false));
  }, []);

  const latestScanId = scans[0]?.id;

  return (
    <DashboardLayout scanId={latestScanId}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">Recent Scans</h1>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : scans.length === 0 ? (
          <div className="text-slate-400 italic">No scans found. Upload a ZIP to get started.</div>
        ) : (
          <div className="grid gap-4">
            {scans.map((scan) => (
              <Link key={scan.id} href={`/dashboard/${scan.id}`} className="block">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-slate-400 uppercase tracking-widest">{scan.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest
                        ${scan.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400' : 
                          scan.status === 'failed' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}
                      `}>
                        {scan.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500" suppressHydrationWarning>
                      Evaluated on: {new Date(scan.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Findings</p>
                      <p className="text-xl font-bold text-white">{scan._count?.findings || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">VibeScore</p>
                      <p className={`text-2xl font-black ${
                        scan.vibeScore === null ? 'text-slate-600' :
                        scan.vibeScore >= 80 ? 'text-emerald-400' :
                        scan.vibeScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {scan.vibeScore === null ? '-' : scan.vibeScore}
                      </p>
                    </div>
                    <div className="text-slate-600 group-hover:text-emerald-400 transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
