import React from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  variant?: 'white' | 'sand' | 'navy';
  noPadding?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  badge,
  children,
  className,
  headerClassName,
  bodyClassName,
  variant = 'white',
  noPadding = false,
}) => {
  const isNavy = variant === 'navy';
  const isSand = variant === 'sand';

  return (
    <section
      className={cn(
        'rounded-virasat border transition-all duration-200',
        isNavy
          ? 'bg-navy text-white border-navy-light shadow-soft'
          : isSand
          ? 'bg-[#F1EFEA] text-navy border-slate-300/70 shadow-sm'
          : 'bg-white text-navy border-slate-200/90 shadow-soft',
        className
      )}
    >
      {(title || subtitle || action || badge) && (
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 md:p-6 border-b',
            isNavy ? 'border-navy-light/60' : 'border-slate-100',
            headerClassName
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              {typeof title === 'string' ? (
                <h2 className={cn('text-xl font-semibold font-serif tracking-tight', isNavy ? 'text-white' : 'text-navy')}>
                  {title}
                </h2>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && (
              <p className={cn('text-xs md:text-sm', isNavy ? 'text-slate-400' : 'text-slate-500')}>
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={cn(noPadding ? 'p-0' : 'p-5 md:p-6', bodyClassName)}>
        {children}
      </div>
    </section>
  );
};
