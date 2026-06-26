"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { GitBranch, Copy, Check, Download, Terminal } from 'lucide-react';

function CICDContent() {
  const searchParams = useSearchParams();
  const queryScanId = searchParams.get('scanId');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'dockerfile'>('workflow');
  const [resolvedScanId, setResolvedScanId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let scanIdToUse = queryScanId;
        if (!scanIdToUse) {
          const scansRes = await api.get('/v1/scans');
          const latest = scansRes.data.find((s: any) => s.status === 'complete');
          if (!latest) { setLoading(false); return; }
          scanIdToUse = latest.id;
        }
        setResolvedScanId(scanIdToUse);
        const res = await api.get(`/v1/scans/${scanIdToUse}/cicd`);
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [queryScanId]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <DashboardLayout scanId={resolvedScanId || undefined}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <GitBranch className="text-emerald-400" /> CI/CD Pipeline Generator
          </h2>
          {data?.profile && (
            <div className="flex flex-wrap gap-2 mt-3">
              {data.profile.stack?.language?.map((l: string) => (
                <span key={l} className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">{l}</span>
              ))}
              {data.profile.stack?.framework?.map((f: string) => (
                <span key={f} className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{f}</span>
              ))}
            </div>
          )}
        </div>

        {loading && <p className="text-slate-500">Generating pipeline...</p>}

        {!loading && !data?.yaml && (
          <p className="text-slate-500">No CI/CD data yet. Upload a project ZIP to generate a pipeline.</p>
        )}

        {data?.yaml && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('workflow')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'workflow' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                GitHub Actions Workflow
              </button>
              {data.dockerfile && (
                <button
                  onClick={() => setActiveTab('dockerfile')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dockerfile' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                  Dockerfile
                </button>
              )}
            </div>

            {/* Code Block */}
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-400">
                    {activeTab === 'workflow' ? '.github/workflows/ci.yml' : 'Dockerfile'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copy(activeTab === 'workflow' ? data.yaml : data.dockerfile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => download(
                      activeTab === 'workflow' ? data.yaml : data.dockerfile,
                      activeTab === 'workflow' ? 'ci.yml' : 'Dockerfile'
                    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-400 border border-emerald-500/20 transition-all"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>
              <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed">
                {activeTab === 'workflow' ? data.yaml : data.dockerfile}
              </pre>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function CICDPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Loading CI/CD Pipeline...</p>
        </div>
      </DashboardLayout>
    }>
      <CICDContent />
    </Suspense>
  );
}
