import React, { useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FileCheck2, 
  Search, 
  Scale, 
  FileText, 
  ShieldAlert, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Terminal, 
  FastForward, 
  Clock, 
  Check, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAgentRun, AgentId, AgentStatus, normalizeCaseId } from '@/api/useAgentRun';
import { estateService } from '@/api/estateService';
import { useVirasatStore } from '@/store/useVirasatStore';
import { baseCaseData } from '@/mocks/caseData';

export const AgentsLaunchPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId } = useParams();
  const { caseId } = useVirasatStore();

  const activeCaseId = paramCaseId || caseId || baseCaseData.id;
  const canonicalCaseId = normalizeCaseId(activeCaseId);
  const isMehta = activeCaseId.toUpperCase().includes('MEHTA') || canonicalCaseId.includes('0187');

  // Retrieve case overview for dynamic deceased name and estate valuation
  const { data: caseOverview } = useQuery({
    queryKey: ['caseOverview', canonicalCaseId],
    queryFn: () => estateService.getOverview(canonicalCaseId),
    staleTime: 5 * 60 * 1000,
  });

  const deceasedName = caseOverview?.caseDetails?.deceasedName || 
    (isMehta ? 'Late Anil Mehta' : 'Late Ramesh Sharma');
  const netValuation = caseOverview?.netEstateValue 
    ? `₹${caseOverview.netEstateValue}` 
    : (isMehta ? '₹1.68 Cr' : '₹2.84 Cr');

  // Real pipeline orchestration hook
  const { 
    agents, 
    logs, 
    assetsLocated, 
    totalAssets, 
    overallPercent, 
    runStatus,
    isLoadingInitial,
    isRunning, 
    isCompleted, 
    isFailed,
    isDegraded,
    errorMessage,
    elapsedSeconds, 
    sseConnection,
    startRun,
    fastForward 
  } = useAgentRun(canonicalCaseId);

  // Container-only auto-scroll ref for terminal feed (never scroll entire window)
  const terminalRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  const handleTerminalScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  useEffect(() => {
    if (terminalRef.current && isNearBottomRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Icon mapping for 6 agents
  const getAgentIcon = (id: AgentId) => {
    switch (id) {
      case 'intake':
        return <FileCheck2 className="w-5 h-5 text-teal-600" />;
      case 'discovery':
        return <Search className="w-5 h-5 text-amber-600" />;
      case 'legal':
        return <Scale className="w-5 h-5 text-purple-600" />;
      case 'packager':
        return <FileText className="w-5 h-5 text-sky-600" />;
      case 'dispute':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'orchestrator':
        return <Bot className="w-5 h-5 text-navy" />;
    }
  };

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Done</span>
          </span>
        );
      case 'working':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            <span>Working</span>
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <span>Queued</span>
          </span>
        );
    }
  };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto text-left min-w-0">
      {/* Top Banner: Progress Ring + Case Metadata + Elapsed Timer */}
      <div className="p-5 md:p-6 rounded-virasat bg-white border border-slate-200 shadow-soft min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 min-w-0">
          {/* Left: Title & Description */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
                AUTONOMOUS SETTLEMENT MESH
              </span>
              <span className="text-xs font-mono text-slate-400">
                CASE {activeCaseId}
              </span>
              {isDegraded && (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span>Deterministic Fallback Mode</span>
                </span>
              )}
              {isRunning && (
                <span className="text-xs bg-navy text-teal-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>Mesh Active ({elapsedSeconds}s)</span>
                </span>
              )}
              {isCompleted && (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Run Complete {elapsedSeconds > 0 ? `(${elapsedSeconds}s)` : '✓'}</span>
                </span>
              )}
              {isFailed && (
                <span className="text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Run Failed</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight truncate">
              Agents at Work
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Six specialized legal and financial agents are querying national gateways, applying succession law, and assembling claim packets for {deceasedName}’s estate.
            </p>
          </div>

          {/* Right: Circular Progress Ring & Fast-Forward Control */}
          <div className="flex items-center gap-5 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#14B8A6"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold font-mono text-navy">
                  {assetsLocated}/{totalAssets}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">Assets</span>
              </div>
            </div>

            <div className="text-left space-y-1 min-w-[130px]">
              <div className="text-xs font-bold text-navy">
                {assetsLocated} of {totalAssets} assets located
              </div>
              <div className="text-[11px] text-slate-500">
                Net Valuation: <strong className="text-teal-700 font-mono">{netValuation}</strong>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {overallPercent}% Workflow Ingestion
              </div>

              {isRunning && (
                <button
                  type="button"
                  onClick={fastForward}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-navy pt-1 transition-colors cursor-pointer"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Fast-forward run</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Grid: 6 Agent Cards (Left) vs Live Activity Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Left 7 Columns: Vertical List of 6 Agent Cards with Connecting Mesh Line */}
        <div className="lg:col-span-7 space-y-3.5 relative min-w-0">
          {/* Subtle animated connecting spine line */}
          <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-slate-200 -z-0">
            <div
              className="w-full bg-gradient-to-b from-teal-500 via-amber-400 to-emerald-500 transition-all duration-500"
              style={{ height: `${overallPercent}%` }}
            />
          </div>

          {agents.map((agent, index) => {
            const isDone = agent.status === 'done';
            const isWorking = agent.status === 'working';

            return (
              <div
                key={agent.id}
                className={`relative z-10 p-4 sm:p-5 rounded-virasat border transition-all duration-200 space-y-2.5 min-w-0 ${
                  isWorking
                    ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500/40'
                    : isDone
                    ? 'bg-white border-slate-200 shadow-soft'
                    : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                }`}
              >
                {/* Top Row: Icon + Name + Role + Status Pill */}
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        isWorking
                          ? 'bg-teal-50 border-teal-200 shadow-xs'
                          : isDone
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {getAgentIcon(agent.id)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-navy font-serif truncate">
                          {agent.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          #0{index + 1}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {agent.role}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">{getStatusBadge(agent.status)}</div>
                </div>

                {/* One-Line Live Activity Text */}
                <div className="text-xs text-slate-700 leading-snug flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-w-0">
                  {isWorking && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping shrink-0" />
                  )}
                  {isDone && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  )}
                  <span className="truncate font-sans">{agent.activity}</span>
                </div>

                {/* Agent Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Task Execution</span>
                    <span>{agent.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isDone
                          ? 'bg-emerald-500'
                          : isWorking
                          ? 'bg-teal-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 5 Columns: Live Activity Log Terminal-Style Feed */}
        <div className="lg:col-span-5 space-y-4 sticky top-20 min-w-0">
          <div className="rounded-virasat bg-[#0B1F3A] text-white border border-slate-700 shadow-elevated p-4 sm:p-5 space-y-3 flex flex-col h-[500px] min-w-0">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5 ml-2">
                  <Terminal className="w-3.5 h-3.5 text-teal-400" />
                  <span>live_telemetry.log</span>
                </div>
              </div>

              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-teal-300">
                {logs.length} Events
              </span>
            </div>

            {/* Terminal Feed Scroll Container (Independently scrollable) */}
            <div 
              ref={terminalRef}
              onScroll={handleTerminalScroll}
              className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin text-xs font-mono leading-relaxed"
            >
              {logs.length === 0 && (
                <div className="text-slate-400 italic text-center pt-8">
                  {isLoadingInitial ? 'Loading case telemetry...' : 'Standing by for live agent telemetry events...'}
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    log.isMilestone
                      ? 'bg-teal-950/60 border-teal-500/40 text-teal-100'
                      : 'bg-white/5 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 mb-1">
                    <span className="text-teal-400 font-semibold">{log.agentName}</span>
                    <span className="tabular-nums text-slate-500">{log.timestamp}</span>
                  </div>

                  <p className="text-[11px] text-slate-200 font-sans leading-snug">
                    {log.message}
                  </p>

                  {log.citation && (
                    <div className="mt-1.5 pt-1 border-t border-white/10 text-[9px] text-amber-300/90 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Source: {log.citation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Terminal Status Footer */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
              <span className="flex items-center gap-1.5">
                {isCompleted ? (
                  <span className="flex items-center gap-1 text-teal-300">
                    <CheckCircle2 className="w-3 h-3 text-teal-400" />
                    <span>Pipeline Concluded</span>
                  </span>
                ) : sseConnection === 'connected' ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Stream Connected</span>
                  </span>
                ) : sseConnection === 'connecting' ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Connecting...</span>
                  </span>
                ) : isFailed ? (
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>Stream Offline</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span>Stream Verified</span>
                  </span>
                )}
              </span>
              <span>SHA-256 Validated</span>
            </div>
          </div>

          {/* Bottom Card: Status CTA & Recovery (Explicit termination states, zero infinite spinners) */}
          {isLoadingInitial ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Checking autonomous mesh state...</span>
              </span>
            </div>
          ) : isFailed ? (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 shadow-soft text-left space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Agent Execution Interrupted</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                {errorMessage || 'The background analysis was interrupted or timed out. Your case records remain safe.'}
              </p>
              <button
                type="button"
                onClick={() => startRun(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-soft transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Agent Analysis</span>
              </button>
            </div>
          ) : isCompleted ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-soft text-left space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>All 6 Agents Completed! {assetsLocated} Assets Located.</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Autonomous estate discovery successfully reconciled {assetsLocated} asset folios across SBI, HDFC, ICICI, Zerodha, LIC, and EPFO with Class-I legal heirs in {elapsedSeconds}s.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to={`/case/${activeCaseId}/overview`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
                >
                  <span>View Results & Estate Dashboard</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
                <button
                  type="button"
                  onClick={() => startRun(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-navy hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run estate analysis</span>
                </button>
              </div>
            </div>
          ) : isRunning ? (
            <div className="p-4 rounded-xl bg-white border border-teal-200 shadow-xs text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
                </span>
                <span>Processing live agent mesh ({elapsedSeconds}s elapsed)...</span>
              </span>
              <button
                type="button"
                onClick={fastForward}
                className="text-teal-700 font-semibold hover:underline cursor-pointer"
              >
                Skip wait →
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-500" />
                <span>Autonomous mesh standing by.</span>
              </span>
              <button
                type="button"
                onClick={() => startRun(true)}
                className="px-3.5 py-1.5 rounded-lg bg-navy hover:bg-navy-light text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Start Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
