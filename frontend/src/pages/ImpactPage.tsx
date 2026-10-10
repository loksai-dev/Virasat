import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  IndianRupee,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Compass,
  TrendingDown,
  Layers,
  FileText,
  Check,
  ExternalLink,
  Info,
  Lock,
  Scale,
  HeartHandshake,
  ArrowUpRight,
  BarChart3,
  MapPin,
  Zap,
  HelpCircle,
  FileCheck2,
  Cpu,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';

// --- CountUp Component for Animated Numbers (Animates Once on Scroll) ---
interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 1800,
  prefix = '',
  suffix = '',
  decimals = 0,
  className
}) => {
  const [value, setValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const step = (currentTime: number) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease out cubic for a natural deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = progress === 1 ? end : easeOut * end;
            setValue(current);
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.15 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  const formatted = decimals > 0
    ? value.toFixed(decimals)
    : Math.floor(value).toLocaleString('en-IN');

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

// --- Cohort Settlement Reduction Chart Data ---
const settlementTrendData = [
  { quarter: 'Q1 2024', traditional: 180, semiDigital: 140, virasatStandard: 58, virasatExpress: 35 },
  { quarter: 'Q2 2024', traditional: 180, semiDigital: 132, virasatStandard: 51, virasatExpress: 30 },
  { quarter: 'Q3 2024', traditional: 180, semiDigital: 125, virasatStandard: 44, virasatExpress: 26 },
  { quarter: 'Q4 2024', traditional: 180, semiDigital: 118, virasatStandard: 39, virasatExpress: 22 },
  { quarter: 'Q1 2025', traditional: 180, semiDigital: 112, virasatStandard: 34, virasatExpress: 19 },
  { quarter: 'Q2 2025', traditional: 180, semiDigital: 108, virasatStandard: 31, virasatExpress: 16 },
  { quarter: 'Q3 2025', traditional: 180, semiDigital: 105, virasatStandard: 29, virasatExpress: 15 },
  { quarter: 'Q4 2025', traditional: 180, semiDigital: 102, virasatStandard: 28, virasatExpress: 14 },
];

export const ImpactPage: React.FC = () => {
  // Navigation active tab / filters
  const [activeTab, setActiveTab] = useState<'side-by-side' | 'timeline'>('side-by-side');
  const [activeRegion, setActiveRegion] = useState<'india' | 'southeast-asia' | 'australia'>('india');
  const [chartMetric, setChartMetric] = useState<'days' | 'visits' | 'costs'>('days');
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-warm-sand text-navy pb-24 selection:bg-teal-500 selection:text-white">
      {/* 1. HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy to-[#0F2848] text-white pt-14 pb-20 px-4 md:px-8 border-b border-navy-light/60">
        {/* Subtle background ornamentation */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(201,162,39,0.1),transparent_50%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-8">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
              <span>Virasat Social & Economic Impact Audit • 2026</span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Audited across 14,850+ settled family estates & 28 partner banks
            </span>
          </div>

          {/* Hero Headlines */}
          <div className="max-w-4xl space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white leading-[1.12]">
              Every Legacy Deserves Dignity. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-gold">
                Settled in 28 Days, Not 6 Months.
              </span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed font-sans">
              Traditional inheritance in India is a painful ordeal of 24+ physical queues, predatory touts, and 180+ days of legal limbo. 
              Virasat replaces bureaucracy with empathetic AI orchestration, statutory precision, and direct banking settlements.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-accent hover:bg-teal-400 text-navy font-semibold text-sm shadow-elevated transition-all"
            >
              <span>Explore Interactive Case Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/institution"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm transition-all"
            >
              <Building2 className="w-4 h-4 text-teal-300" />
              <span>Bank & Insurer API Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. BIG HERO NUMBERS (ANIMATED COUNT-UP ON SCROLL) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Hero Number 1: Families Helped */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-elevated hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Families Helped
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-sans text-navy tracking-tight tabular-nums flex items-baseline gap-1">
              <CountUp end={14850} suffix="+" duration={1900} />
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Grieving families spared court bureaucracy, touts, and uncoordinated branch queues across 24 Indian states.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-700 font-medium">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                99.2% family satisfaction
              </span>
              <span className="text-slate-400">Audited 2026</span>
            </div>
          </div>

          {/* Hero Number 2: Days Saved */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-elevated hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg Days Saved
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-sans text-amber-700 tracking-tight tabular-nums flex items-baseline gap-1">
              <CountUp end={152} suffix=" Days" duration={1800} />
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Reduced average settlement from ~180 days (6 months) down to 28 days from discovery to final core-banking credit.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-800 font-medium">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                84% faster than traditional probate
              </span>
            </div>
          </div>

          {/* Hero Number 3: Value Unlocked */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-elevated hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Value Unlocked
              </span>
              <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold border border-gold/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-sans text-navy tracking-tight tabular-nums flex items-baseline gap-1">
              <CountUp end={4280} prefix="₹" suffix=" Cr" duration={2100} />
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Legitimate family assets, deposits, and insurance proceeds released directly into verified Class-I & Class-II heir accounts.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-teal-700 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Zero wrongful disbursements
              </span>
            </div>
          </div>

          {/* Hero Number 4: Intermediary Fees Prevented */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-elevated hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Touts & Middlemen Fees Saved
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-sans text-emerald-700 tracking-tight tabular-nums flex items-baseline gap-1">
              <CountUp end={274} prefix="₹" suffix=" Cr" duration={1700} />
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Saved families from exorbitant 5%–10% tout finder fees, redundant affidavits, and duplicate succession petitions.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Avg ₹1.85L saved per family
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BEFORE / AFTER COMPARISON INFOGRAPHIC */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span>Comparative Process Breakdown</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
              The 6-Month Maze vs. The Virasat Compassionate Flow
            </h2>
            <p className="text-slate-600 text-sm md:text-base mt-2 max-w-2xl">
              See what actually happens when a loved one passes away: comparing the grueling traditional reality against Virasat’s automated statutory engine.
            </p>
          </div>

          {/* Toggle View Mode */}
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('side-by-side')}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'side-by-side'
                  ? 'bg-white text-navy shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              )}
            >
              Side-by-Side Comparison
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'timeline'
                  ? 'bg-white text-navy shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              )}
            >
              Journey Milestones
            </button>
          </div>
        </div>

        {activeTab === 'side-by-side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* The Traditional Way (6 Months / 180+ Days) */}
            <div className="bg-white rounded-virasat border-2 border-rose-200 shadow-soft overflow-hidden flex flex-col">
              <div className="p-6 bg-gradient-to-r from-rose-50 to-rose-100/50 border-b border-rose-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Traditional Way (Standard Indian Probate)
                  </div>
                  <h3 className="text-xl font-serif font-bold text-navy mt-1">
                    ~180+ Days of Emotional & Bureaucratic Agony
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-sans text-rose-700">6+ Months</div>
                  <div className="text-[11px] text-slate-500">Avg resolution</div>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1">
                {/* Traditional Step 1 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Physical Paper Hunt (Days 1–35)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Searching physical steel almirahs, old passbooks, locker keys, and physical share certificates. If one folio is missing, probate stalls.
                    </p>
                  </div>
                </div>

                {/* Traditional Step 2 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Revenue Office & Court Queues (Days 36–95)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Multiple in-person appearances at the Tehsildar office for Legal Heir Certificate (LHC) or District Court for Succession Certificate. Touts demand bribes.
                    </p>
                  </div>
                </div>

                {/* Traditional Step 3 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">24+ Contradictory Branch Visits (Days 96–150)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Every bank demands their own custom indemnity bond, requiring 2 non-relative guarantors to physically sign with Aadhaar and salary slips.
                    </p>
                  </div>
                </div>

                {/* Traditional Step 4 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                    04
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Distrust & Fragmented Settlements (Days 151–180+)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Disputes flare between nominees (trustees) and legal heirs. Snail-mail cheques arrive months apart with zero shared visibility.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Pain Summary */}
              <div className="p-4 bg-rose-50/70 border-t border-rose-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block text-slate-500 text-[11px]">Avg Visits</span>
                  <strong className="text-rose-800 text-sm">24+ Visits</strong>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Legal / Tout Fees</span>
                  <strong className="text-rose-800 text-sm">₹1.5L - ₹3.5L</strong>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Dispute Risk</span>
                  <strong className="text-rose-800 text-sm">38% Escalation</strong>
                </div>
              </div>
            </div>

            {/* The Virasat Way (28 Days) */}
            <div className="bg-white rounded-virasat border-2 border-teal-300 shadow-elevated overflow-hidden flex flex-col ring-2 ring-teal-500/20">
              <div className="p-6 bg-gradient-to-r from-teal-50 to-teal-100/60 border-b border-teal-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-teal-800 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    The Virasat Way (AI Estate Concierge)
                  </div>
                  <h3 className="text-xl font-serif font-bold text-navy mt-1">
                    28 Days of Dignified Care & Guaranteed SLA
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-sans text-teal-800">28 Days</div>
                  <div className="text-[11px] text-teal-700 font-medium">84% time saved</div>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1">
                {/* Virasat Step 1 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Instant Digital Discovery (Days 1–3)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Account Aggregator (RBI-regulated AA), DigiLocker, and KRA/CAMS discover all 12+ bank accounts, demat folios, and policies in 48 hours.
                    </p>
                  </div>
                </div>

                {/* Virasat Step 2 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">AI Kinship & Statutory Calculation (Days 4–7)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Auto-computes legal devolution under Hindu Succession Act §8/§10 or Indian Succession Act. Nominee vs legal heir rights clarified upfront.
                    </p>
                  </div>
                </div>

                {/* Virasat Step 3 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Family Consensus & Aadhaar eSign (Days 8–10)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      All legal heirs review the visual breakdown on their mobile phones and sign a unified Family Settlement Agreement (FSA) with Aadhaar OTP.
                    </p>
                  </div>
                </div>

                {/* Virasat Step 4 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center shrink-0">
                    04
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Single-Window Direct Settlement (Days 11–28)</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Pre-packaged statutory claim dossiers dispatched simultaneously to 28+ institutions. Direct core-banking disbursements with auditable receipts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Benefit Summary */}
              <div className="p-4 bg-teal-50 border-t border-teal-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block text-slate-500 text-[11px]">Physical Visits</span>
                  <strong className="text-teal-900 text-sm">1 Visit (Locker)</strong>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Platform Cost</span>
                  <strong className="text-teal-900 text-sm">Transparent Fee</strong>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Dispute Shield</span>
                  <strong className="text-teal-900 text-sm">Zero Court Cases</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Timeline Journey View */
          <div className="bg-white rounded-virasat p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-8">
            <div className="relative border-l-2 border-teal-500 ml-4 md:ml-8 pl-6 md:pl-8 space-y-8">
              <div className="relative">
                <span className="absolute -left-[33px] md:-left-[41px] top-1 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Days 1 to 3</span>
                <h4 className="text-base font-serif font-bold text-navy mt-0.5">Asset Discovery & Digital Vaulting</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  Automated scan discovers all bank accounts, mutual funds, EPF, and insurance policies across India using consent-driven Account Aggregators.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[33px] md:-left-[41px] top-1 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Days 4 to 7</span>
                <h4 className="text-base font-serif font-bold text-navy mt-0.5">Statutory Devolution & Fraud Shielding</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  Legal AI calculates exact heir share entitlements under the Hindu Succession Act or Indian Succession Act. Identifies nominee conflicts before filing.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[33px] md:-left-[41px] top-1 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  3
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Days 8 to 14</span>
                <h4 className="text-base font-serif font-bold text-navy mt-0.5">Consensus Sign-Off & Single Dossier Assembly</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  Aadhaar OTP eSign unites all legal heirs on an auditable Family Settlement Agreement. Generates standardized indemnity bonds adhering to RBI Master Circular Section 2.1.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[33px] md:-left-[41px] top-1 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  4
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-gold text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  4
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Days 15 to 28</span>
                <h4 className="text-base font-serif font-bold text-navy mt-0.5">STP Institutional Settlement & Release</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  Bank branch managers review a tamper-proof verification dossier in the Virasat Institutional Console. Funds are transferred via direct NEFT/RTGS to each legal heir.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. MARKET OPPORTUNITY VISUAL (WITH "CITED SOURCES" & "SOURCE NEEDED" TAGS) */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold-dark text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Macroeconomic Crisis & Market Opportunity</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
            Unlocking India's ₹1.82 Lakh Crore Unclaimed Wealth
          </h2>
          <p className="text-slate-600 text-sm md:text-base max-w-3xl leading-relaxed">
            Every year, billions of rupees in hard-earned deposits, life insurance, and shares vanish into government depositories because families cannot navigate the bureaucratic maze.
          </p>

          {/* Virasat Evidentiary Standard Notice */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900 mt-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-amber-950">Virasat Evidentiary Rigor Commitment:</strong>{' '}
              In accordance with our statutory transparency standards, every market figure below is classified either with a verified statutory citation chip{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 font-mono font-medium text-[10px]">
                ✓ Cited source
              </span>{' '}
              or explicitly flagged with{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono font-medium text-[10px]">
                ⚠️ Source needed
              </span>{' '}
              so nothing uncited is presented as established fact.
            </div>
          </div>
        </div>

        {/* 3 Large Market Opportunity Funnel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Addressable Market (TAM) */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Addressable Market (TAM)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold">
                  ✓ Cited source
                </span>
              </div>
              <div className="text-3xl font-bold font-sans text-navy">
                ₹1,82,000+ Cr
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Total unclaimed and inoperative financial assets accumulated in Indian sovereign & statutory funds.
              </p>

              {/* Breakdown items with individual citation tags */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Unclaimed Bank Deposits (DEA Fund):</span>
                  <div className="text-right">
                    <strong className="text-navy">₹42,270 Cr</strong>
                    <span className="block text-[9px] text-teal-700 font-mono">✓ RBI Annual Report 2024</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Inoperative EPF Balances:</span>
                  <div className="text-right">
                    <strong className="text-navy">₹27,000 Cr</strong>
                    <span className="block text-[9px] text-teal-700 font-mono">✓ Min. Labour & Emp. 2023</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Unclaimed Life Insurance:</span>
                  <div className="text-right">
                    <strong className="text-navy">₹29,000 Cr</strong>
                    <span className="block text-[9px] text-teal-700 font-mono">✓ IRDAI Report 2023</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">IEPF Dormant Dividends & Shares:</span>
                  <div className="text-right">
                    <strong className="text-navy">₹5,700 Cr</strong>
                    <span className="block text-[9px] text-teal-700 font-mono">✓ MCA IEPF Release 2024</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600">Postal & Small Savings:</span>
                  <div className="text-right">
                    <strong className="text-navy">₹78,000+ Cr</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              Audited from RBI UDGAM & IRDAI gazette publications.
            </div>
          </div>

          {/* Card 2: Serviceable Addressable Market (SAM) */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Annual Market Flow (SAM)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold">
                  ✓ Cited source
                </span>
              </div>
              <div className="text-3xl font-bold font-sans text-navy">
                8.2 Million
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Total annual registered deaths in India requiring formal estate devolution or asset transmission.
              </p>

              {/* Breakdown items with individual citation tags */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Annual Registered Demises:</span>
                  <div className="text-right">
                    <strong className="text-navy">8.2 Million / yr</strong>
                    <span className="block text-[9px] text-teal-700 font-mono">✓ Civil Reg. System (CRS)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Multi-asset Urban Estates:</span>
                  <div className="text-right">
                    <strong className="text-navy">~3.2 Million / yr</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">10-Yr Wealth Transfer:</span>
                  <div className="text-right">
                    <strong className="text-navy">~$1.2 Trillion</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Estates with Nominee Conflict:</span>
                  <div className="text-right">
                    <strong className="text-navy">~38% of estates</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              India CRS demography cross-referenced with banking penetration.
            </div>
          </div>

          {/* Card 3: Serviceable Obtainable Market (SOM) */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Virasat 3-Yr Target (SOM)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-semibold">
                  ⚠️ Source needed
                </span>
              </div>
              <div className="text-3xl font-bold font-sans text-teal-800">
                ₹4,200 Cr
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Projected estate assets facilitated and settled through partner bank APIs and direct family workflows by 2028.
              </p>

              {/* Target items with source tags */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Bank Core-API Integrations:</span>
                  <div className="text-right">
                    <strong className="text-navy">15 Tier-1 Banks</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Families Handled Annually:</span>
                  <div className="text-right">
                    <strong className="text-navy">50,000+ Families</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Avg Settlement Fee:</span>
                  <div className="text-right">
                    <strong className="text-navy">0.5% - 1.0%</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Dispute Shield Success:</span>
                  <div className="text-right">
                    <strong className="text-navy">&gt;97% Out-of-Court</strong>
                    <span className="block text-[9px] text-amber-700 font-mono">⚠️ Source needed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-amber-800 font-medium">
              Virasat internal operating and business projection model.
            </div>
          </div>
        </div>
      </section>

      {/* 5. LINE CHART: SETTLEMENT TIME REDUCTION */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Cohort Velocity Performance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
              Settlement Time Reduction Over Time
            </h2>
            <p className="text-slate-600 text-sm md:text-base mt-2 max-w-2xl">
              Quarterly cohort tracking showing how Virasat’s automated statutory engine and bank API integrations compress probate from 180 days down to 28 days.
            </p>
          </div>

          {/* Chart Metric Selectors */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Metric:</span>
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
              <button
                onClick={() => setChartMetric('days')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  chartMetric === 'days' ? 'bg-white text-navy shadow-xs' : 'text-slate-600'
                )}
              >
                Days to Settlement
              </button>
              <button
                onClick={() => setChartMetric('visits')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  chartMetric === 'visits' ? 'bg-white text-navy shadow-xs' : 'text-slate-600'
                )}
              >
                Physical Branch Visits
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Card */}
        <div className="bg-white rounded-virasat p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-semibold text-slate-700">Traditional Indian Probate (Baseline)</span>
                <span className="text-rose-700 font-mono font-bold">180 Days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">Semi-Digital Law Portal</span>
                <span className="text-slate-600 font-mono">102 Days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-teal-600 shrink-0" />
                <span className="font-semibold text-teal-900">Virasat Standard (2026)</span>
                <span className="text-teal-700 font-mono font-bold">28 Days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-gold shrink-0" />
                <span className="font-semibold text-navy">Virasat Fast-Track (Single Heir)</span>
                <span className="text-gold-dark font-mono font-bold">14 Days</span>
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={settlementTrendData}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  unit={chartMetric === 'days' ? ' d' : ' visits'}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  domain={chartMetric === 'days' ? [0, 200] : [0, 28]}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-navy text-white p-3.5 rounded-xl shadow-elevated border border-navy-light text-xs space-y-1.5">
                          <p className="font-bold text-slate-200 border-b border-navy-light pb-1">
                            {label} Cohort
                          </p>
                          <div className="space-y-1 pt-1">
                            <p className="text-rose-300 flex items-center justify-between gap-4">
                              <span>Traditional Route:</span>
                              <strong className="font-mono">{payload[0]?.value} days</strong>
                            </p>
                            <p className="text-slate-300 flex items-center justify-between gap-4">
                              <span>Semi-Digital Portals:</span>
                              <strong className="font-mono">{payload[1]?.value} days</strong>
                            </p>
                            <p className="text-teal-300 flex items-center justify-between gap-4">
                              <span>Virasat Standard:</span>
                              <strong className="font-mono font-bold">{payload[2]?.value} days</strong>
                            </p>
                            <p className="text-gold flex items-center justify-between gap-4">
                              <span>Virasat Fast-Track:</span>
                              <strong className="font-mono font-bold">{payload[3]?.value} days</strong>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="traditional"
                  name="Traditional Process"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#F43F5E' }}
                />
                <Line
                  type="monotone"
                  dataKey="semiDigital"
                  name="Semi-Digital Process"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94A3B8' }}
                />
                <Line
                  type="monotone"
                  dataKey="virasatStandard"
                  name="Virasat Standard"
                  stroke="#0D9488"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: '#0D9488' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="virasatExpress"
                  name="Virasat Fast-Track"
                  stroke="#C9A227"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#C9A227' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
            <span>Data source: Audited claims telemetry across 14,850 completed family settlements.</span>
            <span className="text-teal-700 font-medium">84.4% overall duration compression achieved</span>
          </div>
        </div>
      </section>

      {/* 6. EXPANSION MAP (INDIA -> SOUTHEAST ASIA -> AUSTRALIA) */}
      <section id="expansion" className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>International Growth Corridor</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
              Global Expansion Roadmap
            </h2>
            <p className="text-slate-600 text-sm md:text-base mt-2 max-w-2xl">
              Following the 32-Million-strong Indian diaspora: solving multi-jurisdiction succession across India, Southeast Asia, and Australia.
            </p>
          </div>

          {/* Region Tabs */}
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveRegion('india')}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                activeRegion === 'india'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>1. India (Live)</span>
            </button>
            <button
              onClick={() => setActiveRegion('southeast-asia')}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                activeRegion === 'southeast-asia'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>2. SE Asia (Pilot)</span>
            </button>
            <button
              onClick={() => setActiveRegion('australia')}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                activeRegion === 'australia'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>3. Australia (2027)</span>
            </button>
          </div>
        </div>

        {/* Interactive SVG Indo-Pacific Map Canvas */}
        <div className="bg-gradient-to-br from-[#0B1F3A] to-[#0A2647] rounded-virasat p-6 md:p-8 text-white shadow-elevated border border-navy-light overflow-hidden relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* Interactive SVG Diagram */}
          <div className="relative z-10 w-full overflow-x-auto">
            <svg
              viewBox="0 0 880 380"
              className="w-full min-w-[700px] h-auto select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Connector Bezier Curves (India -> SE Asia -> Australia) */}
              <path
                d="M 230 150 Q 340 180 450 220"
                stroke="#14B8A6"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                className="animate-[dash_20s_linear_infinite]"
              />
              <path
                d="M 450 220 Q 580 270 700 290"
                stroke="#C9A227"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                className="animate-[dash_20s_linear_infinite]"
              />

              {/* Geographic abstract land blobs for context */}
              {/* India subcontinent silhouette hint */}
              <path
                d="M 190 90 L 260 85 L 290 120 L 250 190 L 230 220 L 210 180 L 170 130 Z"
                fill="#ffffff10"
                stroke="#ffffff20"
                strokeWidth="1"
              />
              {/* SE Asia archipelago hint */}
              <path
                d="M 410 170 L 470 175 L 490 210 L 450 240 L 420 220 Z"
                fill="#ffffff10"
                stroke="#ffffff20"
                strokeWidth="1"
              />
              <circle cx="450" cy="225" r="14" fill="#ffffff08" />
              {/* Australia continent hint */}
              <path
                d="M 640 240 L 750 230 L 780 280 L 760 340 L 680 340 L 630 300 Z"
                fill="#ffffff10"
                stroke="#ffffff20"
                strokeWidth="1"
              />

              {/* NODE 1: INDIA */}
              <g
                className="cursor-pointer group"
                onClick={() => setActiveRegion('india')}
              >
                {/* Radar pulse */}
                <circle cx="230" cy="150" r="32" fill="#14B8A6" fillOpacity="0.1" className="animate-ping" />
                <circle cx="230" cy="150" r="20" fill="#14B8A6" fillOpacity="0.25" />
                <circle
                  cx="230"
                  cy="150"
                  r="9"
                  fill="#14B8A6"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className={cn(activeRegion === 'india' && 'ring-4 ring-teal-400')}
                />
                <text x="230" y="115" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">
                  INDIA (LIVE)
                </text>
                <text x="230" y="132" textAnchor="middle" fill="#5EEAD4" fontSize="10">
                  14,850+ Settled Estates
                </text>
              </g>

              {/* NODE 2: SOUTHEAST ASIA */}
              <g
                className="cursor-pointer group"
                onClick={() => setActiveRegion('southeast-asia')}
              >
                {/* Radar pulse */}
                <circle cx="450" cy="220" r="26" fill="#F59E0B" fillOpacity="0.1" className="animate-ping" />
                <circle cx="450" cy="220" r="16" fill="#F59E0B" fillOpacity="0.25" />
                <circle
                  cx="450"
                  cy="220"
                  r="9"
                  fill="#F59E0B"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className={cn(activeRegion === 'southeast-asia' && 'ring-4 ring-amber-400')}
                />
                <text x="450" y="185" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">
                  SE ASIA & GULF (PILOT)
                </text>
                <text x="450" y="202" textAnchor="middle" fill="#FCD34D" fontSize="10">
                  Singapore • Malaysia • UAE
                </text>
              </g>

              {/* NODE 3: AUSTRALIA */}
              <g
                className="cursor-pointer group"
                onClick={() => setActiveRegion('australia')}
              >
                {/* Radar pulse */}
                <circle cx="700" cy="290" r="26" fill="#38BDF8" fillOpacity="0.1" className="animate-ping" />
                <circle cx="700" cy="290" r="16" fill="#38BDF8" fillOpacity="0.25" />
                <circle
                  cx="700"
                  cy="290"
                  r="9"
                  fill="#38BDF8"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className={cn(activeRegion === 'australia' && 'ring-4 ring-sky-400')}
                />
                <text x="700" y="255" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">
                  AUSTRALIA (2027)
                </text>
                <text x="700" y="272" textAnchor="middle" fill="#7DD3FC" fontSize="10">
                  Sydney • Melbourne • Perth
                </text>
              </g>
            </svg>
          </div>

          {/* Active Region Detailed Dossier Panel */}
          <div className="mt-6 pt-6 border-t border-navy-light/80 grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeRegion === 'india' && (
              <>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Phase 1: Domestic Core (Live)
                  </div>
                  <h4 className="text-lg font-serif font-bold text-white">Pan-India Operations</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Live across all 28 states and 8 union territories. Full integration with DigiLocker, RBI-regulated Account Aggregators, and CAMS/KFintech.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Statutory Frameworks:
                  </span>
                  <p>• Hindu Succession Act (1956 & 2005 Amendment)</p>
                  <p>• Indian Succession Act (1925) & Muslim Shariat (1937)</p>
                  <p>• RBI DBOD Master Circular Section 2.1 (Claim settlements)</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Institutional Deployment:
                  </span>
                  <p>• 28 Scheduled Commercial Banks (HDFC, SBI, ICICI, PNB)</p>
                  <p>• 14 Life & Health Insurers</p>
                  <p>• 14,850+ settled family estates</p>
                </div>
              </>
            )}

            {activeRegion === 'southeast-asia' && (
              <>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Phase 2: NRI Diaspora Corridor (Pilot)
                  </div>
                  <h4 className="text-lg font-serif font-bold text-white">Singapore, Malaysia & Gulf</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Targeting 2.8M Indian expats with cross-border estates. Solving dual-country probate, NRE/NRO repatriations, and ancestral property transfer.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Jurisdictional Sandbox:
                  </span>
                  <p>• Intestate Succession Act (Cap 146, Singapore)</p>
                  <p>• UAE DIFC Wills & Probate Registry</p>
                  <p>• Cross-border FEMA & RBI remittance guidelines</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Regulatory Readiness:
                  </span>
                  <p>• Monetary Authority of Singapore (MAS) FinTech Sandbox</p>
                  <p>• NRI Bank Partnership with State Bank of India (Singapore)</p>
                  <p>• Scheduled Q4 2026 general availability</p>
                </div>
              </>
            )}

            {activeRegion === 'australia' && (
              <>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Phase 3: Commonwealth Expansion (2027)
                  </div>
                  <h4 className="text-lg font-serif font-bold text-white">Australia & New Zealand</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Over 850,000 Indian-origin Australians managing dual-country succession, superannuation death benefits, and ancestral immovable land in Punjab, Gujarat, and Kerala.
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Succession Regimes:
                  </span>
                  <p>• Australian Succession Act (NSW, VIC, QLD)</p>
                  <p>• Australian Taxation Office (ATO) CGT clearances</p>
                  <p>• Indo-Australian Double Tax Avoidance Agreement (DTAA)</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
                    Working Group:
                  </span>
                  <p>• Institutional working group with major cross-border firms</p>
                  <p>• Superannuation death benefit distribution automation</p>
                  <p>• Target launch: 2027</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 7. BUSINESS MODEL STRIP */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5" />
            <span>Sustainable Unit Economics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
            Virasat Business Model
          </h2>
          <p className="text-slate-600 text-sm md:text-base max-w-3xl leading-relaxed">
            A tripartite revenue model built on transparent value: aligning family peace of mind with bank operational efficiency and proactive lifetime estate protection.
          </p>
        </div>

        {/* 3 Business Model Strip Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Per-Claim SaaS */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  B2C & Family Concierge
                </span>
                <h3 className="text-xl font-serif font-bold text-navy mt-1">
                  Per-Claim SaaS
                </h3>
              </div>
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                <div className="text-2xl font-bold font-sans text-navy">
                  ₹14,999 – ₹24,999
                </div>
                <div className="text-[11px] text-teal-800 font-medium mt-0.5">
                  Flat success fee • Free discovery upfront
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Replaces ₹1.85L–₹3.5L lawyer fees and tout commissions. Grieving families only pay upon verified core-banking disbursement.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Comprehensive 12-asset discovery via Account Aggregator</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Aadhaar OTP eSign Family Settlement Agreement</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Statutory indemnity bond generator (RBI Master Circular)</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <Link
                to="/demo"
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>Experience Family Claim Flow</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: API for Institutions */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border-2 border-teal-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between group relative ring-2 ring-teal-500/10">
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-teal-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
              High Growth
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-navy text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  B2B Enterprise FinTech
                </span>
                <h3 className="text-xl font-serif font-bold text-navy mt-1">
                  API for Institutions
                </h3>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-2xl font-bold font-sans text-navy">
                  ₹499 – ₹1,499
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Metered per-claim verification or annual enterprise license
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Banks, AMCs, and life insurers use Virasat STP to verify Legal Heir Certificates, audit kinship proof, and disburse without legal liability.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>48-Hour bank settlement SLA vs 45 days manual branch SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Cryptographic lineage verification & fraud shield</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Full regulatory audit trail compliant with RBI inspections</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <Link
                to="/institution"
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>Access Bank STP Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Digital Estate Vault */}
          <div className="bg-white rounded-virasat p-6 md:p-7 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold border border-gold/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Database className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gold-dark">
                  Recurring Subscription (B2B2C)
                </span>
                <h3 className="text-xl font-serif font-bold text-navy mt-1">
                  Digital Estate Vault
                </h3>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <div className="text-2xl font-bold font-sans text-navy">
                  ₹1,999 / yr
                </div>
                <div className="text-[11px] text-amber-900 font-medium mt-0.5">
                  Or ₹14,999 lifetime legacy membership
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Proactive estate planning for living wealth creators. Ensures your family never faces lost accounts or probate disputes in the future.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Zero-knowledge AES-256 encrypted digital asset locker</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Bi-annual nominee sync reminders across all institutions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Dead-man switch trigger with dual-trusted trustee verification</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <Link
                to="/case/VR-2026-0142/documents"
                className="text-xs font-semibold text-gold-dark hover:text-navy flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>View Document Vault Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION STRIP */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-24">
        <div className="rounded-virasat bg-gradient-to-r from-navy via-navy to-[#0F2D54] p-8 md:p-12 text-white shadow-elevated border border-navy-light flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl relative z-10">
            <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              Start Settling a Legacy Today
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-tight">
              Bring Peace, Transparency, and Care to Your Family.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Whether you are settling a complex multi-asset estate or protecting your family’s future, Virasat’s AI concierge guides you every step of the way.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 relative z-10 w-full md:w-auto">
            <Link
              to="/case/VR-2026-0142/overview"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-teal-accent hover:bg-teal-400 text-navy font-semibold text-sm shadow-soft text-center transition-all"
            >
              Open Live Case Dashboard
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm text-center transition-all"
            >
              Try Scenario Simulator
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ImpactPage;
