import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Scale,
  FileText,
  FileCheck2,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  X,
  Send,
  Building2,
  Users,
  Sparkles,
  Gavel,
  History,
  Download,
  AlertCircle,
  HelpCircle,
  Share2,
  FileSearch,
  Fingerprint,
  ChevronRight,
  Shield,
  Layers,
  Check
} from 'lucide-react';
import { formatINR, cn } from '@/lib/utils';
import { useVirasatStore, CaseScenario } from '@/store/useVirasatStore';

// =========================================================================
// TYPES & DATA DEFINITIONS
// =========================================================================
export type DisputeStatus = 
  | 'Flagged by AI Guard' 
  | 'Under Mediation' 
  | 'Forensic Alert' 
  | 'Resolved' 
  | 'Legal Escalation' 
  | 'Docs Requested';

export interface DisputeItem {
  id: string;
  claimId: string;
  assetId: string;
  title: string;
  assetName: string;
  category: string;
  severity: 'Critical' | 'Moderate' | 'Low';
  status: DisputeStatus;
  riskScore: number; // 0 - 100
  raisedBy: {
    name: string;
    relationship: string;
    advocate?: string;
  };
  evidencePoints: string[];
  recommendedAction: string;
  flaggedDate: string;
  resolutionTargetDate: string;
  statutoryBasis: string;
  involvedNodes: {
    deceased: string;
    target: string;
    claimant: string;
  };
}

const INITIAL_DISPUTES: DisputeItem[] = [
  {
    id: 'DISP-01',
    claimId: 'CLM-11',
    assetId: 'asset-11',
    title: 'Duplicate claim attempt by Vikram Sharma',
    assetName: 'Jubilee Hills Residential Flat (₹1.40 Cr)',
    category: 'Real Estate',
    severity: 'Critical',
    status: 'Flagged by AI Guard',
    riskScore: 84,
    raisedBy: {
      name: 'Vikram Sharma',
      relationship: 'Brother of Deceased (Class-II Relative)',
      advocate: 'Adv. S. K. Mahajan (Nagpur Bench)',
    },
    evidencePoints: [
      'Submitted informal handwritten memorandum dated May 10, 2018 alleging 50% ancestral co-ownership.',
      'Document bears zero stamp duty and zero registration under Section 17(1)(b) of Indian Registration Act, 1908; legally inadmissible.',
      'Under Section 8 & 9 of Hindu Succession Act 1956, Class-I heirs (Widow, Son, Daughter, Mother) completely exclude Class-II relatives.',
    ],
    recommendedAction:
      'Issue Section 8 Statutory Precedence Rebuttal to Sub-Registrar and submit certified MeeSeva Family Member Certificate.',
    flaggedDate: '2026-02-12',
    resolutionTargetDate: '2026-02-28',
    statutoryBasis: 'Section 8 & 9, Hindu Succession Act, 1956',
    involvedNodes: {
      deceased: 'Late Ramesh Sharma',
      target: 'Vikram Sharma (Brother • Excluded)',
      claimant: 'Sunita, Arjun, Priya & Kamala (Class-I)',
    },
  },
  {
    id: 'DISP-02',
    claimId: 'CLM-02',
    assetId: 'asset-2',
    title: 'Nominee mismatch at HDFC',
    assetName: 'HDFC Savings Account (₹4.5 Lakhs)',
    category: 'Banking',
    severity: 'Moderate',
    status: 'Under Mediation',
    riskScore: 68,
    raisedBy: {
      name: 'Vikram Sharma',
      relationship: 'Brother of Deceased',
    },
    evidencePoints: [
      'Account opened in 2017 with Nil nominee; an unverified handwritten slip listing brother was emailed in August 2023 without branch verification.',
      'Supreme Court landmark ruling (Sarbati Devi v. Usha Devi): Nominee only holds funds as trustee; funds vest strictly in Class-I legal heirs.',
      'Discrepancy flagged between HDFC centralized customer record and MeeSeva DigiLocker legal heir registry.',
    ],
    recommendedAction:
      'Furnish joint Class-I Indemnity Bond with surety and surviving spouse affidavit to HDFC Centralized Deceased Claim Cell.',
    flaggedDate: '2026-02-14',
    resolutionTargetDate: '2026-03-02',
    statutoryBasis: 'Supreme Court Ruling: Sarbati Devi (1984) 1 SCC 424',
    involvedNodes: {
      deceased: 'Late Ramesh Sharma',
      target: 'Vikram Sharma (Contested Nominee)',
      claimant: 'Sunita & Arjun Sharma (Beneficial Heirs)',
    },
  },
  {
    id: 'DISP-03',
    claimId: 'CLM-11',
    assetId: 'asset-11',
    title: 'Document tampering suspected (confidence 87%)',
    assetName: '2018 Family Memorandum Photocopy',
    category: 'Forensic Audit',
    severity: 'Critical',
    status: 'Forensic Alert',
    riskScore: 87,
    raisedBy: {
      name: 'Virasat AI Fraud Sentinel',
      relationship: 'Automated Forensic Detector',
    },
    evidencePoints: [
      'Digital forensics engine detected 87% signature stroke deviation compared to deceased’s registered banking KYC specimens at SBI.',
      'Metadata analysis indicates PDF was compiled in October 2023 using desktop software, directly contradicting claimed 2018 drafting date.',
      'Micro-level pixel interpolation and irregular ink pressure gradients identified around the signature stamp margin.',
    ],
    recommendedAction:
      'Dispatch formal forensic audit notice and require production of original physical deed for Government Forensic Science Laboratory (FSL) inspection.',
    flaggedDate: '2026-02-14',
    resolutionTargetDate: '2026-02-25',
    statutoryBasis: 'Section 45 & 47, Indian Evidence Act, 1872',
    involvedNodes: {
      deceased: 'Verified KYC Signature Specimen',
      target: 'Disputed Memorandum (87% Anomaly)',
      claimant: 'FSL Forensic Audit Channel',
    },
  },
];

