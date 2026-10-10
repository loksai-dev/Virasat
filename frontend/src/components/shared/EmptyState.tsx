import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-virasat border border-dashed border-slate-300 bg-white/60 backdrop-blur-xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-xs">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>

      <h3 className="text-lg font-semibold font-serif text-navy mb-1.5">
        {title}
      </h3>

      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {action && <div className="inline-flex items-center gap-2">{action}</div>}
    </div>
  );
};
