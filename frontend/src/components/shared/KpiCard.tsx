import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    label: string;
    direction?: 'up' | 'down' | 'neutral';
    positive?: boolean;
  };
  badgeText?: string;
  tooltipText?: string;
  variant?: 'default' | 'navy' | 'gold' | 'teal';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badgeText,
  tooltipText,
  variant = 'default',
  className,
}) => {
  const isNavy = variant === 'navy';
  const isGold = variant === 'gold';
  const isTeal = variant === 'teal';

  return (
    <div
      className={cn(
        'relative rounded-virasat p-5 md:p-6 transition-all duration-200 border',
        'hover:-translate-y-0.5 hover:shadow-elevated',
        isNavy
          ? 'bg-navy text-white border-navy-light shadow-soft'
          : isGold
          ? 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 text-navy border-amber-200/80 shadow-soft'
          : isTeal
          ? 'bg-gradient-to-br from-teal-50/80 via-white to-teal-50/40 text-navy border-teal-200/80 shadow-soft'
          : 'bg-white text-navy border-slate-200/90 shadow-soft',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-xs md:text-sm font-medium tracking-wide',
              isNavy ? 'text-slate-300' : 'text-slate-500'
            )}
          >
            {title}
          </span>
          {tooltipText && <InfoTooltip content={tooltipText} />}
        </div>

        {Icon && (
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200',
              isNavy
                ? 'bg-white/10 text-teal-300'
                : isGold
                ? 'bg-amber-100 text-amber-800'
                : isTeal
                ? 'bg-teal-100 text-teal-800'
                : 'bg-slate-100 text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <div
          className={cn(
            'text-2xl md:text-3xl font-semibold tabular-nums tracking-tight font-sans',
            isNavy ? 'text-white' : 'text-navy'
          )}
        >
          {value}
        </div>

        {badgeText && (
          <span
            className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full border',
              isNavy
                ? 'bg-white/10 border-white/20 text-teal-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            )}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100/10">
        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md',
              trend.positive
                ? isNavy
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700'
                : trend.direction === 'down'
                ? isNavy
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-rose-50 text-rose-700'
                : isNavy
                ? 'bg-slate-700 text-slate-300'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {trend.direction === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trend.direction === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{trend.label}</span>
          </div>
        )}

        {subtitle && (
          <span
            className={cn(
              'text-xs truncate',
              isNavy ? 'text-slate-400' : 'text-slate-500'
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
