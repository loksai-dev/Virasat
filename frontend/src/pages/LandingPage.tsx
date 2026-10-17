import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Users, 
  FileText, 
  Building2, 
  Coins, 
  Scale, 
  Bot, 
  Search, 
  HeartHandshake, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Check, 
  Layers, 
  TrendingUp, 
  FileCheck2, 
  Volume2, 
  History, 
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Award,
  X
} from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AvatarChip } from '@/components/shared/AvatarChip';
import { AgentsActivePill } from '@/components/shared/AgentsActivePill';
import { IsometricHeroCard } from '@/components/shared/IsometricHeroCard';
import { CloudPlatformStrip } from '@/components/brand/CloudLogos';
import { formatINR } from '@/lib/utils';
import { baseCaseData } from '@/mocks/caseData';
import { basePeople } from '@/mocks/peopleData';
import { baseAssets } from '@/mocks/assetsData';
import { baseClaims } from '@/mocks/claimsData';

export const LandingPage: React.FC = () => {
  const [activePreviewTab, setActivePreviewTab] = useState<'graph' | 'sankey' | 'claims'>('graph');
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  useEffect(() => {
    // Idle pre-warm backend and prefetch demo route chunk
    const warmAndPrefetch = () => {
      fetch('/api/health').catch(() => {});
      import('./DemoExperiencePage').catch(() => {});
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(warmAndPrefetch, { timeout: 3000 });
    } else {
      setTimeout(warmAndPrefetch, 1500);
    }
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1F3A] via-[#0E2647] to-[#061325] text-white rounded-3xl mx-4 md:mx-8 mt-4 p-8 md:p-16 border border-navy-light shadow-2xl">
        {/* Soft Gold & Teal Ambient Glows */}
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-teal-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-gold/15 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold tracking-wide shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>AI-POWERED ESTATE SETTLEMENT PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-bold text-white tracking-tight leading-[1.18]">
              When a loved one passes, money shouldn't be another loss.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-sans leading-relaxed">
              Virasat's AI agents find every asset, identify the rightful heirs, and prepare every claim, in days, not months.
            </p>

            {/* Two Hero CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-semibold text-base bg-teal-accent hover:bg-teal-hover text-navy shadow-elevated transition-all transform hover:-translate-y-0.5"
              >
                <span>Try the Live Demo</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <button
                type="button"
                onClick={() => setStoryModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-semibold text-base bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                </div>
                <span>Watch 3-min Story</span>
              </button>
            </div>

            {/* Quick Hero Micro-Proof */}
            <div className="pt-6 border-t border-navy-light/60 flex items-center gap-6 flex-wrap text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>₹2.84 Cr Sharma Estate Live Demo</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Hindu Succession Act Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Zero Legal Jargon</span>
              </div>
            </div>
          </div>

          {/* Right Column: Isometric 3D Angled Floating Card (5 cols) */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <IsometricHeroCard />
          </div>
        </div>
      </section>

      {/* 3. Trust Strip */}
      <section className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-soft p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Enterprise Infrastructure
              </div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-navy mt-0.5">
                Built on Google Cloud
              </h2>
            </div>
            <div className="text-xs text-slate-500 max-w-md">
              Informed by public RBI and IRDAI claim-settlement guidance. Guidance, not legal advice.
            </div>
          </div>

          <CloudPlatformStrip />

          {/* 3 Core Trust Badges */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100">
            <div className="flex items-center gap-3 text-xs text-slate-700">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-navy font-semibold">Encrypted Vault</strong>
                <span className="text-slate-500 text-[11px]">Encrypted at rest on Google Cloud. SHA-256 hash-chained audit log.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-700">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-navy font-semibold">Human-Approved</strong>
                <span className="text-slate-500 text-[11px]">Family executor controls every signoff</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-700">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-navy font-semibold">Audit-Ready</strong>
                <span className="text-slate-500 text-[11px]">Tamper-evident audit trail & cryptographic verification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem Section (id="impact") */}
      <section id="impact" className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            The Hidden Crisis
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
            The Agony of Traditional Estate Settlement in India
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            When a provider passes away, grieving families must confront an intimidating maze of bureaucracy, lost accounts, and contradictory bank demands.
          </p>
        </div>

        {/* 3 Large Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <Clock className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-sans text-rose-700 tabular-nums">
                14 - 18 Months
              </div>
              <h3 className="text-lg font-serif font-semibold text-navy mt-1">
                Months of Paperwork
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Surviving spouses and elderly parents spend over a year making 24+ physical visits between banks, revenue offices, sub-registrars, and notaries while enduring profound emotional grief.
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Building2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-sans text-amber-700 tabular-nums">
                7+ Institutions
              </div>
              <h3 className="text-lg font-serif font-semibold text-navy mt-1">
                Scattered per Family
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every bank, mutual fund registrar, and insurer requires conflicting forms, custom indemnity bonds, and separate succession certificates. One missing folio can stall probate indefinitely.
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Coins className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-sans text-teal-700 tabular-nums">
                ₹1.8 Lakh+ Cr
              </div>
              <h3 className="text-lg font-serif font-semibold text-navy mt-1">
                Thousands of Crores Unclaimed
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Billions in Indian life savings remain abandoned in dormant bank accounts, unclaimed EPFO balances, and forgotten mutual funds simply because surviving heirs don't know they exist.
            </p>
          </div>
        </div>

        {/* Placeholder Citation Note */}
        <div className="text-center">
          <p className="text-[11px] text-slate-400 italic">
            * Data Sources: RBI Annual Reports on Unclaimed Deposits (DEA Fund), Investor Education and Protection Fund Authority (IEPFA), and IRDAI Life Insurance Annual Statistics. (Formal citations documented in regulatory filing).
          </p>
        </div>
      </section>

      {/* 5. How It Works (id="how-it-works") */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Clear 4-Step Process
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
            How Virasat Settles an Estate with Dignity and Speed
          </h2>
          <p className="text-slate-600 text-sm">
            We replace weeks of confusion with a guided, transparent sequence powered by autonomous agents.
          </p>
        </div>

        {/* 4-Step Horizontal Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-bold text-slate-300">01</span>
            </div>
            <h3 className="text-base font-serif font-bold text-navy">
              Upload Certificate
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload death certificate or probate copy. Virasat cryptographically validates municipal registry seals and document integrity in seconds.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-bold text-slate-300">02</span>
            </div>
            <h3 className="text-base font-serif font-bold text-navy">
              Agents Discover Assets
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Autonomous agents reconcile PAN, Aadhaar, and CAMS/EPFO feeds across 100+ institutions to map bank accounts, demat folios, and land titles.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-bold text-slate-300">03</span>
            </div>
            <h3 className="text-base font-serif font-bold text-navy">
              Legal Heirs Verified
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Spanner Graph resolves statutory Class-I heirs under Hindu Succession Act. Digital KYC, mutual waivers, and NOCs are executed via Aadhaar OTP e-Sign.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-bold text-slate-300">04</span>
            </div>
            <h3 className="text-base font-serif font-bold text-navy">
              Claims Prepared & Tracked
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Auto-fills bank-specific transmission packets, indemnity deeds, and discharge vouchers with live SLA updates until money reaches the heirs.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Feature Grid (id="product") (6 Cards) */}
      <section id="product" className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Intelligent Agent Mesh
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
            Engineered for Precision, Empathy, and Law
          </h2>
          <p className="text-slate-600 text-sm">
            Six specialized AI subsystems built to handle the entire estate settlement lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Asset Discovery Agent
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reconciles PAN, UAN, and depository registers across CAMS, KFintech, CDSL, and banks to trace hidden or forgotten assets within 24 hours.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Legal Eligibility Graph
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Graph-based legal reasoning that models Indian succession laws (Hindu Succession Act, Indian Succession Act) to determine exact heirship priority.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Claim Packet Auto-fill
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero repetitive manual forms. Automatically generates bank transmission packets, Annexure-A, Form 3783, and franked indemnity bonds.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Fraud & Dispute Shield
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI DisputeGuard detects unnotarized or conflicting claims, verifies signature variations, and drafts statutory Section 8 precedence defenses.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Multilingual Voice Guide
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Warm conversational assistant in English, हिंदी, and తెలుగు that explains legal terms in plain language, designed especially for elderly relatives.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all space-y-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-navy">
              Time-Aware Records (Bi-Temporal)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dual-timestamped audit ledger recording both the real-world occurrence and platform cryptographic validation for undisputed court/bank proof.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Interactive Preview (Tabbed Screenshots / Interactive Mockups) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Interactive Product Tour
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
            Explore Virasat in Action
          </h2>
          <p className="text-slate-600 text-sm">
            Toggle between core platform views from Late Ramesh Sharma's live settlement case.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm gap-1">
            <button
              onClick={() => setActivePreviewTab('graph')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activePreviewTab === 'graph'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Family & Legal Graph
            </button>
            <button
              onClick={() => setActivePreviewTab('sankey')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activePreviewTab === 'sankey'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Asset Flow Sankey
            </button>
            <button
              onClick={() => setActivePreviewTab('claims')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activePreviewTab === 'claims'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Claims Hub & Tracking
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-elevated p-6 md:p-8 transition-all">
          {activePreviewTab === 'graph' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-navy">
                    Kinship Succession Hierarchy • VR-2026-0142
                  </h3>
                  <p className="text-xs text-slate-500">
                    Spanner Graph engine modeling Section 8 Class-I statutory precedence
                  </p>
                </div>
                <StatusBadge label="4 Class-I Heirs Verified" variant="success" />
              </div>

              {/* Visual Node Graph Simulation */}
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-6">
                {/* Root Deceased Node */}
                <div className="flex justify-center">
                  <div className="p-4 rounded-2xl bg-navy text-white shadow-md text-center max-w-xs w-full border border-teal-400/40">
                    <div className="text-[10px] text-teal-300 font-mono uppercase">Deceased (1958 - 2026)</div>
                    <div className="text-base font-serif font-bold">Ramesh Sharma</div>
                    <div className="text-xs text-slate-300">Intestate • Hyderabad</div>
                  </div>
                </div>

                {/* Connecting Line */}
                <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

                {/* Heirs Level */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {basePeople.slice(0, 4).map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
                      <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full mx-auto object-cover" />
                      <div className="text-xs font-bold text-navy">{p.name}</div>
                      <div className="text-[10px] text-teal-700 font-semibold">{p.relationship} • {p.legalHeirClass}</div>
                      <div className="text-xs font-mono font-bold text-navy pt-1 border-t border-slate-100">
                        {p.assignedSharePercentage}% Share
                      </div>
                    </div>
                  ))}
                </div>

                {/* Class-II Disputed Relative Flag */}
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Vikram Sharma (Brother, Class-II Relative): Claim excluded by Class-I precedence rule.</span>
                  </div>
                  <span className="font-semibold text-rose-700 text-[11px] underline cursor-pointer">
                    Inspect AI Rebuttal
                  </span>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'sankey' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-navy">
                    Estate Flow & Liability Deductions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mathematical reconciliation: ₹3.12 Cr gross less ₹28L home loan = ₹2.84 Cr net
                  </p>
                </div>
                <div className="text-sm font-bold font-sans text-navy">
                  Net Estate: <span className="text-teal-700">₹2.84 Cr</span>
                </div>
              </div>

              {/* Sankey Flow Visual Bars */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-navy">Real Estate (Jubilee Hills Flat)</span>
                    <strong className="font-mono text-navy">₹1.40 Cr</strong>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-navy rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-navy">Equity & Mutual Funds (Zerodha + SBI MF)</span>
                    <strong className="font-mono text-teal-700">₹70.0 Lakhs</strong>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-accent rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-navy">Retirement & Insurance (EPF + PPF + LIC)</span>
                    <strong className="font-mono text-blue-700">₹74.0 Lakhs</strong>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-rose-700">Deduction: HDFC Home Loan Liability</span>
                    <strong className="font-mono text-rose-700">-₹28.0 Lakhs</strong>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '9%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'claims' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-navy">
                    Claims Transmission Dockets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct institution integration across SBI, HDFC, ICICI, LIC, EPFO & Zerodha
                  </p>
                </div>
                <Link to="/demo" className="text-xs font-semibold text-teal-700 hover:underline">
                  Open live claims workspace →
                </Link>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {baseClaims.slice(0, 4).map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-navy">{c.assetName}</div>
                      <div className="text-slate-400 text-[11px]">{c.institutionName} • Docket {c.referenceDocketNo}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono font-bold text-navy">
                        {formatINR(c.amount)}
                      </div>
                      <StatusBadge label={c.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Viewing Case VR-2026-0142 live data</span>
            <Link
              to="/demo"
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900"
            >
              <span>Launch Full Interactive Case</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Two-Sided Value: For Families vs For Banks & Insurers */}
      <section id="for-banks" className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Two-Sided Ecosystem
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
            Value for Families. Velocity for Financial Institutions.
          </h2>
          <p className="text-slate-600 text-sm">
            Bridging the emotional needs of bereaved survivors with the stringent compliance requirements of enterprise operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: For Families */}
          <div className="p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-navy">For Grieving Families</h3>
                <p className="text-xs text-slate-500">Dignity, simplicity, and financial protection</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>No legal touts or broker commissions:</strong> Transparent guidance replaces predatory tout fees.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>28-day settlement timeline:</strong> Slashes traditional 14-month probate delays by over 90%.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>1 branch visit only:</strong> Physical visits required solely for safe deposit lockers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>Plain-English explanations:</strong> No legal mumbo-jumbo; clear answers in Hindi, Telugu, or English.</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold font-sans text-teal-700">94%</div>
                <div className="text-[10px] text-slate-500">Faster Closure</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold font-sans text-teal-700">₹1.85 L</div>
                <div className="text-[10px] text-slate-500">Avg Fees Saved</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold font-sans text-teal-700">1 Visit</div>
                <div className="text-[10px] text-slate-500">Locker Only</div>
              </div>
            </div>
          </div>

          {/* Right: For Banks & Insurers */}
          <div className="p-8 rounded-virasat bg-navy text-white border border-navy-light shadow-soft space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-300 border border-white/20 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white">For Banks & Insurers</h3>
                <p className="text-xs text-slate-300">Automated STP, fraud defense & SLA compliance</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>82.5% Straight-Through Processing (STP):</strong> Ingestion directly into Core Banking (CBS).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>5.4-day turnaround time:</strong> Complies effortlessly with RBI deceased claim SLAs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>100% Cryptographic verification:</strong> Eliminates paper forgery with tamper-evident SHA-256 audit trails and graph integrity.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <span><strong>Dedicated ops console:</strong> Instant queue review, risk scoring, and one-click approvals.</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-navy-light/80 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-navy-surface border border-navy-light/60">
                <div className="text-lg font-bold font-sans text-amber-300">95.8%</div>
                <div className="text-[10px] text-slate-400">SLA Adherence</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-surface border border-navy-light/60">
                <div className="text-lg font-bold font-sans text-amber-300">5.4 Days</div>
                <div className="text-[10px] text-slate-400">Avg TAT</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-surface border border-navy-light/60">
                <div className="text-lg font-bold font-sans text-amber-300">₹4.82 Cr</div>
                <div className="text-[10px] text-slate-400">MTD Settled</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Security & Privacy Section (id="security") */}
      <section id="security" className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        <div className="rounded-virasat bg-gradient-to-r from-slate-900 via-navy to-slate-900 text-white p-8 md:p-12 border border-slate-700 shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-700/80 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-teal-300 text-xs font-semibold">
                <Lock className="w-4 h-4" />
                <span>BANK-GRADE CRYPTOGRAPHY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Security, Privacy, and Sovereign Consent
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                Estate data is deeply personal. Virasat is built with non-negotiable security guarantees.
              </p>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Lock className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-base font-serif font-semibold text-white">
                Encrypted Vault
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                All death certificates, succession orders, and identity dockets are encrypted with AES-256 at rest and TLS 1.3 in transit with SHA-256 hash-chained integrity verification.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-base font-serif font-semibold text-white">
                Explicit Heir Consent Flow
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Zero data is transmitted to third parties without multi-party Aadhaar OTP consensus from verified legal heirs. Family members retain full data sovereignty.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-base font-serif font-semibold text-white">
                Immutable Audit Trail
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every agent inspection, form creation, and bank acknowledgement is logged into an immutable cryptographic docket admissible under Indian Evidence Act Section 65B.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Testimonial Story Card ("The Sharma Family") */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
        <div className="p-8 md:p-12 rounded-virasat bg-white border border-slate-200/90 shadow-elevated space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                alt="Arjun Sharma"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/40"
              />
              <div>
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                  Real Case Simulation
                </span>
                <h3 className="text-xl font-serif font-bold text-navy">
                  The Sharma Family • Hyderabad
                </h3>
                <div className="text-xs text-slate-500">
                  Late Ramesh Sharma Estate (VR-2026-0142) • Handled by Arjun & Sunita Sharma
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold">
                Estate Settled in 28 Days
              </span>
            </div>
          </div>

          {/* Testimonial Quote */}
          <blockquote className="text-base md:text-lg font-serif italic text-navy leading-relaxed max-w-4xl">
            "When my father passed away unexpectedly, my mother and I were staring at 12 accounts across 7 institutions. Banks asked for succession certificates, brokers wanted notarized indemnity forms, and distant relatives contested claims. Virasat organized our entire estate in 48 hours."
          </blockquote>
          <div className="text-xs text-slate-500 font-medium">
            — Arjun Sharma, VP of Engineering & Appointed Family Executor
          </div>

          {/* Before vs After Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Before */}
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase">
                <span>Traditional Indian Process</span>
                <span className="text-rose-600 font-mono">14 - 18 Months</span>
              </div>
              <ul className="space-y-2 text-xs text-rose-900">
                <li>• 24 physical queues across SBI, HDFC, EPFO, and MeeSeva</li>
                <li>• ₹2,10,000 paid to touts, brokers, and affidavits</li>
                <li>• Contradictory nominee vs heir rejections from bank managers</li>
                <li>• Intense emotional strain on 64-year-old surviving mother</li>
              </ul>
            </div>

            {/* After with Virasat */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase">
                <span>With Virasat AI Platform</span>
                <span className="text-emerald-700 font-mono font-bold">28 Days Total</span>
              </div>
              <ul className="space-y-2 text-xs text-emerald-900 font-medium">
                <li>✓ 1 single branch visit (safe deposit locker appraisal only)</li>
                <li>✓ Transparent platform fee; zero intermediary leakages</li>
                <li>✓ Section 8 legal precedence defense rebutting informal claims</li>
                <li>✓ Calm, transparent dashboard accessible 24/7 on family phones</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Final CTA Band */}
      <section className="relative overflow-hidden bg-gradient-to-r from-navy via-navy-surface to-navy text-white rounded-3xl mx-4 md:mx-8 p-10 md:p-16 border border-navy-light shadow-2xl text-center space-y-6">
        {/* Glow Effects */}
        <div className="absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-gold/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE SIMULATION</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
            See Virasat settle an estate in 60 seconds.
          </h2>

          <p className="text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Experience the live interactive simulation of Late Ramesh Sharma's ₹2.84 Cr estate across banking, demat, property, and insurance.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base bg-teal-accent hover:bg-teal-hover text-navy shadow-elevated transition-all transform hover:-translate-y-0.5"
            >
              Try Live Demo
            </Link>

            <Link
              to="/institution"
              className="w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-base bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-colors"
            >
              Explore Bank Console
            </Link>
          </div>
        </div>
      </section>

      {/* Story Video Modal (simulated walkthrough) */}
      {storyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-md">
          <div className="bg-white rounded-virasat max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-teal-700" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-navy">
                    Virasat 3-Minute Story Walkthrough
                  </h3>
                  <div className="text-xs text-slate-500">The Journey of the Sharma Family</div>
                </div>
              </div>
              <button
                onClick={() => setStoryModalOpen(false)}
                className="text-slate-400 hover:text-navy p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Video Placeholder Container with preview cards */}
            <div className="aspect-video bg-navy rounded-xl p-6 flex flex-col justify-between text-white relative overflow-hidden border border-navy-light">
              <div className="absolute inset-0 bg-radial-teal opacity-20 pointer-events-none" />
              <div className="flex justify-between items-start text-xs text-teal-300">
                <span>Part 1: The First 48 Hours</span>
                <span className="bg-teal-500/20 px-2 py-0.5 rounded font-mono">03:14</span>
              </div>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center mx-auto text-teal-300 shadow-glow-teal">
                  <Play className="w-6 h-6 fill-teal-300 ml-1" />
                </div>
                <h4 className="text-lg font-serif font-bold text-white">
                  "How AI reclaimed ₹2.84 Cr for Sunita and Arjun Sharma"
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  From death certificate upload to automated transmission across 7 financial institutions.
                </p>
              </div>

              <div className="flex justify-between items-end text-xs text-slate-400">
                <span>Virasat Care Documentary</span>
                <span>Narrated in English & Hindi</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Ready to experience it directly?
              </div>
              <Link
                to="/demo"
                onClick={() => setStoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy-light"
              >
                Launch Live Interactive Demo →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
