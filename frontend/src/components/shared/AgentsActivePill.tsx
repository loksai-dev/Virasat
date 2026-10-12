import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { baseCaseData } from '@/mocks/caseData';
import { useVirasatStore } from '@/store/useVirasatStore';

interface AgentsActivePillProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const AgentsActivePill: React.FC<AgentsActivePillProps> = ({
  className,
  variant = 'compact',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { caseId, activeRunStatus, activeAgentCount } = useVirasatStore();

  const isDone = activeRunStatus === 'DONE';
  const isRunning = activeRunStatus === 'RUNNING';
  const isFailed = activeRunStatus === 'FAILED';
  const isQueued = activeRunStatus === 'QUEUED';

  const agents = baseCaseData.activeAgents.map((a) => ({
    ...a,
    status: isDone ? 'done' : isRunning ? a.status : 'queued',
    task: isDone ? 'Task settled & cryptographically signed' : a.task,
    lastActivity: isDone ? 'Verified' : a.lastActivity,
  }));

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
          isDone
            ? 'bg-navy-surface text-slate-100 border-emerald-500/40 hover:border-emerald-400 hover:bg-navy-light'
            : isRunning
            ? 'bg-navy-surface text-slate-100 border-teal-500/40 hover:border-teal-400 hover:bg-navy-light'
            : isFailed
            ? 'bg-navy-surface text-rose-200 border-rose-500/40 hover:border-rose-400'
            : 'bg-navy-surface text-slate-200 border-slate-700 hover:border-slate-500',
          'shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400/50'
        )}
        aria-expanded={isExpanded}
      >
        {/* Dynamic Status Indicator Dot */}
        {isDone ? (
          <span className="relative flex h-2 w-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        ) : isRunning ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
        ) : isFailed ? (
          <span className="relative flex h-2 w-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-rose-400" />
          </span>
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-slate-400" />
          </span>
        )}

        {isDone ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : isRunning ? (
          <Bot className="w-3.5 h-3.5 text-teal-300" />
        ) : isFailed ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        )}

        <span className="font-semibold text-white tracking-wide">
          {isDone
            ? 'Mesh Complete'
            : isRunning
            ? `${activeAgentCount > 0 ? activeAgentCount : 2} AI Agents Active`
            : isFailed
            ? 'Mesh Interrupted'
            : isQueued
            ? 'Agents Queued'
            : 'Mesh Standby'}
        </span>

        {variant === 'detailed' && isRunning && (
          <span className="text-slate-300 hidden sm:inline-block max-w-[120px] truncate">
            • {agents[0]?.task}
          </span>
        )}

        {variant === 'detailed' && isDone && (
          <span className="text-emerald-300 hidden sm:inline-block">
            • 100% Settled
          </span>
        )}

        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {/* Popover Breakdown of Active AI Tasks */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-navy text-white rounded-2xl shadow-elevated border border-slate-700/80 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Virasat Autonomous Settlement Mesh</span>
            </div>
            <span className="text-[10px] bg-teal-900/60 text-teal-300 border border-teal-600/40 px-1.5 py-0.5 rounded">
              Encrypted
            </span>
          </div>

          <div className="space-y-2.5">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-2 rounded-xl bg-navy-surface/80 border border-slate-700/40 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isDone ? 'bg-emerald-400' : 'bg-teal-400 animate-pulse')} />
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{agent.lastActivity}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {agent.task}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Zero manual lawyer trips
            </span>
            <Link
              to={`/case/${caseId}/agents`}
              onClick={() => setIsExpanded(false)}
              className="text-teal-300 hover:text-white font-medium hover:underline flex items-center gap-1"
            >
              <span>Inspect Agents →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
