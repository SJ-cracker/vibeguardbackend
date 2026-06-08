"use client";
import React from 'react';
import { Finding } from '../services/api';
import { X, ArrowLeft, Shield, AlertTriangle, Code, Wrench, ExternalLink, Clock, Tag } from 'lucide-react';

interface FindingDetailProps {
  finding: Finding | null;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  critical: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
  info: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

const effortColors: Record<string, string> = {
  quick: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  complex: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const FindingDetail: React.FC<FindingDetailProps> = ({ finding, onClose }) => {
  if (!finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-950/95 backdrop-blur border-b border-slate-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Findings
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title + Severity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${severityColors[finding.severity]}`}>
                {finding.severity}
              </span>
              {finding.effort && (
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${effortColors[finding.effort]}`}>
                  {finding.effort} fix
                </span>
              )}
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
            </div>
            <h2 className="text-2xl font-black text-white">{finding.title}</h2>
            {finding.owaspCategory && (
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500 font-medium">{finding.owaspCategory}</span>
              </div>
            )}
          </div>

          {/* File Location */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <Code className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm font-mono text-slate-200">
                {finding.filePath}
                <span className="text-emerald-400 ml-2">lines {finding.lineStart}–{finding.lineEnd}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> What's Wrong
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              {finding.description}
            </p>
          </div>

          {/* Vulnerable Code Snippet */}
          {finding.codeSnippet && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Code className="w-3 h-3" /> Vulnerable Code
              </h3>
              <pre className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-sm font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap">
                {finding.codeSnippet}
              </pre>
            </div>
          )}

          {/* Fix Suggestion */}
          {finding.fixSuggestion && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Wrench className="w-3 h-3" /> How to Fix
              </h3>
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                <p className="text-emerald-200 text-sm leading-relaxed">{finding.fixSuggestion}</p>
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Analyzer</p>
              <p className="text-sm font-semibold text-white capitalize">{finding.analyzer}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Effort to Fix
              </p>
              <p className={`text-sm font-semibold capitalize ${effortColors[finding.effort || 'quick'].split(' ')[0]}`}>
                {finding.effort || 'Quick'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