export const DisputesPage: React.FC = () => {
  const { caseId: paramCaseId } = useParams();
  const navigate = useNavigate();
  const { caseId: storeCaseId, scenario, setScenario, addToast } = useVirasatStore();

  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Local dispute items state for interactive status updates
  const [disputes, setDisputes] = useState<DisputeItem[]>(INITIAL_DISPUTES);

  // Modal states
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [modalType, setModalType] = useState<'resolve' | 'escalate' | 'requestDocs' | null>(null);

  // Form selections for modals
  const [resolveReason, setResolveReason] = useState('Class-I Statutory Precedence Enforced');
  const [escalateAction, setEscalateAction] = useState('High Court Caveat Petition (Section 148A CPC)');
  const [selectedDocsToRequest, setSelectedDocsToRequest] = useState<string[]>([
    'Original physical 2018 memorandum for FSL lab testing',
    'Registered witness affidavits with biometric validation',
  ]);

  // Overall Risk Score calculation
  const overallRiskScore = useMemo(() => {
    if (scenario === 'simple') return 12;
    const activeDisputes = disputes.filter((d) => d.status !== 'Resolved');
    if (activeDisputes.length === 0) return 18;
    const avg = Math.round(activeDisputes.reduce((acc, d) => acc + d.riskScore, 0) / activeDisputes.length);
    return Math.max(avg, 74);
  }, [disputes, scenario]);

  // Handle Action Button Clicks
  const handleOpenModal = (dispute: DisputeItem, type: 'resolve' | 'escalate' | 'requestDocs') => {
    setSelectedDispute(dispute);
    setModalType(type);
  };

  const handleCloseModal = () => {
    setSelectedDispute(null);
    setModalType(null);
  };

  // Confirm Resolve
  const handleConfirmResolve = () => {
    if (!selectedDispute) return;
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === selectedDispute.id
          ? { ...d, status: 'Resolved' as DisputeStatus, riskScore: 15 }
          : d
      )
    );
    addToast({
      type: 'success',
      title: 'Dispute Marked as Resolved',
      message: `${selectedDispute.title} settled via: ${resolveReason}. Risk mitigated.`,
    });
    handleCloseModal();
  };

  // Confirm Escalate
  const handleConfirmEscalate = () => {
    if (!selectedDispute) return;
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === selectedDispute.id
          ? { ...d, status: 'Legal Escalation' as DisputeStatus }
          : d
      )
    );
    addToast({
      type: 'risk',
      title: 'Legal Escalation Initiated',
      message: `Docket transmitted: ${escalateAction}. Caveat docket drafted for High Court.`,
    });
    handleCloseModal();
  };

  // Confirm Request Docs
  const handleConfirmRequestDocs = () => {
    if (!selectedDispute) return;
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === selectedDispute.id
          ? { ...d, status: 'Docs Requested' as DisputeStatus }
          : d
      )
    );
    addToast({
      type: 'info',
      title: 'Evidence Requisition Notice Dispatched',
      message: `Notice dispatched to claimant requiring ${selectedDocsToRequest.length} supporting original documents.`,
    });
    handleCloseModal();
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-left relative">
      {/* Top Header Card */}
      <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>AI FRAUD & DISPUTE GUARD</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                Active Scenario: <strong className="capitalize">{scenario}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Dispute & Fraud Shield
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated legal standing verification, forensic document inspection, and statutory precedence defense.
            </p>
          </div>

          {/* Scenario Quick Selector */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <span className="text-xs text-slate-500 font-medium">Test Scenario:</span>
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs">
              {(['simple', 'complex', 'disputed'] as CaseScenario[]).map((sc) => (
                <button
                  key={sc}
                  onClick={() => {
                    setScenario(sc);
                    addToast({
                      type: sc === 'disputed' ? 'risk' : 'info',
                      title: `Scenario Switched: ${sc.toUpperCase()}`,
                      message:
                        sc === 'simple'
                          ? 'Zero dispute state activated. All 12 folios uncontested.'
                          : sc === 'disputed'
                          ? 'Fraud flags and Vikram Sharma adverse claim activated.'
                          : 'Complex scenario with mutual NOC protocol activated.',
                    });
                  }}
                  className={cn(
                    'px-3 py-1 rounded-lg font-bold capitalize transition-all',
                    scenario === sc
                      ? 'bg-navy text-white shadow-xs'
                      : 'text-slate-600 hover:text-navy hover:bg-white/60'
                  )}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top: Risk Heat Strip */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-navy uppercase tracking-wider text-[11px]">
                Estate Risk Heat Meter
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-mono text-slate-600">
                Current Level: <strong className={cn(overallRiskScore > 70 ? 'text-rose-600' : overallRiskScore > 40 ? 'text-amber-600' : 'text-emerald-600')}>{overallRiskScore}/100</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Critical Exposure</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Elevated Risk</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Safe Protected</span>
              </span>
            </div>
          </div>

          {/* Visual Gradient Heat Bar */}
          <div className="relative w-full h-3.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full w-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-rose-600"
            />
            {/* Indicator Needle */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-navy border-2 border-white rounded-full shadow-md -translate-x-1/2 transition-all duration-500"
              style={{ left: `${Math.min(Math.max(overallRiskScore, 5), 95)}%` }}
            />
          </div>

          {/* 4 Summary Heat Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Active Caveats</span>
              <span className="font-bold font-mono text-navy text-sm">
                {scenario === 'simple' ? '0' : '1 Active (Vikram)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Forgery Anomaly</span>
              <span className="font-bold font-mono text-rose-600 text-sm">
                {scenario === 'simple' ? '0 Flags' : '87% Stroke Variance'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nominee Conflicts</span>
              <span className="font-bold font-mono text-amber-700 text-sm">
                {scenario === 'simple' ? '0' : '1 (HDFC Savings)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Shielded Asset Value</span>
              <span className="font-bold font-mono text-teal-700 text-sm">
                {scenario === 'simple' ? '₹2.84 Cr' : '₹1.745 Cr'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCENARIO: SIMPLE (FRIENDLY EMPTY STATE)                                   */}
      {/* ========================================================================= */}
      {scenario === 'simple' ? (
        <div className="p-8 md:p-12 rounded-virasat bg-white border border-emerald-200 shadow-soft text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
            <ShieldCheck className="w-9 h-9 stroke-[1.75]" />
          </div>

          <div className="max-w-lg mx-auto space-y-1.5">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
              ALL 12 ASSETS UNCONTESTED
            </span>
            <h2 className="text-2xl font-serif font-bold text-navy">
              Zero Active Disputes or Fraud Flags
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              In this scenario, all registered nominees are confirmed, all DigiLocker family certificates match statutory Class-I entitlement, and no adverse caveats have been lodged in Telangana High Court or MeeSeva portals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="font-semibold text-navy">Nominees Confirmed</div>
              <div className="text-[11px] text-slate-500">SBI, HDFC, ICICI, LIC pre-matched</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="font-semibold text-navy">No Adverse Caveats</div>
              <div className="text-[11px] text-slate-500">High Court registry clear</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="font-semibold text-navy">Class-I Precedence</div>
              <div className="text-[11px] text-slate-500">Section 8 HSA undisputed</div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setScenario('disputed');
                addToast({
                  type: 'risk',
                  title: 'Disputed Scenario Activated',
                  message: 'Revealing 3 flagged dispute items and AI mediator panel.',
                });
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-md flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Simulate Disputed Scenario (View 3 Flags)</span>
            </button>

            <button
              onClick={() => navigate(`/case/${activeCaseId}/claims`)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-navy hover:bg-slate-50 transition-colors"
            >
              View Claims Pipeline →
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCENARIO: DISPUTED / COMPLEX (MAIN 3 FLAGGED CARDS + RIGHT PANELS)         */
        /* ========================================================================= */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: 3 Main Flagged Dispute Cards (8 Cols) */}
          <div className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                  <span>Flagged Dispute & Fraud Dossiers</span>
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center font-mono">
                    {disputes.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Each incident contains statutory analysis, forensic evidence, and action protocols.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Cryptographically Signed SHA-256
              </span>
            </div>

            {/* List of 3 Flagged Dispute Cards */}
            <div className="space-y-5">
              {disputes.map((dispute) => {
                const isResolved = dispute.status === 'Resolved';
                const isEscalated = dispute.status === 'Legal Escalation';
                const isDocs = dispute.status === 'Docs Requested';

                return (
                  <div
                    key={dispute.id}
                    className={cn(
                      'p-6 rounded-virasat bg-white border shadow-soft space-y-5 transition-all text-left relative overflow-hidden',
                      isResolved
                        ? 'border-emerald-200 bg-emerald-50/15'
                        : isEscalated
                        ? 'border-purple-300 ring-1 ring-purple-200'
                        : 'border-slate-200/90 hover:border-slate-300'
                    )}
                  >
                    {/* Top Row: Title, Severity & Status Pill */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {dispute.id}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              dispute.severity === 'Critical'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {dispute.severity} Severity
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2.5 py-0.5 rounded-full border',
                              isResolved
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isEscalated
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : isDocs
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            ● {dispute.status}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-serif font-bold text-navy">
                          {dispute.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Target Folio: <strong className="text-navy">{dispute.assetName}</strong> • Claim Ref: <span className="font-mono">{dispute.claimId}</span>
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-1 shrink-0">
                        <div className="text-xs font-semibold text-slate-400">Risk Score</div>
                        <div className={cn('text-xl font-bold font-mono', isResolved ? 'text-emerald-600' : 'text-rose-600')}>
                          {dispute.riskScore}/100
                        </div>
                      </div>
                    </div>

                    {/* Evidence Section */}
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                      <div className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                        <FileSearch className="w-3.5 h-3.5 text-teal-600" />
                        <span>Forensic & Statutory Evidence:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed pl-1">
                        {dispute.evidencePoints.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-1 text-[10px] text-slate-500 font-mono">
                        Governing Law: <strong className="text-slate-700">{dispute.statutoryBasis}</strong>
                      </div>
                    </div>

                    {/* Mini Graph Snippet linking to /heirs */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Kinship Conflict Relationship Snippet
                        </span>
                        {/* Visual Node Representation */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-serif font-bold text-[11px]">
                            {dispute.involvedNodes.deceased}
                          </span>
                          <span className="text-slate-400 font-mono">⇄</span>
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-300 font-semibold text-[11px] border-dashed">
                            {dispute.involvedNodes.target}
                          </span>
                          <span className="text-slate-400 font-mono">vs</span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                            {dispute.involvedNodes.claimant}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/case/${activeCaseId}/heirs?selected=p-vikram`}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-400 transition-all shadow-xs"
                      >
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        <span>Inspect in Kinship Graph →</span>
                      </Link>
                    </div>

                    {/* Recommended Action */}
                    <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/70 text-xs space-y-1">
                      <div className="font-bold text-teal-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>AI Recommended Action:</span>
                      </div>
                      <p className="text-teal-800 leading-relaxed text-[11px]">
                        {dispute.recommendedAction}
                      </p>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Resolve Button */}
                        <button
                          onClick={() => handleOpenModal(dispute, 'resolve')}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>

                        {/* Escalate Button */}
                        <button
                          onClick={() => handleOpenModal(dispute, 'escalate')}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Gavel className="w-3.5 h-3.5 text-amber-400" />
                          <span>Escalate</span>
                        </button>

                        {/* Request Documents Button */}
                        <button
                          onClick={() => handleOpenModal(dispute, 'requestDocs')}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>Request documents</span>
                        </button>
                      </div>

                      {/* Open Claim Button */}
                      <button
                        onClick={() => navigate(`/case/${activeCaseId}/claims/${dispute.claimId}`)}
                        className="text-xs font-semibold text-slate-600 hover:text-navy flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span>Open claim docket</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Risk-Score Donut + Mediator Panel + Timeline (4 Cols) */}
          <div className="xl:col-span-4 space-y-6">
            {/* Risk-Score Donut Panel */}
            <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-serif font-bold text-navy">Risk-Score Donut</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono border border-rose-200 font-semibold">
                  Critical Vulnerability
                </span>
              </div>

              {/* SVG Donut Chart */}
              <div className="flex items-center justify-center relative py-2">
                <svg viewBox="0 0 160 160" className="w-40 h-40 transform -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="#F1F5F9"
                    strokeWidth="18"
                    fill="transparent"
                  />
                  {/* Document Forgery Slice: 45% (stroke-dasharray ~ 170 377) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="#EF4444"
                    strokeWidth="18"
                    strokeDasharray="170 377"
                    strokeDashoffset="0"
                    fill="transparent"
                  />
                  {/* Class-II Caveat Slice: 35% (stroke-dasharray ~ 132 377) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="#F59E0B"
                    strokeWidth="18"
                    strokeDasharray="132 377"
                    strokeDashoffset="-170"
                    fill="transparent"
                  />
                  {/* Nominee Mismatch Slice: 20% (stroke-dasharray ~ 75 377) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    stroke="#0284C7"
                    strokeWidth="18"
                    strokeDasharray="75 377"
                    strokeDashoffset="-302"
                    fill="transparent"
                  />
                </svg>

                {/* Central Score Label */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-mono font-bold text-navy">
                    {overallRiskScore}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Risk Index</span>
                </div>
              </div>

              {/* Slices Legend */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600">Document Forgery (87%)</span>
                  </div>
                  <span className="font-mono font-bold text-navy text-[11px]">45%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600">Class-II Adverse Caveat</span>
                  </div>
                  <span className="font-mono font-bold text-navy text-[11px]">35%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span className="text-slate-600">HDFC Nominee Contest</span>
                  </div>
                  <span className="font-mono font-bold text-navy text-[11px]">20%</span>
                </div>
              </div>
            </div>

            {/* AI Settlement Mediator Panel */}
            <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base font-serif font-bold text-navy">AI Settlement Mediator</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono font-bold">
                  Recommended Path
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Virasat AI Conciliation Engine suggests an optimal 3-phase path to eliminate litigation delays:
              </p>

              {/* 3-Phase Resolution Path */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center">1</span>
                    <span>Phase 1: Precedence Enforcement</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
                    Serve automated statutory rebuttal citing Supreme Court precedence in <em>Kale v. DD Consolidation</em> to Vikram's counsel.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                    <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center">2</span>
                    <span>Phase 2: Structured Family Settlement</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
                    Offer ₹3.0 Lakhs discretionary goodwill annuity from commercial rental yield in exchange for registered irrevocable relinquishment deed.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center">3</span>
                    <span>Phase 3: High Court Caveat Filing</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
                    Lodge Section 148A CPC caveat petition in High Court of Telangana to preempt surprise ex-parte injunctions.
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  addToast({
                    type: 'success',
                    title: 'Conciliation Deed Generated',
                    message: 'Draft Family Settlement Deed and Section 8 Rebuttal transmitted to legal vault.',
                  })
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Generate Conciliation Draft Deed</span>
              </button>
            </div>

            {/* Timeline of Events Panel */}
            <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-serif font-bold text-navy">Timeline of Events</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Bi-Temporal Trail</span>
              </div>

              {/* Event Chain */}
              <div className="space-y-3.5 relative pl-4 border-l-2 border-slate-200 text-xs">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                  <div className="font-mono text-[10px] text-slate-400">May 10, 2018</div>
                  <div className="font-bold text-navy">Informal Memorandum Signed</div>
                  <div className="text-[11px] text-slate-500">Unregistered paper executed in Nagpur without witnesses.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                  <div className="font-mono text-[10px] text-slate-400">Aug 11, 2023</div>
                  <div className="font-bold text-navy">HDFC Informal Nomination Slip</div>
                  <div className="text-[11px] text-slate-500">Brother submitted photocopy via email without deceased attestation.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
                  <div className="font-mono text-[10px] text-slate-400">Jan 14, 2026</div>
                  <div className="font-bold text-navy">Ramesh Sharma Passed Away</div>
                  <div className="text-[11px] text-slate-500">Died intestate; Section 8 Class-I statutory first right locked in.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-white" />
                  <div className="font-mono text-[10px] text-slate-400">Feb 12, 2026</div>
                  <div className="font-bold text-navy">Caveat Objection Lodged</div>
                  <div className="text-[11px] text-slate-500">Vikram Sharma filed caveat objection at Tahsildar office.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white" />
                  <div className="font-mono text-[10px] text-slate-400">Feb 14, 2026</div>
                  <div className="font-bold text-navy">AI DisputeGuard Forensic Match</div>
                  <div className="text-[11px] text-slate-500">Detected 87% signature stroke deviation and Class-I legal bar.</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white animate-ping" />
                  <div className="font-mono text-[10px] text-emerald-700 font-bold">TODAY (Feb 18, 2026)</div>
                  <div className="font-bold text-navy">Active Defense & Conciliation</div>
                  <div className="text-[11px] text-slate-500">Section 9 Precedence Defense actively shielding estate folios.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION MODALS: RESOLVE / ESCALATE / REQUEST DOCS                          */}
      {/* ========================================================================= */}

      {/* 1. RESOLVE MODAL */}
      {modalType === 'resolve' && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                  RESOLVE DISPUTE
                </span>
                <h3 className="text-lg font-serif font-bold text-navy mt-1">
                  Resolve: {selectedDispute.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Select the certified legal mechanism to conclude this dispute item.
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-navy p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block text-[11px]">
                Resolution Mechanism
              </label>
              {[
                'Class-I Statutory Precedence Enforced (Vikram Withdrew Objection)',
                'Registered Family Settlement Agreement Executed with Relinquishment Deed',
                'Bank Joint Indemnity Bond Signed with Nominee Waiver',
              ].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="resolveReason"
                    checked={resolveReason === opt}
                    onChange={() => setResolveReason(opt)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-800">{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Resolution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ESCALATE MODAL */}
      {modalType === 'escalate' && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                  LEGAL ESCALATION
                </span>
                <h3 className="text-lg font-serif font-bold text-navy mt-1">
                  Escalate: {selectedDispute.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Initiate formal judicial or regulatory escalation protocols.
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-navy p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block text-[11px]">
                Escalation Protocol
              </label>
              {[
                'High Court Caveat Petition (Section 148A CPC) against adverse interim stay',
                'Referral to Telangana Forensic Science Laboratory (FSL) for ink/paper age analysis',
                'Formal Bar Council Complaint against adverse counsel for frivolous caveat',
              ].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="escalateAction"
                    checked={escalateAction === opt}
                    onChange={() => setEscalateAction(opt)}
                    className="text-navy focus:ring-navy"
                  />
                  <span className="text-xs text-slate-800">{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEscalate}
                className="px-5 py-2.5 rounded-xl font-bold bg-navy text-white hover:bg-navy-light shadow-sm flex items-center gap-1.5"
              >
                <Gavel className="w-4 h-4 text-amber-400" />
                <span>Confirm Escalation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REQUEST DOCUMENTS MODAL */}
      {modalType === 'requestDocs' && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-mono">
                  EVIDENCE REQUISITION
                </span>
                <h3 className="text-lg font-serif font-bold text-navy mt-1">
                  Request Supporting Evidence
                </h3>
                <p className="text-xs text-slate-500">
                  Issue formal demand notice to adverse party requiring production of original physical deeds.
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-navy p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block text-[11px]">
                Select Documents to Demand
              </label>
              {[
                'Original physical 2018 memorandum for FSL lab testing',
                'Registered witness affidavits with biometric validation',
                'Proof of consideration or bank transaction trail for co-ownership claim',
                'Certified Vakalatnama and Bar Council identity of legal representative',
              ].map((doc) => {
                const isChecked = selectedDocsToRequest.includes(doc);
                return (
                  <label
                    key={doc}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocsToRequest([...selectedDocsToRequest, doc]);
                        } else {
                          setSelectedDocsToRequest(selectedDocsToRequest.filter((d) => d !== doc));
                        }
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-800">{doc}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestDocs}
                className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Requisition Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputesPage;
