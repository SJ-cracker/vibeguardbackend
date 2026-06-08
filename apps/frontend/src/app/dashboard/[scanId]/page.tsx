"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getScan, Scan, Finding } from '../../../services/api';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { VibeScore } from '../../../components/VibeScore';
import { FindingCard } from '../../../components/FindingCard';
import { FindingDetail } from '../../../components/FindingDetail';
import { RefreshCcw, Search, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ScanDashboard() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScanData = async () => {
    try {
      setLoading(true);
  
      // Check sessionStorage cache first
      const cached = sessionStorage.getItem(`scan-${scanId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setScan(parsed);
        setLoading(false);
        // If already complete, no need to poll
        if (parsed.status === 'complete' || parsed.status === 'failed') return;
      }
  
      const data = await getScan(scanId as string);
      setScan(data);
      // Cache the result
      sessionStorage.setItem(`scan-${scanId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to fetch scan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scanId) return;
    fetchScanData();
  
    const interval = setInterval(async () => {
      const data = await getScan(scanId as string).catch(() => null);
      if (data) {
        setScan(data);
        sessionStorage.setItem(`scan-${scanId}`, JSON.stringify(data));
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval);
        }
      }
    }, 3000);
  
    return () => clearInterval(interval);
  }, [scanId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
          <RefreshCcw className="w-12 h-12 text-emerald-500/30 animate-spin mb-4" />
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Initializing Analysis Engine...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!scan) return null;

  const findingsBySeverity = {
    critical: scan.findings.filter((f: Finding) => f.severity === 'critical').length,
    high: scan.findings.filter((f: Finding) => f.severity === 'high').length,
    medium: scan.findings.filter((f: Finding) => f.severity === 'medium').length,
    low: scan.findings.filter((f: Finding) => f.severity === 'low').length,
  };

  return (
    <DashboardLayout scanId={scanId as string}>
      <div className="max-w-7xl mx-auto">
        {/* Top Summary Section */}
        <section className="flex flex-col lg:flex-row gap-8 mb-12 items-center lg:items-start">
          <VibeScore score={scan.vibeScore} />
          
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <StatCard label="Critical" value={findingsBySeverity.critical} color="text-rose-400" />
            <StatCard label="High" value={findingsBySeverity.high} color="text-orange-400" />
            <StatCard label="Medium" value={findingsBySeverity.medium} color="text-amber-400" />
            <StatCard label="Low" value={findingsBySeverity.low} color="text-slate-400" />
            
            <div className="col-span-full mt-2 p-6 rounded-3xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="text-emerald-400 w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Analysis Summary</h3>
                  <p className="text-slate-500 text-sm">
                    Scanned <span className="text-emerald-400 font-mono font-bold">{scan.findings.length > 0
                      ? [...new Set(scan.findings.map((f: Finding) => f.filePath))].length
                      : 0} files</span> · Found{' '}
                    <span className="text-white font-bold">{scan.findings.length} issue{scan.findings.length !== 1 ? 's' : ''}</span>
                    {findingsBySeverity.critical > 0 && (
                      <span className="text-rose-400 font-bold"> including {findingsBySeverity.critical} critical</span>
                    )} · Overall stability is{' '}
                    <span className={scan.vibeScore && scan.vibeScore >= 80
                      ? 'text-emerald-400 font-bold'
                      : scan.vibeScore && scan.vibeScore >= 50
                      ? 'text-amber-400 font-bold'
                      : 'text-rose-400 font-bold'
                    }>
                      {scan.vibeScore && scan.vibeScore >= 80 ? 'Optimal'
                        : scan.vibeScore && scan.vibeScore >= 50 ? 'Needs Attention'
                        : 'Compromised'}
                    </span>
                    {scan.status === 'running' && <span className="text-amber-400 font-bold"> · Scan in progress...</span>}
                    {scan.status === 'failed' && <span className="text-rose-400 font-bold"> · Scan failed</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Findings List Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              Code Audit Findings
              <span className="text-sm font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {scan.findings.length}
              </span>
            </h2>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Filter findings..."
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all w-64"
                />
              </div>
              <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scan.findings.length > 0 ? (
              scan.findings.map((finding: Finding) => (
                <FindingCard 
                  key={finding.id} 
                  finding={finding} 
                  onClick={setSelectedFinding} 
                />
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center text-slate-600">
                <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">No vulnerabilities detected. Vibe is immaculate.</p>
              </div>
            )}
          </div>
        </section>

        <FindingDetail 
          finding={selectedFinding} 
          onClose={() => setSelectedFinding(null)} 
        />
      </div>
    </DashboardLayout>
  );
}

const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 hover:border-slate-800 transition-colors">
    <div className={`text-2xl font-black mb-1 ${color}`}>{value}</div>
    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">{label}</div>
  </div>
);
