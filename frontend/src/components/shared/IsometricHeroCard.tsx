import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Landmark, 
  Users, 
  Sparkles, 
  FileCheck2, 
  Coins, 
  Building2, 
  TrendingUp,
  Image as ImageIcon,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const IsometricHeroCard: React.FC<{ className?: string }> = ({ className }) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'render'>('interactive');

  return (
    <div className={cn('relative w-full max-w-xl mx-auto [perspective:1200px]', className)}>
      {/* View Mode Toggle Switch (Top Corner) */}
      <div className="absolute -top-10 right-0 z-30 flex items-center gap-1 bg-navy-surface/90 border border-slate-700/80 px-2 py-1 rounded-full text-[11px] text-slate-300 backdrop-blur-md shadow-md">
        <button
          type="button"
          onClick={() => setViewMode('interactive')}
          className={cn(
            'px-2.5 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1',
            viewMode === 'interactive'
              ? 'bg-teal-accent text-navy font-bold shadow-xs'
              : 'hover:text-white'
          )}
        >
          <Layers className="w-3 h-3" />
          <span>Interactive 3D</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('render')}
          className={cn(
            'px-2.5 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1',
            viewMode === 'render'
              ? 'bg-teal-accent text-navy font-bold shadow-xs'
              : 'hover:text-white'
          )}
        >
          <ImageIcon className="w-3 h-3" />
          <span>4K Isometric Render</span>
        </button>
      </div>

      {/* Render View Mode: High-Res 4K Isometric Asset */}
      {viewMode === 'render' ? (
        <div className="relative transform lg:[transform:rotateY(-8deg)_rotateX(6deg)_rotateZ(1deg)] hover:rotate-0 hover:scale-[1.02] transition-transform duration-500 ease-out">
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0]/80 shadow-[0_35px_60px_-15px_rgba(11,31,58,0.55),0_20px_30px_-10px_rgba(11,31,58,0.35),0_0_50px_rgba(20,184,166,0.2)] bg-white">
            <img
              src="/isometric_hero_card.jpg"
              alt="Isometric 3D angled floating card of Ramesh Sharma Estate fintech dashboard"
              className="w-full h-auto object-cover block"
            />
          </div>
          {/* Subtle floating glow badge */}
          <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4K Hi-Fi Synthetic Render</span>
          </div>
        </div>
      ) : (
        /* Interactive 3D Card Mode: Crisp White UI Panels with Real DOM Elements */
        <div className="relative transform lg:[transform:rotateY(-8deg)_rotateX(6deg)_rotateZ(1deg)] hover:rotate-0 hover:scale-[1.01] transition-all duration-500 ease-out [transform-style:preserve-3d]">
          {/* Multi-Layer Deep Navy Blur Shadow */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_35px_60px_-15px_rgba(11,31,58,0.55),0_20px_30px_-10px_rgba(11,31,58,0.35),0_0_50px_rgba(20,184,166,0.18)] p-5 sm:p-6 text-left space-y-4">
            {/* Header: Ramesh Sharma Estate with ₹2.84 Cr across 12 Assets Synced */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm shrink-0">
                  RS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-serif font-bold text-[#0F172A] tracking-tight">
                      Ramesh Sharma Estate
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#0D9488] font-sans flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>₹2.84 Cr across 12 Assets Synced</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] text-[#64748B]">Case Docket</span>
                <span className="text-xs font-mono font-bold text-[#0F172A]">VR-2026-0142</span>
              </div>
            </div>

            {/* Section 1: Legal Heirs & Entitlement (Clean list rows with 33.34% entitlement splits & checkmarks) */}
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
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
                      alt="Sunita Sharma"
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E2E8F0]"
                    />
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
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                      alt="Arjun Sharma"
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E2E8F0]"
                    />
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
                    <img
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&auto=format&fit=crop&q=80"
                      alt="Priya Sharma"
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E2E8F0]"
                    />
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

            {/* Section 2: Asset Portfolio & Linked Financial Institutions */}
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

                {/* 5. Residential Property */}
                <div className="p-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#0D9488] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                      LAND
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-[#0F172A] text-[11px] truncate">
                        5. Residential Flat (Jubilee Hills)
                      </div>
                      <div className="text-[10px] text-[#64748B]">Title Mutation • ₹1,40,00,000</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0">
                    Verified ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1.5 text-[#059669] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>DigiLocker Cryptographic Seal Valid</span>
              </span>
              <span className="font-mono text-[#0F172A] font-semibold">12 Assets Reconciled</span>
            </div>
          </div>

          {/* Floating Subtle Ambient Badges in 3D Space */}
          <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-[#0D9488] to-[#10B981] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 border border-white/20 [transform:translateZ(24px)]">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>DigiLocker Certified SHA-256</span>
          </div>

          <div className="absolute -top-3 -left-3 bg-[#0B1F3A] text-white border border-[#14B8A6]/40 text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 [transform:translateZ(20px)]">
            <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span className="font-semibold text-white">3 Autonomous Agents Active</span>
          </div>
        </div>
      )}
    </div>
  );
};
