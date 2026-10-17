import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { 
  Building2, 
  BarChart3, 
  ListFilter, 
  ShieldAlert, 
  Settings, 
  ArrowLeft, 
  CheckCircle2, 
  Bell, 
  HelpCircle 
} from 'lucide-react';
import { DisclaimerFooter } from '@/components/shared/DisclaimerFooter';
import { ToastProvider } from '@/components/shared/ToastProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { PageTransition } from '@/components/shared/PageTransition';
import { VirasatLogo } from '@/components/brand/VirasatLogo';
import { baseInstitutionDashboard } from '@/mocks/institutionDashboardData';

export const InstitutionLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-navy">
      <ToastProvider />

      {/* Operations Header */}
      <header className="sticky top-0 z-40 bg-navy text-white border-b border-navy-light px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/case/overview"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Family Case</span>
            </Link>

            <div className="h-5 w-px bg-white/20" />

            <div className="flex items-center gap-2.5">
              <VirasatLogo variant="emblem" theme="dark" size={34} />
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Virasat Operations Console</span>
                  <span className="text-[10px] bg-amber-400 text-navy font-bold px-1.5 py-0.2 rounded">
                    Institutional Desk
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Integrated Banking, Broking & Insurance Settlement Portal
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-navy-surface px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Live STP Pipeline:</span>
              <strong className="text-white font-mono">
                {baseInstitutionDashboard.kpis.pendingClaimsQueue} Pending
              </strong>
            </div>

            <LanguageSwitcher />

            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white">
                OM
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-white">Ops Manager</div>
                <div className="text-[10px] text-slate-400">Centralized Claims Desk</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-nav / Breadcrumb bar */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-6 font-medium">
            <span className="text-navy font-bold flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Operations Overview & KPIs
            </span>
            <span className="text-slate-400">Claims Intake SLA: 48 Hours Max</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>DigiLocker API v2.4 Online</span>
            <span>•</span>
            <span>CAMS/CDSL STP Gateway Active</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto flex flex-col">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <DisclaimerFooter condensed />
    </div>
  );
};
