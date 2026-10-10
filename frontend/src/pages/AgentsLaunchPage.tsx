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
  Landmark, 
  Check, 
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAgentRun, AgentId, AgentStatus } from '@/api/useAgentRun';
import { useVirasatStore } from '@/store/useVirasatStore';
import { baseCaseData } from '@/mocks/caseData';

export const AgentsLaunchPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId } = useParams();
  const { caseId } = useVirasatStore();

  const activeCaseId = paramCaseId || caseId || baseCaseData.id;

  // Use the simulated event stream hook
  const { 
    agents, 
    logs, 
    assetsLocated, 
    totalAssets, 
    overallPercent, 
    isRunning, 
    isCompleted, 
    elapsedSeconds, 
    fastForward 
  } = useAgentRun(`run-${activeCaseId}`);

  // Auto-scroll ref for terminal feed
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="space-y-6 pb-16 max-w-7xl mx-auto text-left">
      {/* Top Banner: Progress Ring + Case Metadata + Elapsed Timer */}
      <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
                AUTONOMOUS SETTLEMENT MESH
              </span>
              <span className="text-xs font-mono text-slate-400">
                CASE {activeCaseId}
              </span>
              {isRunning && (
                <span className="text-xs bg-navy text-teal-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>Mesh Active ({elapsedSeconds}s)</span>
                </span>
              )}
              {isCompleted && (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Run Complete (20.0s)</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Agents at Work
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Six specialized legal and financial agents are querying national gateways, applying succession law, and assembling claim packets for Late Ramesh Sharma’s estate.
            </p>
          </div>

          {/* Right: Circular Progress Ring & Fast-Forward Control */}
          <div className="flex items-center gap-6 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
              <svg className="w-18 h-18 transform -rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="#14B8A6"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold font-mono text-navy">
                  {assetsLocated}/12
                </span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">Assets</span>
              </div>
            </div>

            <div className="text-left space-y-1">
              <div className="text-xs font-bold text-navy">
                {assetsLocated} of 12 assets located
              </div>
              <div className="text-[11px] text-slate-500">
                Net Valuation: <strong className="text-teal-700 font-mono">₹2.84 Cr</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                {overallPercent}% Workflow Ingestion
              </div>

              {isRunning && (
                <button
                  type="button"
                  onClick={fastForward}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-navy pt-1 transition-colors"
                >
                  <FastForward className="w-3 h-3" />
                  <span>Fast-forward run</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid: 6 Agent Cards (Left) vs Live Activity Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Vertical List of 6 Agent Cards with Connecting Mesh Line */}
        <div className="lg:col-span-7 space-y-4 relative">
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
                className={`relative z-10 p-5 rounded-virasat border transition-all duration-200 space-y-3 ${
                  isWorking
                    ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500/40'
                    : isDone
                    ? 'bg-white border-slate-200 shadow-soft'
                    : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                }`}
              >
                {/* Top Row: Icon + Name + Role + Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
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

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-navy font-serif">
                          {agent.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #0{index + 1}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {agent.role}
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(agent.status)}</div>
                </div>

                {/* One-Line Live Activity Text */}
                <div className="text-xs text-slate-700 leading-snug flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="rounded-virasat bg-[#0B1F3A] text-white border border-slate-700 shadow-elevated p-5 space-y-3 flex flex-col h-[540px]">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
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

            {/* Terminal Feed Scroll Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin text-xs font-mono leading-relaxed">
              {logs.length === 0 && (
                <div className="text-slate-400 italic text-center pt-8">
                  Connecting to autonomous mesh pipeline...
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
              <div ref={logEndRef} />
            </div>

            {/* Terminal Status Footer */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Stream Connected</span>
              </span>
              <span>SHA-256 Validated</span>
            </div>
          </div>

          {/* Bottom Card: "View Results" CTA when completed */}
          {isCompleted ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-soft text-left space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>All 6 Agents Completed! 12 Assets Located.</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Autonomous estate discovery successfully reconciled ₹2.84 Cr across SBI, HDFC, ICICI, Zerodha, LIC, and EPFO with 4 Class-I legal heirs.
              </p>
              <Link
                to={`/case/${activeCaseId}/overview`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
              >
                <span>View Results & Estate Dashboard</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Run completing in ~{Math.max(20 - elapsedSeconds, 1)}s...</span>
              </span>
              <button
                type="button"
                onClick={fastForward}
                className="text-teal-700 font-semibold hover:underline"
              >
                Skip wait →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
