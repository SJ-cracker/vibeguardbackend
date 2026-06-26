import React from 'react';
import { LayoutDashboard, History, Settings, Shield, Zap, BookOpen, GitBranch, Network, Bug } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  scanId?: string;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children, scanId }) => {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-black text-slate-200 flex font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col sticky top-0 h-screen bg-slate-950/50 backdrop-blur-xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-emerald-300 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield className="text-black w-6 h-6 stroke-[2.5px]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">
              VibeGuard<span className="text-emerald-400 block text-[10px] uppercase tracking-widest mt-1 opacity-70">AI Audit Pipeline</span>
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          <NavItem href={scanId ? `/dashboard/${scanId}` : '/'} pathname={pathname} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem href={scanId ? `/scans?scanId=${scanId}` : '/scans'} pathname={pathname} icon={<History />} label="Recent Scans" />
          <NavItem href={scanId ? `/api-risk?scanId=${scanId}` : '/api-risk'} pathname={pathname} icon={<Zap />} label="API Risk" />
          <NavItem href={scanId ? `/docs?scanId=${scanId}` : '/docs'} pathname={pathname} icon={<BookOpen />} label="Docs" />
          <NavItem icon={<GitBranch />} label="CI/CD Pipeline" href={scanId ? `/cicd?scanId=${scanId}` : '/cicd'} pathname={pathname} />
          <NavItem icon={<Network />} label="Architecture" href={scanId ? `/diagram?scanId=${scanId}` : '/diagram'} pathname={pathname} />
          <NavItem icon={<Bug />} label="Auto-Debug" href={scanId ? `/debug?scanId=${scanId}` : '/debug'} pathname={pathname} />
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-xl">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Tier</p>
            <p className="text-xs font-semibold text-white mb-3">Enterprise Alpha</p>
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
          <button className="w-full mt-4 flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/3 blur-[100px] rounded-full pointer-events-none"></div>
        
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Active Scan Analysis</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700"></div>
          </div>
        </header>

        <div className="flex-1 p-8 z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, href, pathname }: { icon: any, label: string, href: string, pathname: string | null }) => {
  const baseHref = href.split('?')[0];
  const active = pathname === baseHref || (baseHref !== '/' && pathname?.startsWith(baseHref));
  
  return (
    <Link href={href}>
      <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        <span className="text-sm tracking-wide">{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
      </button>
    </Link>
  );
};
