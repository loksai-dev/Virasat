import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Coins,
  Landmark,
  FileCheck2,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Users,
  ChevronRight,
  CheckCircle2,
  Phone,
  Bot,
  Activity,
  Layers,
  Check,
  GitBranch,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useOverview } from '@/api/useOverview';
import { useVirasatStore } from '@/store/useVirasatStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export const OverviewPage: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Overview Dashboard Encountered an Issue">
      <OverviewContent />
    </ErrorBoundary>
  );
};

const OverviewContent: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId } = useParams();
  const { caseId: storeCaseId } = useVirasatStore();
  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  const { data, isLoading, error, isNotFound, refetch, loadOfflineFallback } = useOverview(activeCaseId);

  // Hover state for interactive Sankey flow
  const [hoveredHeir, setHoveredHeir] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  // =========================================================================
  // STATE 1: LOADING STATE
  // =========================================================================
  if (isLoading) {
    return <OverviewSkeleton />;
  }

  // =========================================================================
  // STATE 5: NOT FOUND STATE (Case does not exist)
  // =========================================================================
  if (isNotFound) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8 stroke-[1.75]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-navy">
            Case Not Found
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            We couldn't locate an active estate settlement case with ID{' '}
            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {activeCaseId}
            </span>
            . It may have expired or been removed.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/demo"
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm"
          >
            Launch Benchmark Demo Case
          </Link>
          <Link
            to="/case/start"
            className="px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white font-semibold text-sm transition-all shadow-sm"
          >
            Start New Case Wizard
          </Link>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: FRIENDLY ERROR STATE (API Failure with Retry & Offline Fallback)
  // =========================================================================
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8 stroke-[1.75]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-navy">
            Unable to Synchronize Case Overview
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {error.message || 'A network or authentication interruption occurred while retrieving estate data.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
          <button
            type="button"
            onClick={() => loadOfflineFallback()}
            className="px-4 py-2.5 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold text-sm transition-colors"
          >
            Load Offline Benchmark Data
          </button>
          <Link
            to="/dev/api-status"
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Check API Health
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <OverviewSkeleton />;
  }

  const {
    deceased,
    caseId,
    status,
    familyConsent,
    kpis,
    assetCategories = [],
    nextBestActions = [],
    sankeyData,
    familyTreeNodes = [],
    recentActivity = [],
    amberAlert,
  } = data;

  const handleDonutClick = (entry: any) => {
    const categoryName = entry?.category || entry?.name || 'Banking';
    navigate(`/assets?type=${encodeURIComponent(categoryName)}`);
  };

  // =========================================================================
  // STATE 4: EMPTY STATE (Case exists but has zero assets and unindexed heirs)
  // =========================================================================
  const isEmptyCase =
    (kpis?.assetsFound?.count === 0 || kpis?.assetsFound?.count === undefined) &&
    assetCategories.length === 0 &&
    (!sankeyData?.heirs || sankeyData.heirs.length === 0);

  if (isEmptyCase) {
    return (
      <div className="space-y-8 pb-20 max-w-7xl mx-auto text-left relative">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1F3A] via-[#102A4E] to-[#0B1F3A] p-6 md:p-8 rounded-virasat text-white shadow-elevated border border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-semibold bg-white/10 text-teal-300 border border-teal-400/30 px-3 py-1 rounded-full">
                CASE {caseId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-2">
                Estate Settlement of {deceased?.name || 'Deceased Propositus'}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/80 font-sans">
                Initialized case workspace • Awaiting document intake & agent discovery
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/40">
              {status}
            </span>
          </div>
        </div>

        {/* Empty State Action Card */}
        <EmptyState
          icon={Layers}
          title="No Estate Assets or Heirs Ingested Yet"
          description="This case has been created in Google Cloud Spanner. You can upload municipal death certificates and bank passbooks, or launch the autonomous agent mesh to locate asset folios across simulated institutional gateways."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to={`/case/${caseId}/agents`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm"
              >
                <Bot className="w-4 h-4" />
                <span>Launch Autonomous Agents</span>
              </Link>
              <Link
                to={`/case/${caseId}/documents`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white font-semibold text-sm transition-all shadow-sm"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Upload Documents</span>
              </Link>
              <Link
                to={`/case/${caseId}/start`}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
              >
                Case Intake Wizard
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  // =========================================================================
  // STATE 2: FULL WORKING OVERVIEW PAGE (When valid data is returned)
  // =========================================================================
  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto text-left relative">
      {/* ========================================================================= */}
      {/* TOP HEADER: Deceased Info, Case ID, Status Chip & Family Consent Indicator */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1F3A] via-[#102A4E] to-[#0B1F3A] p-6 md:p-8 rounded-virasat text-white shadow-elevated border border-slate-700/60">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Meta Row: Case ID, Status Chip & Family Consent */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono font-semibold bg-white/10 text-teal-300 border border-teal-400/30 px-3 py-1 rounded-full">
                CASE {caseId}
              </span>

              {/* Status Chip */}
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/40">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>{status}</span>
              </span>

              {/* Family Consent: Indicator */}
              <button
                type="button"
                onClick={() => setShowConsentModal(!showConsentModal)}
                className="group inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 transition-colors"
                title="Click to view heir consent details"
              >
                <div className="flex items-center -space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <span>
                  Family consent: <strong>{familyConsent?.completed ?? 0} of {familyConsent?.total ?? 0}</strong>
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Deceased Name & Reassuring Subtext */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                Estate Settlement of {deceased?.name || 'Late Ramesh Sharma'}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/80 font-sans mt-1">
                {deceased?.birthYear && deceased?.deathYear ? `${deceased.birthYear}–${deceased.deathYear} • ` : ''}
                {deceased?.occupation ? `${deceased.occupation} • ` : ''}
                {deceased?.city && deceased?.state ? `${deceased.city}, ${deceased.state} • ` : ''}
                PAN: <span className="font-mono">{deceased?.pan || 'Verified'}</span>
              </p>
            </div>
          </div>

          {/* Right Care Concierge Card */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center gap-3.5">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Care Specialist Aditi Varma"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-400 shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="text-[11px] text-teal-300 font-medium">Your Dedicated Care Concierge</span>
              <span className="text-sm font-semibold text-white">Aditi Varma</span>
              <a
                href="tel:+914068219000"
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 mt-0.5"
              >
                <Phone className="w-3 h-3 text-teal-300" />
                <span>+91 40 6821 9000</span>
              </a>
            </div>
          </div>
        </div>

        {/* Consent Details Dropdown if Toggled */}
        {showConsentModal && (
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {(familyConsent?.heirs || []).map((h, i) => (
              <div
                key={i}
                className="bg-navy-surface/80 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{h.name}</div>
                  <div className="text-[11px] text-slate-300">{h.relation}</div>
                </div>
                {h.consented ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-medium bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Check className="w-3 h-3 stroke-[2.5]" /> Consented
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: FIVE KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Estate Value */}
        <div className="p-5 rounded-virasat bg-gradient-to-br from-white via-amber-50/20 to-amber-50/50 border border-amber-200/80 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {kpis?.estateValue?.label || 'Net Estate Value'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Coins className="w-4 h-4 text-[#C9A227]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#C9A227] tracking-tight">
            {kpis?.estateValue?.amount || '₹0'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis?.estateValue?.grossInfo || 'Verified statutory valuation'}
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
            <span>Verified Vault</span>
          </div>
        </div>

        {/* KPI 2: Assets Found */}
        <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assets Found
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-navy tracking-tight">
            {kpis?.assetsFound?.count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis?.assetsFound?.subtitle || 'Verified institutional folios'}
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            <span>100% Located</span>
          </div>
        </div>

        {/* KPI 3: Claims Filed */}
        <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Claims Filed
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-navy tracking-tight">
            {kpis?.claimsFiled?.display || '0 of 0'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Scheduled across institutions
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
            <span>{kpis?.claimsFiled?.percentage ?? 0}% Disbursed</span>
          </div>
        </div>

        {/* KPI 4: Estimated Settlement */}
        <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Est. Settlement
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-navy tracking-tight">
            {kpis?.estimatedSettlement?.days ?? 21} days
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{kpis?.estimatedSettlement?.comparison || 'Accelerated resolution'}</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 truncate">
            {kpis?.estimatedSettlement?.benchmark || 'vs traditional manual benchmark'}
          </div>
        </div>

        {/* KPI 5: Risk Score */}
        <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Risk Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-sans text-navy tracking-tight">
            {kpis?.riskScore?.level || 'LOW'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis?.riskScore?.status || 'Verified Clear'}
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            <span>{kpis?.riskScore?.confidence || '99.4% AI Confidence'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: LEFT Donut Chart | RIGHT Next Best Actions */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Donut Chart "Estate by asset type" */}
        <div className="lg:col-span-7 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-navy">
                  Estate by asset type
                </h2>
                <p className="text-xs text-slate-500">
                  Click any slice to inspect portfolio folios and institutions
                </p>
              </div>
              <Link
                to={`/case/${caseId}/assets`}
                className="text-xs font-semibold text-teal-700 hover:text-navy flex items-center gap-1 transition-colors"
              >
                <span>View all assets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Donut and Legend Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-2">
              {/* Donut Chart Container */}
              <div className="sm:col-span-6 h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={handleDonutClick}
                      cursor="pointer"
                    >
                      {assetCategories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(_val: any, _name: any, item: any) => [
                        `${item?.payload?.formatted} (${item?.payload?.percentage}%)`,
                        item?.payload?.name,
                      ]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Net Estate
                  </span>
                  <span className="text-xl font-bold font-sans text-navy">
                    {kpis?.estateValue?.amount || '₹0'}
                  </span>
                  <span className="text-[10px] text-teal-600 font-medium">
                    {kpis?.assetsFound?.count ?? 0} Folios
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="sm:col-span-6 space-y-2">
                {assetCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDonutClick(cat)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-xs text-left group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-slate-700 truncate group-hover:text-teal-700">
                        {cat.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-semibold text-navy font-mono">
                        {cat.formatted}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {cat.percentage}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Reconciled with Banking, CAMS, and EPFO Gateways</span>
            <span
              className="text-teal-700 font-semibold cursor-pointer hover:underline"
              onClick={() => navigate(`/case/${caseId}/assets`)}
            >
              Filter in Assets view →
            </span>
          </div>
        </div>

        {/* Right: Next Best Actions */}
        <div className="lg:col-span-5 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-navy">
                    Next best actions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Prioritized AI settlement directives
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                AI Orchestrated
              </span>
            </div>

            {/* Prioritized AI Tasks */}
            <div className="space-y-3">
              {nextBestActions.map((task, idx) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-teal-300 hover:shadow-xs transition-all space-y-2 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        idx === 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : idx === 1
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {task.agent}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-navy font-sans leading-tight">
                    {task.title}
                  </h3>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    {task.description}
                  </p>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(task.route)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy hover:bg-navy-light text-white transition-all shadow-xs"
                    >
                      <span>{task.actionText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Autonomous agent pipeline active</span>
            <Link to={`/case/${caseId}/agents`} className="text-teal-700 font-semibold hover:underline">
              View agent telemetry →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: LEFT Sankey "Estate flow to heirs" | RIGHT Mini family graph */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Sankey "Estate flow to heirs" */}
        <div
          onClick={() => navigate(`/case/${caseId}/heirs/shares`)}
          className="lg:col-span-7 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-navy group-hover:text-teal-700 transition-colors">
                    Estate flow to heirs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Statutory distribution under Section 8 of Hindu Succession Act ({kpis?.estateValue?.amount || '₹2.84 Cr'} net)
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                <span>View share splits</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Visual Sankey Flow Diagram */}
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>Asset Source Buckets</span>
                  <span className="text-teal-700 font-mono">100% Intestate Class-I Allocation</span>
                  <span>Legal Heirs Entitlement</span>
                </div>

                {/* Heirs Distribution Ribbons */}
                <div className="space-y-2.5 pt-1">
                  {(sankeyData?.heirs || []).map((heir) => (
                    <div
                      key={heir.name}
                      onMouseEnter={() => setHoveredHeir(heir.name)}
                      onMouseLeave={() => setHoveredHeir(null)}
                      className={`p-3 rounded-xl border transition-all ${
                        hoveredHeir === heir.name
                          ? 'bg-teal-50 border-teal-300 shadow-xs'
                          : 'bg-white border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: heir.color }}
                          />
                          <span className="font-bold text-navy">{heir.name}</span>
                          <span className="text-[10px] text-slate-400">({heir.relation})</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-navy">
                            {heir.totalAmount >= 10000000
                              ? `₹${(heir.totalAmount / 10000000).toFixed(2)} Cr`
                              : `₹${(heir.totalAmount / 100000).toFixed(2)} Lakh`}
                          </span>
                          <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {heir.sharePercent}%
                          </span>
                        </div>
                      </div>

                      {/* Distribution Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, heir.sharePercent * 2.5)}%`,
                            backgroundColor: heir.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Equal Class-I Statutory Precedence (Spouse, Son, Daughter, Mother)</span>
            <span className="text-teal-700 font-semibold">Open Sankey Shares view →</span>
          </div>
        </div>

        {/* Right: Mini family graph preview */}
        <div
          onClick={() => navigate(`/case/${caseId}/heirs`)}
          className="lg:col-span-5 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-navy group-hover:text-teal-700 transition-colors">
                    Family Graph Preview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Spanner Graph kinship model & verified KYC
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                <span>Full graph</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mini Tree Visualization */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              {/* Deceased Head Node */}
              <div className="flex justify-center">
                <div className="p-2.5 px-4 rounded-2xl bg-navy text-white border border-teal-400/40 shadow-sm flex items-center gap-3">
                  <img
                    src={familyTreeNodes[0]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={familyTreeNodes[0]?.name || deceased?.name || 'Deceased Propositus'}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-teal-400"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold">{familyTreeNodes[0]?.name || deceased?.name || 'Deceased'}</div>
                    <div className="text-[10px] text-teal-300">Deceased Propositus</div>
                  </div>
                </div>
              </div>

              {/* Connecting Tree Lines */}
              <div className="flex justify-center -my-2">
                <div className="w-0.5 h-4 bg-slate-300" />
              </div>

              {/* Children & Surviving Kin Nodes (Horizontal Grid) */}
              <div className="grid grid-cols-2 gap-2.5">
                {familyTreeNodes.slice(1, 5).map((node) => (
                  <div
                    key={node.id}
                    className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2 text-left"
                  >
                    <img
                      src={node.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'}
                      alt={node.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="truncate text-xs">
                      <div className="font-bold text-navy truncate">{node.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{node.relation}</span>
                        <span>•</span>
                        <span className="font-semibold text-teal-700">{node.sharePercent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Excluded Relative Node (if any) */}
              {(() => {
                const excludedNode = familyTreeNodes.find((n) => n.isExcluded);
                if (!excludedNode) return null;
                return (
                  <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs text-rose-900">
                    <div className="flex items-center gap-2">
                      <img
                        src={excludedNode.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'}
                        alt={excludedNode.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-rose-300 grayscale"
                      />
                      <div>
                        <span className="font-bold text-rose-950">{excludedNode.name}</span>
                        <span className="text-[10px] text-rose-700 ml-1.5">({excludedNode.relation} • {excludedNode.classType})</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                      Excluded §8
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified against MeeSeva Family Member Certificate</span>
            <span className="text-teal-700 font-semibold">Open Interactive Tree →</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: LEFT Recent activity timeline | RIGHT Alerts card */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recent Activity Timeline */}
        <div className="lg:col-span-7 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-serif font-bold text-navy">
                Recent activity timeline
              </h2>
              <p className="text-xs text-slate-500">
                Immutable audit trail with cryptographic SHA-256 verification
              </p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
              SHA-256 Verified
            </span>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-3 pt-1">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-teal-200 transition-all text-xs space-y-1 text-left"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-navy flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>{act.action}</span>
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">{act.timestamp}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-snug">
                  {act.details}
                </p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                  <span>Actor: {act.actor} ({act.actorType})</span>
                  <span>Hash: {act.hash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Alerts Card (Amber alert card or Clean card) */}
        <div className="lg:col-span-5 bg-white p-6 md:p-7 rounded-virasat border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-serif font-bold text-navy flex items-center gap-2">
                <span>Active alerts</span>
                {amberAlert ? (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    1 Amber
                  </span>
                ) : (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    All Clear
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Autonomous sentinel anomaly notifications
              </p>
            </div>
          </div>

          {amberAlert ? (
            <div
              onClick={() => navigate(amberAlert.route || `/case/${caseId}/disputes`)}
              className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 shadow-soft hover:shadow-elevated transition-all cursor-pointer text-left space-y-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                      {amberAlert.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-950 font-serif leading-snug group-hover:text-amber-900 transition-colors">
                    {amberAlert.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-amber-900/90 leading-relaxed">
                {amberAlert.description}
              </p>

              <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200 text-[11px] text-amber-950 space-y-1">
                <div className="font-semibold text-amber-900">
                  Statutory Legal Precedence:
                </div>
                <div className="leading-snug text-slate-600">
                  {amberAlert.statutoryBasis}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="underline group-hover:text-navy transition-colors">
                  Resolve in Disputes & Claims →
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Zero Caveats Flagged</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                No adverse claims, conflicting nominee records, or affidavit discrepancies detected. Statutory transmission is clear to proceed.
              </p>
            </div>
          )}

          {/* AI Dispute Sentinel Status Pill */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>AI DisputeGuard Sentinel</span>
            </span>
            <span className="text-emerald-700 font-semibold font-mono text-[11px]">
              Active & Protected
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING "ASK VIRASAT" BUTTON */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => navigate(`/case/${caseId}/ask`)}
          className="group flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-navy hover:bg-[#102A4E] text-white shadow-elevated border border-teal-400/40 hover:border-teal-300 transition-all transform hover:-translate-y-0.5"
          title="Ask Virasat AI anything about this estate case"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400" />
          </div>
          <span className="font-serif font-bold text-sm tracking-wide">
            Ask Virasat
          </span>
          <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40 hidden sm:inline-block">
            AI Assistant
          </span>
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// SKELETON LOADER COMPONENT WHILE ISLOADING IS TRUE
// =========================================================================
function OverviewSkeleton() {
  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto text-left">
      {/* Header Skeleton */}
      <div className="p-8 rounded-virasat bg-slate-100 border border-slate-200 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <Skeleton className="h-9 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>

      {/* 5 KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-5 rounded-virasat bg-white border border-slate-200 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Row 2 Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white p-6 rounded-virasat border border-slate-200 h-80 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
          <div className="flex justify-center pt-8">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
        <div className="lg:col-span-5 bg-white p-6 rounded-virasat border border-slate-200 h-80 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
