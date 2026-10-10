import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Scale,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Users,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Layers,
  Lock,
  Landmark,
  Coins,
  CheckCircle2,
  Clock,
  BookOpen,
  X,
  PhoneCall,
  Video,
  FileText,
  BadgeCheck,
  ChevronDown,
  Info,
  Share2,
  Download
} from 'lucide-react';
import { useShares, WillScenario, SankeyFlowLink, HeirShareRow } from '@/api/useShares';
import { formatINR, cn } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

export const HeirSharesPage: React.FC = () => {
  const { caseId: paramCaseId } = useParams();
  const navigate = useNavigate();
  const { caseId: storeCaseId, addToast } = useVirasatStore();
  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Scenario toggle state: "without_will" (Intestate) vs "with_will" (Testamentary)
  const [scenario, setScenario] = useState<WillScenario>('without_will');
  const { data } = useShares(scenario);

  // Hover states for Sankey interactive highlighting & tooltips
  const [hoveredFlow, setHoveredFlow] = useState<SankeyFlowLink | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [hoveredHeir, setHoveredHeir] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Lawyer Review Modal state
  const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
  const [selectedLawyerMode, setSelectedLawyerMode] = useState<'video' | 'opinion'>('video');
  const [selectedConsultDate, setSelectedConsultDate] = useState('2026-10-14');
  const [selectedConsultTime, setSelectedConsultTime] = useState('11:00 AM IST');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Class-I Intestate entitlement & FSA validation',
    'Bank Transmission Annexure & Nominee NOC',
  ]);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Expandable cited provisions in reasoning panel
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  // SVG Sankey Layout Calculations
  const sankeyLayout = useMemo(() => {
    const width = 1000;
    const height = 620;
    const leftX = 30;
    const leftWidth = 230;
    const rightX = 740;
    const rightWidth = 230;
    const topMargin = 40;
    const bottomMargin = 40;
    const usableHeight = height - topMargin - bottomMargin;

    const totalEstate = data.totalEstateValue;

    // 1. Calculate Left Nodes (Asset Sources)
    const sourceCount = data.assetSources.length;
    const sourceGap = 12;
    const totalSourceGaps = (sourceCount - 1) * sourceGap;
    const sourceHeightBudget = usableHeight - totalSourceGaps;

    let currentSourceY = topMargin;
    const sourceNodes = data.assetSources.map((source) => {
      // Height proportional to amount with min 46px
      const calculatedHeight = Math.max(46, Math.round((source.amount / totalEstate) * sourceHeightBudget));
      const node = {
        ...source,
        x: leftX,
        y: currentSourceY,
        width: leftWidth,
        height: calculatedHeight,
        currentYOffset: currentSourceY + 4,
      };
      currentSourceY += calculatedHeight + sourceGap;
      return node;
    });

    // 2. Calculate Right Nodes (Heirs)
    const heirCount = data.heirs.length;
    const heirGap = 14;
    const totalHeirGaps = (heirCount - 1) * heirGap;
    const heirHeightBudget = usableHeight - totalHeirGaps;

    let currentHeirY = topMargin;
    const heirNodes = data.heirs.map((heir) => {
      let calculatedHeight = 52;
      if (heir.amount > 0) {
        calculatedHeight = Math.max(68, Math.round((heir.amount / totalEstate) * heirHeightBudget));
      } else {
        calculatedHeight = 52; // Excluded/annuity protected node
      }

      const node = {
        ...heir,
        x: rightX,
        y: currentHeirY,
        width: rightWidth,
        height: calculatedHeight,
        currentYOffset: currentHeirY + 4,
      };
      currentHeirY += calculatedHeight + heirGap;
      return node;
    });

    // Create lookup maps
    const sourceMap = new Map(sourceNodes.map((n) => [n.category, n]));
    const heirMap = new Map(heirNodes.map((n) => [n.name, n]));

    // 3. Calculate Bézier Ribbons
    const ribbons = data.flows.map((flow) => {
      const sNode = sourceMap.get(flow.sourceCategory);
      const hNode = heirMap.get(flow.targetHeir);

      if (!sNode || !hNode) return null;

      // Usable height inside source & target
      const sUsable = sNode.height - 8;
      const hUsable = hNode.amount > 0 ? hNode.height - 8 : 4;

      const flowThicknessSource = Math.max(2, (flow.flowValue / sNode.amount) * sUsable);
      const flowThicknessTarget = hNode.amount > 0 
        ? Math.max(2, (flow.flowValue / hNode.amount) * hUsable)
        : 2;

      const y1_top = sNode.currentYOffset;
      const y1_bottom = y1_top + flowThicknessSource;
      sNode.currentYOffset = y1_bottom;

      const y2_top = hNode.currentYOffset;
      const y2_bottom = y2_top + flowThicknessTarget;
      hNode.currentYOffset = y2_bottom;

      const x1 = leftX + leftWidth;
      const x2 = rightX;
      const deltaX = x2 - x1;
      const cx1 = x1 + deltaX * 0.44;
      const cx2 = x2 - deltaX * 0.44;

      const pathData = `M ${x1} ${y1_top} C ${cx1} ${y1_top}, ${cx2} ${y2_top}, ${x2} ${y2_top} L ${x2} ${y2_bottom} C ${cx2} ${y2_bottom}, ${cx1} ${y1_bottom}, ${x1} ${y1_bottom} Z`;

      return {
        ...flow,
        pathData,
        y1_mid: (y1_top + y1_bottom) / 2,
        y2_mid: (y2_top + y2_bottom) / 2,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      width,
      height,
      sourceNodes,
      heirNodes,
      ribbons,
    };
  }, [data]);

  // Handle row click navigation to /heirs with person selected
  const handleHeirRowClick = (personId: string) => {
    navigate(`/case/${activeCaseId}/heirs?selected=${personId}`);
  };

  // Handle Legal Review Booking confirmation
  const handleConfirmLawyerBooking = () => {
    setBookingSuccess(true);
    setTimeout(() => {
      setIsLawyerModalOpen(false);
      setBookingSuccess(false);
      addToast({
        type: 'success',
        title: 'Legal Consultation Confirmed',
        message: `Session reserved with Adv. Rajesh Ramanathan for ${selectedConsultDate} at ${selectedConsultTime}. Dossier transmitted.`,
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-left relative">
      {/* Sub-Navigation Tabs: Interactive Kinship Graph vs Heir Shares */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={`/case/${activeCaseId}/heirs`}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-slate-600 hover:text-navy hover:bg-slate-100"
        >
          <Users className="w-4 h-4 text-teal-600" />
          <span>Interactive Kinship Graph</span>
        </Link>
        <Link
          to={`/case/${activeCaseId}/heirs/shares`}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-navy text-white shadow-soft"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Estate Heir Shares & Sankey Flow</span>
        </Link>
      </div>

      {/* Main Header Card with Scenario Switcher */}
      <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
                SANKEY FLOW VISUALIZER
              </span>
              <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                {scenario === 'without_will' ? 'Section 8 HSA 1956' : 'Section 30 ISA 1925'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Estate Heir Shares & Entitlement Flow
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {data.scenarioSubtitle} • Total net distributable estate: <span className="font-semibold text-navy">{data.formattedTotalEstate}</span>
            </p>
          </div>

          {/* Scenario Comparison Segmented Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center shadow-inner">
              <button
                onClick={() => {
                  setScenario('without_will');
                  addToast({
                    type: 'info',
                    title: 'Scenario: Intestate Succession',
                    message: 'Statutory 4-way Class-I distribution under Hindu Succession Act loaded.',
                  });
                }}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                  scenario === 'without_will'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-white/60'
                )}
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Without will (Intestate §8)</span>
              </button>

              <button
                onClick={() => {
                  setScenario('with_will');
                  addToast({
                    type: 'info',
                    title: 'Scenario: With Will (Testamentary)',
                    message: 'Simulated specific bequest shares under Section 30 loaded.',
                  });
                }}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                  scenario === 'with_will'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-white/60'
                )}
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-300" />
                <span>With will (Testamentary §30)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLawyerModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy-light transition-colors flex items-center gap-2 shadow-sm"
              >
                <Scale className="w-4 h-4 text-amber-400" />
                <span>Review with a lawyer</span>
              </button>

              <button
                onClick={() => navigate(`/case/${activeCaseId}/claims`)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Prepare claims</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Transferable Estate</span>
            <span className="text-lg font-bold text-navy font-mono">{data.formattedTotalEstate}</span>
            <span className="text-[10px] text-slate-500 block">Across 6 asset folios</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Legal Heirs</span>
            <span className="text-lg font-bold text-navy font-mono">4 Heirs</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">100% allocation sum</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Legal Certainty Meter</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-teal-700 font-mono">{data.confidenceScore}%</span>
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate block">{data.confidenceLabel}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dispute Status</span>
            <div className="flex items-center gap-1 text-emerald-700 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Vikram Caveat Barred</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Section 9 HSA statutory bar</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sankey Diagram (Left/Center) + "Why this result?" Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Large Interactive Sankey Diagram */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                  <span>Interactive Flow: Assets (Left) → Legal Heirs (Right)</span>
                  <span className="text-xs font-normal text-slate-400 font-sans hidden sm:inline">
                    (Hover ribbons or cards for flow breakdowns)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {scenario === 'without_will'
                    ? 'Intestate devolution: 40% Surviving Spouse + 20% each to Son, Daughter, Mother'
                    : 'Testamentary devolution: 50% Spouse + 25% Son + 25% Daughter + Mother Annuity Covenant'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
                  Values in ₹ INR
                </span>
              </div>
            </div>

            {/* SVG Sankey Canvas */}
            <div className="relative w-full overflow-x-auto bg-slate-50/70 rounded-2xl border border-slate-200/70 p-3 sm:p-4">
              <svg
                viewBox={`0 0 ${sankeyLayout.width} ${sankeyLayout.height}`}
                className="w-full h-auto min-w-[760px] select-none"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.02))' }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
              >
                <defs>
                  {/* Gradients for ribbons */}
                  {sankeyLayout.ribbons.map((r) => {
                    const gradId = `grad-${r.id}`;
                    return (
                      <linearGradient key={gradId} id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={r.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={r.color} stopOpacity={0.8} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* Draw Ribbons */}
                <g className="ribbons-layer">
                  {sankeyLayout.ribbons.map((ribbon) => {
                    const isHovered = hoveredFlow?.id === ribbon.id;
                    const isSourceHovered = hoveredSource === ribbon.sourceCategory;
                    const isHeirHovered = hoveredHeir === ribbon.targetHeir;
                    const isHighlighted = isHovered || isSourceHovered || isHeirHovered;
                    const hasAnyHover = hoveredFlow || hoveredSource || hoveredHeir;

                    const opacity = isHighlighted ? 0.9 : hasAnyHover ? 0.12 : 0.42;

                    return (
                      <path
                        key={ribbon.id}
                        d={ribbon.pathData}
                        fill={`url(#grad-${ribbon.id})`}
                        stroke={isHighlighted ? ribbon.color : 'transparent'}
                        strokeWidth={isHighlighted ? 1.5 : 0}
                        opacity={opacity}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredFlow(ribbon)}
                        onMouseLeave={() => setHoveredFlow(null)}
                      />
                    );
                  })}
                </g>

                {/* Left Side: Asset Source Nodes */}
                <g className="sources-layer">
                  {sankeyLayout.sourceNodes.map((sNode) => {
                    const isHovered = hoveredSource === sNode.category;
                    return (
                      <g
                        key={sNode.category}
                        transform={`translate(${sNode.x}, ${sNode.y})`}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredSource(sNode.category)}
                        onMouseLeave={() => setHoveredSource(null)}
                      >
                        <rect
                          width={sNode.width}
                          height={sNode.height}
                          rx={10}
                          fill="#FFFFFF"
                          stroke={isHovered ? sNode.color : '#CBD5E1'}
                          strokeWidth={isHovered ? 2 : 1}
                          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.04))"
                        />
                        {/* Color accent bar on left */}
                        <rect
                          width={6}
                          height={sNode.height - 8}
                          x={4}
                          y={4}
                          rx={3}
                          fill={sNode.color}
                        />

                        {/* Text Label */}
                        <text
                          x={16}
                          y={sNode.height > 60 ? 22 : 20}
                          className="font-serif font-bold text-xs"
                          fill="#0B1F3A"
                        >
                          {sNode.category.length > 25 ? sNode.category.slice(0, 23) + '…' : sNode.category}
                        </text>

                        <text
                          x={16}
                          y={sNode.height > 60 ? 39 : 34}
                          className="font-mono font-bold text-xs"
                          fill="#0D9488"
                        >
                          {sNode.formattedAmount}
                        </text>

                        {sNode.height > 65 && (
                          <text
                            x={16}
                            y={54}
                            className="font-sans text-[10px]"
                            fill="#64748B"
                          >
                            {((sNode.amount / data.totalEstateValue) * 100).toFixed(1)}% of total estate
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* Right Side: Heir Target Nodes */}
                <g className="heirs-layer">
                  {sankeyLayout.heirNodes.map((hNode) => {
                    const isHovered = hoveredHeir === hNode.name;
                    return (
                      <g
                        key={hNode.id}
                        transform={`translate(${hNode.x}, ${hNode.y})`}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredHeir(hNode.name)}
                        onMouseLeave={() => setHoveredHeir(null)}
                        onClick={() => handleHeirRowClick(hNode.personId)}
                      >
                        <rect
                          width={hNode.width}
                          height={hNode.height}
                          rx={12}
                          fill={hNode.amount === 0 ? '#F8FAFC' : '#FFFFFF'}
                          stroke={isHovered ? '#14B8A6' : '#CBD5E1'}
                          strokeWidth={isHovered ? 2 : 1}
                          strokeDasharray={hNode.amount === 0 ? '4 2' : undefined}
                          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.04))"
                        />
                        {/* Right color stripe */}
                        <rect
                          width={6}
                          height={hNode.height - 8}
                          x={hNode.width - 10}
                          y={4}
                          rx={3}
                          fill={hNode.statusColor === 'emerald' ? '#10B981' : hNode.statusColor === 'amber' ? '#F59E0B' : '#94A3B8'}
                        />

                        {/* Name */}
                        <text
                          x={14}
                          y={20}
                          className="font-serif font-bold text-xs"
                          fill="#0B1F3A"
                        >
                          {hNode.name}
                        </text>

                        {/* Relationship */}
                        <text
                          x={14}
                          y={34}
                          className="font-sans text-[10px]"
                          fill="#64748B"
                        >
                          {hNode.relationship}
                        </text>

                        {/* Share & Amount */}
                        <text
                          x={14}
                          y={hNode.height > 60 ? 52 : 46}
                          className="font-mono font-bold text-xs"
                          fill="#0F172A"
                        >
                          {hNode.sharePercentage}% • {hNode.formattedAmount}
                        </text>

                        {hNode.height > 80 && (
                          <text
                            x={14}
                            y={67}
                            className="font-sans text-[10px]"
                            fill={hNode.documentsStatus === 'Verified' ? '#059669' : '#D97706'}
                          >
                            ● {hNode.documentsStatus}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Interactive Floating Flow Tooltip */}
              {hoveredFlow && (
                <div
                  className="pointer-events-none absolute z-30 px-3 py-2 rounded-xl bg-navy text-white text-xs shadow-xl border border-teal-500/30 transition-all duration-75"
                  style={{
                    left: `${Math.min(Math.max(mousePos.x - 120, 20), 520)}px`,
                    top: `${Math.max(mousePos.y - 65, 10)}px`,
                  }}
                >
                  <div className="font-semibold text-teal-300 flex items-center gap-1.5">
                    <span>{hoveredFlow.sourceCategory}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{hoveredFlow.targetHeir}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4 font-mono">
                    <span className="text-amber-400 font-bold">{formatINR(hoveredFlow.flowValue)}</span>
                    <span className="text-slate-300 text-[10px]">
                      {((hoveredFlow.flowValue / data.totalEstateValue) * 100).toFixed(1)}% of net estate
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Flow Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-navy">Asset Classes:</span>
                {data.assetSources.map((as) => (
                  <div key={as.category} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: as.color }} />
                    <span className="text-slate-600 text-[11px]">{as.category.split('(')[0].trim()}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-teal-700 font-medium">
                Click any heir to open deep legal profile in Kinship Graph →
              </div>
            </div>
          </div>

          {/* Heir Entitlement Breakdown Table */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                  <span>Legal Heir Statutory Entitlement Table</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    (Click row to inspect heir in Cytoscape graph)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Verification status validated against MeeSeva, UIDAI Aadhaar Vault, and High Court Caveat Registry.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                Sum: 100.0% • {data.formattedTotalEstate}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Legal Heir</th>
                    <th className="py-3 px-3">Relationship</th>
                    <th className="py-3 px-3">Legal Basis</th>
                    <th className="py-3 px-3 text-right">Share %</th>
                    <th className="py-3 px-3 text-right">Entitlement Amount</th>
                    <th className="py-3 px-3 text-center">Document Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.heirs.map((heir) => (
                    <tr
                      key={heir.id}
                      onClick={() => handleHeirRowClick(heir.personId)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Heir Avatar + Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={heir.avatar}
                            alt={heir.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-teal-500 transition-all"
                          />
                          <div>
                            <div className="font-semibold text-navy group-hover:text-teal-700 transition-colors">
                              {heir.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{heir.personId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Relationship */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {heir.relationship}
                        </span>
                      </td>

                      {/* Legal Basis */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {heir.legalBasis}
                        </p>
                      </td>

                      {/* Share % */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={cn('text-xs', heir.sharePercentage > 0 ? 'text-navy' : 'text-slate-400')}>
                            {heir.sharePercentage}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-teal-500"
                              style={{ width: `${heir.sharePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-navy text-xs">
                        {heir.formattedAmount}
                      </td>

                      {/* Document Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
                            heir.documentsStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : heir.documentsStatus === 'Pending In-Person KYC'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : heir.documentsStatus === 'NOC Required'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          )}
                        >
                          {heir.documentsStatus === 'Verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {heir.documentsStatus.includes('Pending') && <Clock className="w-3 h-3 text-amber-600" />}
                          {heir.documentsStatus === 'NOC Required' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                          <span>{heir.documentsStatus}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="text-teal-600 group-hover:text-teal-800 font-semibold text-[11px] inline-flex items-center gap-1">
                          <span>Graph</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer: Totals */}
                <tfoot className="bg-slate-50 font-semibold text-navy border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4 font-serif">Total Transferred Estate</td>
                    <td className="py-3 px-3 text-slate-500">4 Legal Heirs</td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">
                      {scenario === 'without_will' ? 'HSA Intestate devolution' : 'Indian Succession Act testamentary distribution'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-teal-700">100.0%</td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-teal-700">
                      {data.formattedTotalEstate}
                    </td>
                    <td className="py-3 px-3 text-center text-[10px] text-emerald-700">Audit-Ready</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToast({
                            type: 'info',
                            title: 'Dossier Download',
                            message: 'Transmitting encrypted succession certificate PDF...',
                          });
                        }}
                        className="text-slate-500 hover:text-navy p-1"
                        title="Download dossier"
                      >
                        <Download className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: "Why this result?" Legal Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Panel Card */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-serif font-bold text-navy">Why this result?</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono border border-teal-200 font-semibold">
                AI Legal Engine
              </span>
            </div>

            {/* Confidence Meter Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 via-teal-50/20 to-white border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Legal Certainty Meter</span>
                <span className="text-base font-mono font-bold text-teal-700">
                  {data.confidenceScore}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${data.confidenceScore}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-600 font-medium">
                {data.confidenceLabel}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {data.confidenceNotes}
              </p>
            </div>

            {/* Step-by-Step Reasoning */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Step-by-step reasoning:</span>
              </h4>

              <div className="space-y-3">
                {data.reasoningSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <span className="text-xs font-bold text-navy">{step.title}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                      {step.explanation}
                    </p>

                    {step.statutoryReference && (
                      <div className="pl-7 pt-1">
                        <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 inline-block">
                          § {step.statutoryReference}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cited Statutory Provisions & Precedents */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Cited Legal Provisions:</span>
              </h4>

              <div className="space-y-2">
                {data.citations.map((citation, idx) => {
                  const isExp = expandedCitation === citation.provision;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 text-xs transition-colors"
                    >
                      <button
                        onClick={() => setExpandedCitation(isExp ? null : citation.provision)}
                        className="w-full flex items-center justify-between text-left font-semibold text-navy hover:text-amber-900"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-800 font-mono text-[11px] font-bold">
                            {citation.provision}
                          </span>
                        </div>
                        <ChevronDown className={cn('w-3.5 h-3.5 text-amber-600 transition-transform', isExp && 'rotate-180')} />
                      </button>

                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        {citation.statute}
                      </div>

                      {isExp && (
                        <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-amber-200/40 leading-relaxed">
                          {citation.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Review with Lawyer & Prepare Claims */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsLawyerModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <Scale className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>Review with an Empanelled Lawyer</span>
              </button>

              <button
                onClick={() => navigate(`/case/${activeCaseId}/claims`)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Prepare Claims</span>
                <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 rounded-virasat bg-amber-50/50 border border-amber-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Telangana State Practice Note</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Under Section 213(2) of the Indian Succession Act, 1925, probate is non-mandatory for Hindu estates situated in Hyderabad / Jubilee Hills. Succession proceeds smoothly via Registered Family Settlement and Bank Transmission Annexures.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REVIEW WITH A LAWYER MODAL                                               */}
      {/* ========================================================================= */}
      {isLawyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-xl w-full p-6 md:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                    INDEPENDENT LEGAL COUNSEL
                  </span>
                  <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-navy">
                  Review Entitlement with Empanelled Advocate
                </h3>
                <p className="text-xs text-slate-500">
                  Obtain legal certification and review of intestate share calculations prior to submission.
                </p>
              </div>

              <button
                onClick={() => setIsLawyerModalOpen(false)}
                className="text-slate-400 hover:text-navy p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Advocate Spotlight */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Adv. Rajesh Ramanathan"
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-teal-500/40 shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-sm text-navy">Adv. Rajesh Ramanathan, LL.M.</h4>
                  <BadgeCheck className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Senior Counsel, High Court of Telangana (Bar TS/1998/412) • 28 yrs in Succession & Estates
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1">
                  <span className="font-semibold text-amber-700">★ 4.96 (340+ estates verified)</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">Empanelled with SBI & HDFC</span>
                </div>
              </div>
            </div>

            {/* Consultation Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                Select Consultation Format
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedLawyerMode('video')}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all space-y-1',
                    selectedLawyerMode === 'video'
                      ? 'border-teal-600 bg-teal-50/50 text-navy ring-1 ring-teal-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-navy">
                    <Video className="w-4 h-4 text-teal-600" />
                    <span>30-min Video Call</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Live review with all heirs via Virasat encrypted room.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLawyerMode('opinion')}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all space-y-1',
                    selectedLawyerMode === 'opinion'
                      ? 'border-teal-600 bg-teal-50/50 text-navy ring-1 ring-teal-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-navy">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Written Legal Opinion</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Digitally signed Certificate of Heirship & Title Opinion.
                  </p>
                </button>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block text-[11px]">Preferred Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedConsultDate}
                    onChange={(e) => setSelectedConsultDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block text-[11px]">Time Slot</label>
                <select
                  value={selectedConsultTime}
                  onChange={(e) => setSelectedConsultTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  <option value="11:00 AM IST">11:00 AM IST (Available)</option>
                  <option value="02:30 PM IST">02:30 PM IST (Available)</option>
                  <option value="04:00 PM IST">04:00 PM IST (Available)</option>
                  <option value="06:00 PM IST">06:00 PM IST (Evening Slot)</option>
                </select>
              </div>
            </div>

            {/* Agenda Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                Topics for Counsel Review
              </label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {[
                  'Class-I Intestate entitlement & FSA validation',
                  'Bank Transmission Annexure & Nominee NOC',
                  'Section 56(2)(x) Income Tax inheritance exemption verification',
                  'Vikram adverse caveat rebuttal documentation',
                ].map((topic) => {
                  const isChecked = selectedTopics.includes(topic);
                  return (
                    <label
                      key={topic}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTopics([...selectedTopics, topic]);
                          } else {
                            setSelectedTopics(selectedTopics.filter((t) => t !== topic));
                          }
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-[11px]">{topic}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLawyerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLawyerBooking}
                disabled={bookingSuccess}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {bookingSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                    <span>Transmitting Dossier...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span>Confirm Consultation Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeirSharesPage;
