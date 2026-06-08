import React from 'react';
import { AlertTriangle, Bug, ShieldAlert, Code, CheckCircle, ChevronRight } from 'lucide-react';
import { Finding } from '../services/api';

interface FindingCardProps {
  finding: Finding;
  onClick: (finding: Finding) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onClick }) => {
  const severityColors = {
    critical: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    low: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    info: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };

  const analyzerIcons = {
    security: <ShieldAlert className="w-5 h-5" />,
    bug: <Bug className="w-5 h-5" />,
    api: <Code className="w-5 h-5" />,
    deployment: <CheckCircle className="w-5 h-5" />,
  };

  return (
    <div 
      onClick={() => onClick(finding)}
      className="group relative flex items-center p-4 mb-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer overflow-hidden"
    >
      <div className={`mr-4 p-2 rounded-lg ${severityColors[finding.severity]}`}>
        {analyzerIcons[finding.analyzer as keyof typeof analyzerIcons] || <AlertTriangle className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${severityColors[finding.severity]}`}>
            {finding.severity}
          </span>
          <span className="text-xs text-slate-500 font-mono truncate">{finding.filePath}:{finding.lineStart}</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
          {finding.title}
        </h3>
      </div>
      
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-all transform group-hover:translate-x-1" />
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
    </div>
  );
};
