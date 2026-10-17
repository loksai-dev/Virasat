import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Landmark, 
  Users, 
  FileCheck, 
  FolderLock, 
  Sparkles, 
  Bell, 
  Menu, 
  X, 
  Shield, 
  Building2, 
  UserCheck, 
  ExternalLink,
  Layers,
  ChevronRight,
  Award,
  Compass,
  ShieldCheck,
  Fingerprint,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentsActivePill } from '@/components/shared/AgentsActivePill';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DisclaimerFooter } from '@/components/shared/DisclaimerFooter';
import { ToastProvider } from '@/components/shared/ToastProvider';
import { AskVirasatDrawer } from '@/components/shared/AskVirasatDrawer';
import { PageTransition } from '@/components/shared/PageTransition';
import { VirasatLogo } from '@/components/brand/VirasatLogo';
import { useVirasatStore, CaseScenario } from '@/store/useVirasatStore';
import { baseCaseData } from '@/mocks/caseData';
import { useCaseStream } from '@/api/useCaseStream';
import { estateService } from '@/api/estateService';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { normalizeCaseId } from '@/api/useAgentRun';

export const CaseLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    caseId, 
    setCaseId, 
    scenario, 
    setScenario, 
    tourActive, 
    setTourActive, 
    addToast 
  } = useVirasatStore();

  const queryClient = useQueryClient();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { caseId: paramCaseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Sync paramCaseId if present
  useEffect(() => {
    if (paramCaseId && paramCaseId !== caseId) {
      setCaseId(paramCaseId);
    }
    if (searchParams.get('tour') === 'true') {
      setTourActive(true);
    }
  }, [paramCaseId, searchParams, caseId, setCaseId, setTourActive]);

  const activeCaseId = paramCaseId || caseId || baseCaseData.id;
  const canonicalCaseId = normalizeCaseId(activeCaseId);
  const basePath = paramCaseId ? `/case/${paramCaseId}` : '/case';

  // Dynamic Case Overview
  const { data: caseOverview } = useQuery({
    queryKey: ['caseOverview', canonicalCaseId],
    queryFn: () => estateService.getOverview(canonicalCaseId),
    staleTime: 5 * 60 * 1000,
  });

  const isMehta = activeCaseId.toUpperCase().includes('MEHTA') || canonicalCaseId.includes('0187');
  const caseTitle = caseOverview?.caseDetails?.title || 
    (isMehta ? 'Estate Settlement of Late Anil Mehta' : 'Estate Settlement of Late Ramesh Sharma');
  const deceasedName = caseOverview?.caseDetails?.deceasedName || 
    (isMehta ? 'Anil Mehta' : 'Ramesh Sharma');
  const netValuation = caseOverview?.netEstateValue 
    ? `₹${caseOverview.netEstateValue}` 
    : (isMehta ? '₹1.68 Cr' : '₹2.84 Cr');

  // Bi-directional case SSE stream
  const { isStale } = useCaseStream(canonicalCaseId);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await estateService.resetCase(activeCaseId);
      addToast({
        type: 'success',
        title: 'Case Data Reset',
        message: 'Benchmark estate data successfully restored.',
      });
      setShowResetConfirm(false);
      setProfileMenuOpen(false);
      queryClient.invalidateQueries();
    } catch (err: any) {
      addToast({
        type: 'risk',
        title: 'Reset Failed',
        message: err.message || 'Could not reset case data.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { label: 'Overview', path: `${basePath}/overview`, icon: LayoutDashboard },
    { label: 'AI Agents', path: `${basePath}/agents`, icon: Bot, highlight: true },
    { label: 'Estate Assets', path: `${basePath}/assets`, icon: Landmark, count: 12 },
    { label: 'Family & Heirs', path: `${basePath}/family`, icon: Users, count: 5 },
    { label: 'Claims', path: `${basePath}/claims`, icon: FileCheck, count: 12 },
    { label: 'Documents', path: `${basePath}/documents`, icon: FolderLock, count: 10 },
    { label: 'Consent & Audit', path: `${basePath}/audit`, icon: ShieldCheck, count: 'New' },
    { label: 'Ask Virasat', path: `${basePath}/ask-virasat`, icon: Sparkles, highlight: true },
  ];

  const handleScenarioChange = (newScenario: CaseScenario) => {
    setScenario(newScenario);
    addToast({
      type: newScenario === 'disputed' ? 'risk' : 'success',
      title: `Scenario Switched: ${newScenario.toUpperCase()}`,
      message: 
        newScenario === 'disputed'
          ? 'Adverse claim flagged by Vikram Sharma on Apartment and LIC Policy.'
          : newScenario === 'simple'
          ? 'Fast-track settlement: All nominees registered and uncontested.'
          : 'Standard intestate flow: 4 Class-I heirs with mutual NOC protocol.',
    });
  };

  return (
    <div className="min-h-screen flex bg-warm-sand text-navy">
      <ToastProvider />
      <AskVirasatDrawer />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (Primary Navy #0B1F3A) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-navy text-white flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 lg:static shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full lg:translate-x-0'
        )}
      >
        <div>
          {/* Logo & Platform Header */}
          <div className="p-5 border-b border-navy-light/60 flex items-center justify-between">
            <Link to="/" className="flex items-center group">
              <VirasatLogo variant="full" theme="dark" size="md" />
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Case Mini Card */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-navy-surface/90 border border-navy-light/50">
            <div className="text-[10px] uppercase tracking-wider text-teal-300 font-semibold mb-1 flex items-center justify-between">
              <span>Active Family Case</span>
              <span className="font-mono">{activeCaseId}</span>
            </div>
            <div className="text-sm font-serif font-bold text-white truncate">
              {baseCaseData.deceased.name}
            </div>
            <div className="text-xs text-slate-400">
              1958 - 2026 • {baseCaseData.deceased.city}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Settlement Status</span>
                <span className="font-semibold text-teal-300">
                  {scenario === 'simple' ? '85%' : scenario === 'disputed' ? '42%' : '58%'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-navy rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-500"
                  style={{
                    width: scenario === 'simple' ? '85%' : scenario === 'disputed' ? '42%' : '58%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 6 Core Navigation Items */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-teal-500 text-white shadow-sm font-semibold'
                        : item.highlight
                        ? 'text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-navy-light'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                      {item.count}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="text-[10px] bg-amber-400 text-navy font-bold px-1.5 py-0.5 rounded">
                      AI 24/7
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Scenario Switcher & Portal Jump */}
        <div className="p-3 border-t border-navy-light/60 space-y-2">
          {/* Scenario Selector */}
          <div className="bg-navy-dark/90 p-2.5 rounded-xl border border-navy-light/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-teal-400" />
              <span>Simulate Case Scenario:</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {(['simple', 'complex', 'disputed'] as CaseScenario[]).map((sc) => (
                <button
                  key={sc}
                  onClick={() => handleScenarioChange(sc)}
                  className={cn(
                    'py-1 rounded font-medium capitalize transition-colors',
                    scenario === sc
                      ? 'bg-teal-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          {/* Quick link to Switch Experience / Bank Portal */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <Link
              to="/demo"
              className="p-2 rounded-xl text-center text-slate-300 bg-navy-surface hover:bg-navy-light hover:text-white border border-slate-700 transition-colors flex items-center justify-center gap-1"
            >
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Switch Role</span>
            </Link>

            <Link
              to="/institution"
              className="p-2 rounded-xl text-center text-slate-300 bg-navy-surface hover:bg-navy-light hover:text-white border border-slate-700 transition-colors flex items-center justify-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Bank Desk</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Judge Mode Tour Banner (Shown when tour flag is active) */}
        {tourActive && (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-navy text-white px-4 md:px-8 py-2.5 border-b border-purple-500/30 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Judge Mode Active</span>
              </span>
              <span className="font-medium text-slate-200">
                Guided 60-Second Tour: Late Ramesh Sharma Estate (₹2.84 Cr net of home loan) • Hindu Succession Act Class-I resolution.
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`${basePath}/assets`}
                className="underline text-teal-300 hover:text-white font-semibold"
              >
                Inspect 12 Folios →
              </Link>
              <button
                onClick={() => {
                  setTourActive(false);
                  addToast({
                    type: 'info',
                    title: 'Guided Tour Dismissed',
                    message: 'You can explore all tabs freely.',
                  });
                }}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Dismiss tour"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Bi-Temporal / Case SSE Stale Bar */}
        {isStale && (
          <div className="bg-amber-500 text-white font-medium px-4 py-1.5 text-xs text-center flex items-center justify-center gap-2 animate-pulse shadow-xs z-30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Data changed, updating in background...</span>
          </div>
        )}

        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-semibold text-navy">
                  {caseTitle}
                </h1>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
                  {activeCaseId}
                </span>
                {scenario === 'disputed' && (
                  <span className="text-xs bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3 text-rose-600" /> Dispute Alert Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Deceased: {deceasedName} • Net Estate: {netValuation}
              </p>
            </div>
          </div>

          {/* Top Bar Right: Agents Active Pill, Language Switcher, Profile */}
          <div className="flex items-center gap-2 md:gap-3">
            <AgentsActivePill variant="detailed" />
            
            <LanguageSwitcher />

            {/* Notification Bell */}
            <button
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Notifications',
                  message: 'You have 2 pending verification actions from LIC and HDFC Bank.',
                })
              }
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-navy transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>

            {/* User Profile Avatar & Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
                aria-label="User profile options"
              >
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
                  alt="Sunita Sharma"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-teal-500/40"
                />
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-navy leading-none">Sunita Sharma</span>
                  <span className="text-[10px] text-slate-400">Primary Claimant</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-navy">Sunita Sharma</p>
                    <p className="text-[11px] text-slate-500">Class-I Primary Legal Heir</p>
                    <p className="text-[10px] text-teal-600 font-mono mt-0.5">{activeCaseId}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowResetConfirm(true);
                      }}
                      className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset demo data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Reset Demo Data Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy">Reset Demo Data?</h3>
                  <p className="text-xs text-slate-500">Restore benchmark case baseline</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                This will reset all asset nominees, added heirs, simulated bank approvals, and documents for{' '}
                <strong className="text-navy">{activeCaseId}</strong> back to the initial benchmark dataset.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-2 transition-colors"
                >
                  {isResetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isResetting ? 'Resetting...' : 'Confirm Reset'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto flex flex-col">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        {/* Disclaimer Footer */}
        <DisclaimerFooter />
      </div>
    </div>
  );
};
