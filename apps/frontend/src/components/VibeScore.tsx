import React from 'react';

interface VibeScoreProps {
  score: number | null;
}

export const VibeScore: React.FC<VibeScoreProps> = ({ score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (s >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const displayScore = score !== null ? score : '--';
  const colorClass = score !== null ? getScoreColor(score) : 'text-slate-400 border-slate-500/30 bg-slate-500/10';

  return (
    <div className={`relative flex flex-col items-center justify-center w-48 h-48 rounded-full border-4 ${colorClass} shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:scale-105`}>
      <div className="text-sm font-medium uppercase tracking-widest opacity-60">VibeScore</div>
      <div className="text-6xl font-black">{displayScore}</div>
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
    </div>
  );
};
