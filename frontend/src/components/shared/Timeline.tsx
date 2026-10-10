import React from 'react';
import { 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Send, 
  AlertTriangle, 
  ArrowRight,
  Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditEntry } from '@/mocks/auditData';

interface TimelineProps {
  entries: AuditEntry[];
  className?: string;
  maxItems?: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  className,
  maxItems,
}) => {
  const displayed = maxItems ? entries.slice(0, maxItems) : entries;

  const getCategoryIcon = (category: AuditEntry['category']) => {
    switch (category) {
      case 'Verification':
        return <ShieldCheck className="w-4 h-4 text-teal-600" />;
      case 'Document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Claim':
        return <Send className="w-4 h-4 text-indigo-600" />;
      case 'Security & Dispute':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Disbursement':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      {/* Vertical Spine Line */}
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

      {displayed.map((entry) => (
        <div key={entry.id} className="relative flex items-start gap-3 group">
          {/* Node Icon Circle */}
          <div className="absolute -left-6 mt-0.5 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-xs z-10 group-hover:border-teal-500 group-hover:scale-110 transition-all">
            {getCategoryIcon(entry.category)}
          </div>

          <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-navy">{entry.action}</span>
              <span className="text-xs text-slate-400 tabular-nums">{entry.timestamp}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              {entry.details}
            </p>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <span>By:</span>
                <span className="text-navy">{entry.actor}</span>
                <span className="text-slate-400">({entry.actorType})</span>
              </span>
              <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {entry.hash}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
