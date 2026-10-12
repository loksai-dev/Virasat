import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const { caseId } = useVirasatStore();
  const agents = baseCaseData.activeAgents;
  const activeCount = agents.filter(a => a.status === 'working').length;

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
          'bg-navy-surface text-slate-100 border-teal-500/30 hover:border-teal-400 hover:bg-navy-light',
          'shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-400/50'
        )}
        aria-expanded={isExpanded}
      >
        {/* Pulsing Teal Indicator Dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
        </span>

        <Bot className="w-3.5 h-3.5 text-teal-300" />
        <span className="font-semibold text-white tracking-wide">
          {activeCount} AI Agents Active
        </span>

        {variant === 'detailed' && (
          <span className="text-slate-300 hidden sm:inline-block max-w-[120px] truncate">
            • {agents[0]?.task}
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
                  <span className="font-medium text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
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
