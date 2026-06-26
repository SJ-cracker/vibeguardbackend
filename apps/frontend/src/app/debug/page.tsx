"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { Bug, ChevronDown, ChevronUp, Copy, Check, Wrench, Terminal } from 'lucide-react';

const severityColors: Record<string, string> = {
  critical: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

function DebugPageContent() {
  const searchParams = useSearchParams();
  const queryScanId = searchParams.get('scanId');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
        const res = await api.get(`/v1/scans/${scanIdToUse}/debug`);
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [queryScanId]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPatch = async (idx: number) => {
    try {
      if (!resolvedScanId) {
        setError('No active scan found');
        return;
      }
      setApplyingId(idx.toString());
      setError(null);
      setSuccess(null);

      await api.post(`/v1/scans/${resolvedScanId}/debug/apply`, { patchIndex: idx });
      setSuccess(`Patch applied and validated successfully!`);

      // Reload debug report
      const res = await api.get(`/v1/scans/${resolvedScanId}/debug`);
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to apply patch');
    } finally {
      setApplyingId(null);
    }
  };

  const patches = data?.report?.patches || [];

  return (
    <DashboardLayout scanId={resolvedScanId || undefined}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <Bug className="text-emerald-400" /> Auto-Debug Agent
          </h2>
          {data?.report && (
            <div className="flex gap-4 mt-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                {data.report.autoFixable} Auto-fixable
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                {data.report.manualRequired} Manual review
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                {data.report.totalPatches} total patches
              </span>
            </div>
          )}
          {data?.report?.summary && (
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">{data.report.summary}</p>
          )}
        </div>

        {loading && <p className="text-slate-500">Analyzing findings...</p>}
        {!loading && patches.length === 0 && (
          <p className="text-slate-500">No debug patches available. Upload a project to analyze.</p>
        )}

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {patches.map((patch: any, idx: number) => (
            <div key={idx} className={`rounded-2xl bg-slate-900 border overflow-hidden transition-colors ${patch.applied ? 'border-emerald-500/30' : 'border-slate-800'}`}>
              <button
                onClick={() => setExpandedId(expandedId === idx.toString() ? null : idx.toString())}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-800/50 transition-colors text-left"
              >
                <span className={`shrink-0 px-2 py-1 rounded-lg border text-xs font-bold uppercase ${severityColors[patch.severity]}`}>
                  {patch.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{patch.title}</p>
                    {patch.applied && (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        Applied
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs font-mono mt-0.5">{patch.filePath}:{patch.lineStart}</p>
                </div>
                <span className="text-xs text-slate-600 font-mono shrink-0">{patch.ruleId}</span>
                {expandedId === idx.toString()
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>

              {expandedId === idx.toString() && (
                <div className="border-t border-slate-800 p-5 space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">{patch.explanation}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">❌ Before (Vulnerable)</p>
                      <pre className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap">{patch.before}</pre>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">✅ After (Fixed)</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => copy(patch.after, `after-${idx}`)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
                          >
                            {copied === `after-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                          {patch.patchType === 'code_replace' && (
                            <button
                              onClick={() => applyPatch(idx)}
                              disabled={applyingId !== null || patch.applied}
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-lg"
                            >
                              <Wrench className="w-3 h-3" />
                              {patch.applied ? 'Applied' : (applyingId === idx.toString() ? 'Applying...' : 'Apply Fix')}
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono text-emerald-200 overflow-x-auto whitespace-pre-wrap">{patch.after}</pre>
                    </div>
                  </div>

                  {patch.command && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                        <Terminal className="w-3 h-3" /> Run this command
                      </p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
                        <code className="text-xs font-mono text-amber-300">{patch.command}</code>
                        <button onClick={() => copy(patch.command, `cmd-${idx}`)} className="text-slate-500 hover:text-white transition-colors ml-3">
                          {copied === `cmd-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Loading Debug Report...</p>
        </div>
      </DashboardLayout>
    }>
      <DebugPageContent />
    </Suspense>
  );
}
