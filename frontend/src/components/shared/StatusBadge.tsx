import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'risk' 
  | 'info' 
  | 'neutral' 
  | 'settled' 
  | 'processing' 
  | 'dispute';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true,
  className,
}) => {
  // Normalize string variant
  let resolvedVariant = variant;
  const lower = label.toLowerCase();
  if (lower.includes('synthetic')) {
    resolvedVariant = 'synthetic' as any;
  } else if (lower.includes('simulated')) {
    resolvedVariant = 'simulated' as any;
  } else if (lower.includes('degraded')) {
    resolvedVariant = 'degraded' as any;
  } else if (lower.includes('settled') || lower.includes('verified') || lower.includes('approved')) {
    resolvedVariant = 'success';
  } else if (lower.includes('dispute') || lower.includes('risk') || lower.includes('fraud') || lower.includes('critical')) {
    resolvedVariant = 'risk';
  } else if (lower.includes('action') || lower.includes('missing') || lower.includes('review') || lower.includes('warning')) {
    resolvedVariant = 'warning';
  } else if (lower.includes('process') || lower.includes('progress') || lower.includes('submitted')) {
    resolvedVariant = 'info';
  }

  const variantStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    synthetic: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    simulated: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
    },
    degraded: {
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-300',
      dot: 'bg-amber-600',
    },
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    risk: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    info: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      dot: 'bg-sky-500',
    },
    neutral: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const current = variantStyles[resolvedVariant] || variantStyles.neutral;

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border transition-colors',
        current.bg,
        current.text,
        current.border,
        sizeStyles[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', current.dot)}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};
