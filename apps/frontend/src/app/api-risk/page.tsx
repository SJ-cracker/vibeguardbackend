"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { Zap, ChevronDown, ChevronUp, ExternalLink, Wrench, AlertTriangle, Code, Shield } from 'lucide-react';

const severityColors: Record<string, string> = {
  critical: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

function ApiRiskContent() {
  const searchParams = useSearchParams();
  const queryScanId = searchParams.get('scanId');

  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let scanIdToUse = queryScanId;
        if (!scanIdToUse) {
          const scansRes = await api.get('/v1/scans');
          const scans = scansRes.data;
          if (!scans || scans.length === 0) { setLoading(false); return; }
          const latest = scans.find((s: any) => s.status === 'complete') || scans[0];
          scanIdToUse = latest.id;
        }

        const scanRes = await api.get(`/v1/scans/${scanIdToUse}`);
        setScanInfo(scanRes.data);
  
        const allFindings = scanRes.data.findings || [];
  
        console.log('All findings analyzers:', allFindings.map((f: any) => f.analyzer));
  
        const apiFindings = allFindings.filter((f: any) =>
          f.analyzer === 'api' ||
          f.analyzer === 'apiRisk' ||
          f.analyzer === 'api-risk' ||
          f.analyzer === 'API Risk Auditor' ||
          f.ruleId?.startsWith('API-')
        );
  
        setFindings(apiFindings);
      } catch (e) {
        console.error('API risk page error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [queryScanId]);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <DashboardLayout scanId={scanInfo?.id}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <Zap className="text-emerald-400" /> API Risk Auditor
          </h2>
          {scanInfo && (
            <p className="text-slate-500 text-sm">
              Showing API findings from scan <span className="font-mono text-emerald-400">{scanInfo.id}</span>
              {' '}· VibeScore <span className="text-white font-bold">{scanInfo.vibeScore ?? '–'}</span>
            </p>
          )}
        </div>

        {loading && <p className="text-slate-500">Loading API risk findings...</p>}

        {!loading && findings.length === 0 && (
          <div className="py-20 flex flex-col items-center text-slate-600">
            <Shield className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-medium">No API risk findings detected in the latest scan.</p>
          </div>
        )}

        <div className="space-y-4">
          {findings.map((finding) => (
            <div key={finding.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all">
              {/* Card Header — always visible */}
              <button
                onClick={() => toggle(finding.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className={`shrink-0 px-2 py-1 rounded-lg border text-xs font-bold uppercase ${severityColors[finding.severity]}`}>
                  {finding.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{finding.title}</p>
                  <p className="text-slate-500 text-xs font-mono mt-0.5">{finding.filePath}:{finding.lineStart}</p>
                </div>
                {expandedId === finding.id
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </button>

              {/* Expanded Detail */}
              {expandedId === finding.id && (
                <div className="border-t border-slate-800 p-5 space-y-4">
                  {/* Description */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> What's Wrong
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{finding.description}</p>
                  </div>

                  {/* Code Snippet */}
                  {finding.codeSnippet && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Code className="w-3 h-3" /> Vulnerable Code
                      </h4>
                      <pre className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap">
                        {finding.codeSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Fix */}
                  {finding.fixSuggestion && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Wrench className="w-3 h-3" /> How to Fix
                      </h4>
                      <p className="text-emerald-200 text-sm leading-relaxed p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                        {finding.fixSuggestion}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 flex-wrap pt-1">
                    {finding.cweId && (
                      <a
                        href={`https://cwe.mitre.org/data/definitions/${finding.cweId.replace('CWE-', '')}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        {finding.cweId} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {finding.owaspCategory && (
                      <span className="text-xs text-slate-600 font-medium">{finding.owaspCategory}</span>
                    )}
                    <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full border ${
                      finding.effort === 'quick' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                      finding.effort === 'complex' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' :
                      'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    }`}>{finding.effort} fix</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ApiRisk() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
          <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Loading API Risks...</p>
        </div>
      </DashboardLayout>
    }>
      <ApiRiskContent />
    </Suspense>
  );
}
