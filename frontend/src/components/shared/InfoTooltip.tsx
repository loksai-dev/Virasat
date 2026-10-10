import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  term?: string;
  children?: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  term,
  children,
  className,
  side = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center text-left group', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-navy focus:outline-none transition-colors"
      >
        {children ? (
          children
        ) : (
          <>
            {term && <span className="text-slate-600 border-b border-dotted border-slate-400">{term}</span>}
            <HelpCircle className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 w-64 max-w-xs p-3 text-xs leading-relaxed text-slate-700 bg-white rounded-xl shadow-elevated border border-slate-200 animate-in fade-in zoom-in-95 duration-150',
            positionClasses[side]
          )}
        >
          {term && <div className="font-semibold text-navy mb-1">{term}</div>}
          <div>{content}</div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-teal-600 font-medium flex items-center gap-1">
            <span>Virasat Plain English Guide</span>
          </div>
        </div>
      )}
    </div>
  );
};
