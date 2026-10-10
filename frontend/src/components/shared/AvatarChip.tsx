import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Person } from '@/mocks/peopleData';

interface AvatarChipProps {
  person: Person;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showShare?: boolean;
  className?: string;
}

export const AvatarChip: React.FC<AvatarChipProps> = ({
  person,
  isSelected = false,
  onClick,
  size = 'md',
  showShare = true,
  className,
}) => {
  const isDisputed = person.kycStatus === 'Disputed Flag';
  const isVerified = person.kycStatus === 'Verified';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'inline-flex items-center gap-3 p-2.5 pr-4 rounded-2xl border transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        isSelected
          ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500'
          : isDisputed
          ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
        className
      )}
    >
      {/* Avatar Image or Initials */}
      <div className="relative shrink-0">
        <img
          src={person.avatar}
          alt={person.name}
          className="w-10 h-10 rounded-full object-cover border border-slate-200"
          onError={(e) => {
            // fallback initials
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute -bottom-0.5 -right-0.5">
          {isVerified ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 bg-white rounded-full" />
          ) : isDisputed ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 bg-white rounded-full" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-500 bg-white rounded-full" />
          )}
        </div>
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-navy truncate">{person.name}</span>
          {person.isNominee && (
            <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
              Nominee
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{person.relationship}</span>
          <span>•</span>
          <span
            className={cn(
              person.legalHeirClass === 'Class-I Heir'
                ? 'text-teal-700 font-medium'
                : 'text-slate-500'
            )}
          >
            {person.legalHeirClass}
          </span>
        </div>
      </div>

      {showShare && person.assignedSharePercentage > 0 && (
        <div className="ml-auto pl-2 text-right">
          <span className="text-xs font-semibold tabular-nums text-navy">
            {person.assignedSharePercentage}%
          </span>
          <div className="text-[10px] text-slate-400">Share</div>
        </div>
      )}
    </div>
  );
};
