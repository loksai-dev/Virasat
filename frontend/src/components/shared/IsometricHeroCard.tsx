import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Landmark, 
  Users, 
  Sparkles, 
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const IsometricHeroCard: React.FC<{ className?: string }> = ({ className }) => {
  const [prefersFlat, setPrefersFlat] = useState(false);

  useEffect(() => {
    try {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lowPower = typeof navigator !== 'undefined' && !!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
      if (reducedMotion || lowPower) {
        setPrefersFlat(true);
      }
    } catch {
      // safe fallback
    }
  }, []);

  return (
    <div className={cn('relative w-full max-w-xl mx-auto [perspective:1200px]', className)}>
      {/* Sample Card Notice Banner */}
      <div className="flex items-center justify-between px-3 py-1 mb-2 rounded-lg bg-slate-100/90 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
          <span>Interactive Preview</span>
        </span>
        <span className="text-[10px] uppercase font-mono tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
          Sample case, synthetic data
        </span>
      </div>

      {/* Interactive 3D Card: Crisp UI Panels with Real DOM Elements */}
      <div
        className={cn(
          'relative transition-all duration-500 ease-out [transform-style:preserve-3d]',
          prefersFlat
            ? 'transform-none'
            : 'transform lg:[transform:rotateY(-8deg)_rotateX(6deg)_rotateZ(1deg)] hover:rotate-0 hover:scale-[1.01]'
        )}
      >
        {/* Multi-Layer Deep Navy Blur Shadow */}
        <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_35px_60px_-15px_rgba(11,31,58,0.45),0_20px_30px_-10px_rgba(11,31,58,0.25),0_0_40px_rgba(20,184,166,0.15)] p-5 sm:p-6 text-left space-y-4">
          
          {/* Header: Ramesh Sharma Estate with robust flex/grid layout and balanced title */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center font-serif font-bold text-lg shadow-xs shrink-0">
                RS
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-[clamp(1rem,2vw,1.125rem)] font-serif font-bold text-[#0F172A] tracking-tight [text-wrap:balance] whitespace-normal">
                    Ramesh Sharma Estate
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#0D9488] font-sans flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">₹2.84 Cr across 12 Assets Synced</span>
                </div>
              </div>
            </div>

            {/* Case Docket: Placed cleanly, shifts down gracefully on narrow screens */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Case Docket</span>
              <span className="text-xs font-mono font-bold text-[#0F172A] bg-slate-50 sm:bg-transparent px-2 sm:px-0 py-0.5 sm:py-0 rounded border sm:border-0 border-slate-200">
                VR-2026-0142
              </span>
            </div>
          </div>

          {/* Section 1: Legal Heirs & Entitlement */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
              <div className="flex items-center gap-1.5 text-[#0B1F3A]">
                <Users className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Legal Heirs & Entitlement</span>
              </div>
              <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-1">
                <span>3 Class-I Heirs Verified</span>
              </span>
            </div>

            {/* Legal Heir List Rows */}
            <div className="space-y-2 text-xs">
              {/* 1. Sunita Sharma */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-3 shadow-2xs hover:border-[#14B8A6] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-teal-200">
                    SS
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <span className="truncate">1. Sunita Sharma</span>
                      <span className="text-[10px] text-[#64748B] font-normal">(Wife)</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">Primary Claimant • Nominee</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-[#0F172A] font-mono text-[11px]">33.34%</div>
                    <div className="text-[9px] text-[#64748B]">Entitlement</div>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* 2. Arjun Sharma */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-3 shadow-2xs hover:border-[#14B8A6] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-blue-200">
                    AS
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <span className="truncate">2. Arjun Sharma</span>
                      <span className="text-[10px] text-[#64748B] font-normal">(Son)</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">Family Executor • Nominee</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-[#0F172A] font-mono text-[11px]">33.33%</div>
                    <div className="text-[9px] text-[#64748B]">Entitlement</div>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* 3. Priya Sharma */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-3 shadow-2xs hover:border-[#14B8A6] transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-purple-200">
                    PS
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <span className="truncate">3. Priya Sharma</span>
                      <span className="text-[10px] text-[#64748B] font-normal">(Daughter)</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">Class-I Heir • Nominee</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-[#0F172A] font-mono text-[11px]">33.33%</div>
                    <div className="text-[9px] text-[#64748B]">Entitlement</div>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Asset Portfolio & Financial Desks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
              <div className="flex items-center gap-1.5 text-[#0B1F3A]">
                <Landmark className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Asset Portfolio & Verification</span>
              </div>
              <span className="text-[10px] text-[#64748B]">7 Financial Desks</span>
            </div>

            {/* Institution Rows */}
            <div className="space-y-1.5 text-xs">
              {/* 1. SBI Savings */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-[#0B1F3A] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    SBI
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] text-[11px] truncate">
                      1. SBI Savings Account (••••3912)
                    </div>
                    <div className="text-[10px] text-[#64748B]">Pension Account • ₹6,50,000</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0">
                  Verified ✓, Linked
                </span>
              </div>

              {/* 2. HDFC FDs */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-[#DC2626] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                    HDFC
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] text-[11px] truncate">
                      2. HDFC Savings & FDs (••••7721)
                    </div>
                    <div className="text-[10px] text-[#64748B]">No Nominee • ₹4,50,000</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0">
                  Verified ✓, Syncing
                </span>
              </div>

              {/* 3. Zerodha Demat */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-[#387ED1] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                    CDSL
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] text-[11px] truncate">
                      3. Zerodha Equity Portfolio (••••4491)
                    </div>
                    <div className="text-[10px] text-[#64748B]">Nifty 50 + SGBs • ₹45,00,000</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0">
                  Verified ✓, Linked
                </span>
              </div>

              {/* 4. LIC Policy */}
              <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-[#C9A227] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    LIC
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-[#0F172A] text-[11px] truncate">
                      4. LIC Jeevan Anand (••••4129)
                    </div>
                    <div className="text-[10px] text-[#64748B]">Form 3783 Pending • ₹30,00,000</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shrink-0">
                  Pending, Processing
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5 text-[#059669] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>SHA-256 Hash-Chained Audit Seal</span>
            </span>
            <span className="font-mono text-[#0F172A] font-semibold">12 Assets Reconciled</span>
          </div>
        </div>

        {/* Ambient Badges in 3D Space */}
        <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-[#0D9488] to-[#10B981] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 border border-white/20 [transform:translateZ(24px)]">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tamper-Evident SHA-256 Audit Seal</span>
        </div>

        <div className="absolute -top-3 -left-3 bg-[#0B1F3A] text-white border border-[#14B8A6]/40 text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 [transform:translateZ(20px)]">
          <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
          <span className="font-semibold text-white">5 Autonomous Agents Active</span>
        </div>
      </div>
    </div>
  );
};
