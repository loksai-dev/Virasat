import React from 'react';
import { Shield, PhoneCall, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisclaimerFooterProps {
  className?: string;
  condensed?: boolean;
}

export const DisclaimerFooter: React.FC<DisclaimerFooterProps> = ({
  className,
  condensed = false,
}) => {
  return (
    <footer
      className={cn(
        'w-full border-t border-slate-200/80 bg-warm-sand text-slate-500 text-xs py-6 px-4 md:px-8',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Core Mandatory Legal Disclaimer */}
        <div className="flex items-center gap-2.5 text-center md:text-left">
          <Shield className="w-4 h-4 text-teal-600 shrink-0" />
          <p className="font-medium text-slate-600">
            <span className="font-semibold text-navy">Important:</span> Virasat provides guidance, not legal advice.
            <span className="hidden sm:inline text-slate-400 ml-1">
              For complex litigation or disputes, independent legal counsel is advised.
            </span>
          </p>
        </div>

        {/* Support & Human Care Hotline */}
        {!condensed && (
          <div className="flex items-center gap-6 flex-wrap justify-center text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600">
              <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
              <span>Family Care Concierge:</span>
              <strong className="text-navy font-semibold">1800-VIRASAT</strong>
            </span>

            <span className="flex items-center gap-1 text-slate-400">
              Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> for Indian families
            </span>

            <div className="flex items-center gap-3 text-slate-400">
              <span className="hover:text-navy cursor-pointer">Privacy</span>
              <span>•</span>
              <span className="hover:text-navy cursor-pointer">Security</span>
              <span>•</span>
              <span className="hover:text-navy cursor-pointer">Grievance Officer</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
