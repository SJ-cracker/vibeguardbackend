"use client";
import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../services/api';
import { Network, Download } from 'lucide-react';

export default function DiagramPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const scansRes = await api.get('/v1/scans');
        const latest = scansRes.data.find((s: any) => s.status === 'complete');
        if (!latest) { setLoading(false); return; }
        const res = await api.get(`/v1/scans/${latest.id}/diagram`);
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!data?.mermaid || !containerRef.current) return;
    // Dynamically load mermaid
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          background: '#0a0a0a',
          primaryColor: '#1e3a5f',
          primaryTextColor: '#93c5fd',
          lineColor: '#334155',
          edgeLabelBackground: '#1e293b',
        }
      });
      mermaid.render('arch-diagram', data.mermaid).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      });
    });
  }, [data]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <Network className="text-emerald-400" /> Architecture Diagram
          </h2>
          {data?.profile && (
            <p className="text-slate-500 text-sm">{data.profile.structure?.totalFiles} files · {data.profile.structure?.totalLines?.toLocaleString()} lines · {data.profile.stack?.language?.join(', ')}</p>
          )}
        </div>

        {loading && <p className="text-slate-500">Generating diagram...</p>}
        {!loading && !data?.mermaid && (
          <p className="text-slate-500">No diagram yet. Upload a project ZIP to generate architecture diagram.</p>
        )}

        {data?.mermaid && (
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-8 overflow-auto">
            <div ref={containerRef} className="flex justify-center min-h-96" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
