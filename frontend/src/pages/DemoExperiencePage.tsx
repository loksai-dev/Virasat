import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Award, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Compass, 
  AlertTriangle,
  Layers,
  Heart
} from 'lucide-react';
import { useVirasatStore, UserRole, CaseScenario } from '@/store/useVirasatStore';
import { baseCaseData } from '@/mocks/caseData';

export const DemoExperiencePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    role, 
    setRole, 
    scenario, 
    setScenario, 
    caseId, 
    setCaseId, 
    setTourActive, 
    addToast 
  } = useVirasatStore();

  // Ensure caseId defaults to the mock case if not set
  useEffect(() => {
    if (!caseId) {
      setCaseId(baseCaseData.id);
    }
    // Default scenario to Complex if undefined
    if (!scenario) {
      setScenario('complex');
    }
  }, [caseId, scenario, setCaseId, setScenario]);

  const roles = [
    {
      id: 'family' as UserRole,
      title: 'Family Member: settle an estate',
      badge: 'Survivor View',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      description: 'Step into Sunita and Arjun Sharma’s shoes. Access 12 asset folios, view statutory Class-I heir allocations, and track claims without legal jargon.',
      icon: Users,
      accent: 'teal',
      tagline: 'Recommended for emotional care & family workflows',
    },
    {
      id: 'institution' as UserRole,
      title: 'Bank / Insurer Officer: process claims faster',
      badge: 'Operations Desk',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Experience the centralized STP console for SBI, HDFC, and LIC claims managers. Inspect fraud scores, DigiLocker verified proofs, and execute instant signoffs.',
      icon: Building2,
      accent: 'gold',
      tagline: 'Recommended for ops velocity, KPIs & SLA management',
    },
    {
      id: 'judge' as UserRole,
      title: 'Judge Mode: guided 60-second tour',
      badge: 'Hackathon Evaluator',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      description: 'An expedited interactive walkthrough highlighting autonomous agent reasoning, Hindu Succession Act graph resolution, and fraud deterrence in 60 seconds.',
      icon: Award,
      accent: 'purple',
      tagline: 'Curated 60-second tour with guided spotlights',
    },
  ];

  const scenarios: { id: CaseScenario; label: string; desc: string }[] = [
    {
      id: 'simple',
      label: 'Simple (clear nominee)',
      desc: 'All assets have valid registered nominees; 85% fast-track completion.',
    },
    {
      id: 'complex',
      label: 'Complex (no will, multiple heirs)',
      desc: 'Intestate estate with 4 Class-I legal heirs requiring mutual NOC agreements.',
    },
    {
      id: 'disputed',
      label: 'Disputed (fraud flagged)',
      desc: 'Adverse claim by brother Vikram flagged by AI DisputeGuard with Section 8 defense.',
    },
  ];

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleScenarioSelect = (selectedScenario: CaseScenario) => {
    setScenario(selectedScenario);
  };

  const handleEnterDemo = () => {
    if (!role) return;

    const currentCaseId = caseId || 'VR-2026-0142';

    if (role === 'family') {
      setTourActive(false);
      addToast({
        type: 'success',
        title: 'Entering Family Experience',
        message: `Loaded Sharma Estate (${currentCaseId}) in ${scenario.toUpperCase()} scenario.`,
      });
      navigate(`/case/${currentCaseId}/start`);
    } else if (role === 'institution') {
      setTourActive(false);
      addToast({
        type: 'info',
        title: 'Entering Institutional Portal',
        message: 'Loaded Bank & Insurer Centralized Operations Console.',
      });
      navigate('/institution');
    } else if (role === 'judge') {
      setTourActive(true);
      addToast({
        type: 'success',
        title: 'Judge Mode Tour Initiated',
        message: '60-second guided evaluation walkthrough active.',
      });
      navigate(`/case/${currentCaseId}/start?tour=true`);
    }
  };

  return (
    <div className="min-h-screen bg-warm-sand flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Soft Ambient Highlights */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-1/3 w-80 h-80 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

      {/* Main Centered Card Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-virasat border border-slate-200/90 shadow-elevated p-6 sm:p-10 md:p-12 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Soft Header with Illustration */}
        <div className="text-center space-y-3">
          {/* Soft Heritage & Compass Illustration Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-50 via-amber-50 to-teal-50 border border-teal-200/80 flex items-center justify-center shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-700 shadow-xs">
              <Compass className="w-6 h-6 stroke-[1.75]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Interactive Simulator • Case ID {caseId || 'VR-2026-0142'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-navy tracking-tight">
            Explore Virasat
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Choose how you would like to experience the autonomous estate settlement platform. No login or password required.
          </p>
        </div>

        {/* 3 Large Selectable Role Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Step 1: Select Your Perspective
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((r) => {
              const isSelected = role === r.id;
              const Icon = r.icon;

              return (
                <div
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRoleSelect(r.id);
                    }
                  }}
                  className={`relative p-5 rounded-virasat border-2 text-left cursor-pointer transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    isSelected
                      ? 'bg-gradient-to-b from-teal-50/50 to-white border-teal-500 shadow-md ring-1 ring-teal-500 -translate-y-1'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-soft'
                  }`}
                >
                  {/* Selection Radio Indicator */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[1.75]" />
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-teal-500 border-teal-500 text-white shadow-xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Role Title & Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${r.badgeColor}`}>
                        {r.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-serif font-bold text-navy leading-snug">
                      {r.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {/* Card Footer Tagline */}
                  <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-teal-800 font-medium">
                    {r.tagline}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Selector: Three Scenarios as Chips */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 2: Select Estate Scenario
            </label>
            <span className="text-[11px] text-slate-500">
              Default: <strong>Complex (no will, multiple heirs)</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scenarios.map((sc) => {
              const isSelected = scenario === sc.id;

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleScenarioSelect(sc.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-navy text-white border-navy shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold">
                      {sc.label}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                    )}
                  </div>
                  <p className={`text-[11px] leading-snug ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button & Disclaimer Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-3">
          <button
            type="button"
            onClick={handleEnterDemo}
            disabled={!role}
            className={`w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-soft ${
              role
                ? 'bg-navy hover:bg-navy-light text-white cursor-pointer hover:-translate-y-0.5 shadow-elevated'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <span>Enter Demo</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {!role && (
            <p className="text-xs text-amber-700 font-medium animate-pulse">
              Please choose a role above to proceed to the demo.
            </p>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            All data is synthetic. Ramesh Sharma, family heirs, folios, and account records are realistic simulations for demonstration.
          </p>
        </div>
      </div>
    </div>
  );
};
