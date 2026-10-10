import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'blocked';
}

interface StepperProps {
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (step: StepItem, index: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = 'horizontal',
  className,
  onStepClick,
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'w-full',
        isHorizontal ? 'flex items-center justify-between' : 'flex flex-col space-y-6',
        className
      )}
    >
      {steps.map((step, idx) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isBlocked = step.status === 'blocked';
        const isLast = idx === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              'relative flex items-center',
              isHorizontal ? 'flex-1 last:flex-none' : 'w-full gap-4'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-3',
                onStepClick && 'cursor-pointer group'
              )}
              onClick={() => onStepClick?.(step, idx)}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-200',
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-teal-500 text-white ring-4 ring-teal-100 shadow-md scale-105'
                    : isBlocked
                    ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-300'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Text Info */}
              <div className="flex flex-col">
                <span
                  className={cn(
                    'text-xs md:text-sm font-semibold tracking-tight transition-colors',
                    isCurrent
                      ? 'text-teal-900 font-bold'
                      : isCompleted
                      ? 'text-navy'
                      : 'text-slate-400'
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline-block max-w-[140px] truncate">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connecting Bar */}
            {isHorizontal && !isLast && (
              <div className="flex-1 mx-3 h-0.5 bg-slate-200 overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    isCompleted ? 'bg-emerald-500 w-full' : isCurrent ? 'bg-teal-500 w-1/2' : 'w-0'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
