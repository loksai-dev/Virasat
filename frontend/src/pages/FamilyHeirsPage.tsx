import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ExternalLink,
  Layers,
  Clock,
  Calendar,
  Sliders,
  Eye,
  Check,
  Building2,
  Landmark,
  Coins,
  AlertCircle
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

// =========================================================================
// BI-TEMPORAL TIMELINE DEFINITION
// =========================================================================
interface TimeSnapshot {
  id: string;
  date: string;
  label: string;
  description: string;
  validAt: string;
  knownAt: string;
}

const TIMELINE_SNAPSHOTS: TimeSnapshot[] = [
  {
    id: 'snap-2018',
    date: '2018-05-10',
    label: '2018: Pre-Nomination',
    description: 'Vikram memorandum drafted; flat purchased; no formal demat nominee.',
    validAt: '2018-05-10',
    knownAt: '2026-01-20',
  },
  {
    id: 'snap-2022',
    date: '2022-09-18',
    label: '2022: SEBI Demat Updated',
    description: 'Arjun registered on Zerodha Demat; Sunita confirmed on LIC policy.',
    validAt: '2022-09-18',
    knownAt: '2026-01-20',
  },
  {
    id: 'snap-2024',
    date: '2024-03-05',
    label: '2024: Full Banking Registry',
    description: 'All 7 bank accounts and mutual funds mapped to primary Class-I heirs.',
    validAt: '2024-03-05',
    knownAt: '2026-01-20',
  },
  {
    id: 'snap-2026-jan',
    date: '2026-01-14',
    label: 'Jan 2026: Intestate Succession',
    description: 'Ramesh Sharma passes away intestate; Class-I statutory first right locks in.',
    validAt: '2026-01-14',
    knownAt: '2026-01-20',
  },
  {
    id: 'snap-2026-feb',
    date: '2026-02-18',
    label: 'Feb 2026: Current State',
    description: 'Vikram adverse caveat filed; Virasat AI Precedence Rebuttal active.',
    validAt: '2026-02-18',
    knownAt: '2026-02-18',
  },
];

// =========================================================================
// PERSON & ASSET METADATA
// =========================================================================
interface EntityDetail {
  id: string;
  type: 'person' | 'asset' | 'memorandum';
  name: string;
  role: string;
  relationship?: string;
  status: 'eligible' | 'needs_docs' | 'conflict' | 'deceased' | 'active_asset';
  statusLabel: string;
  sharePercent: number;
  shareAmount: number;
  avatar?: string;
  legalBasis: string;
  requiredDocuments: string[];
  lawCitations: {
    title: string;
    section: string;
    summary: string;
  }[];
  assetId?: string;
}

const ENTITY_DETAILS: Record<string, EntityDetail> = {
  'p-ramesh': {
    id: 'p-ramesh',
    type: 'person',
    name: 'Late Ramesh Sharma',
    role: 'Deceased Propositus',
    relationship: 'Propositus (Self)',
    status: 'deceased',
    statusLabel: 'Deceased (1958–2026)',
    sharePercent: 100,
    shareAmount: 28400000,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Propositus whose intestate estate devolves upon surviving heirs under Section 8 of the Hindu Succession Act, 1956.',
    requiredDocuments: [
      'Certified Death Certificate (GHMC/2026/004812)',
      'PAN Deactivation Certificate',
      'MeeSeva Family Member Certificate',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession Act, 1956',
        section: 'Section 8 (General rules of succession)',
        summary: 'The property of a male Hindu dying intestate devolves firstly upon Class-I heirs enumerated in the Schedule.',
      },
    ],
  },
  'p-sunita': {
    id: 'p-sunita',
    type: 'person',
    name: 'Sunita Sharma',
    role: 'Surviving Spouse • Primary Claimant',
    relationship: 'Spouse',
    status: 'eligible',
    statusLabel: 'Class-I Heir (Eligible)',
    sharePercent: 40,
    shareAmount: 11360000,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Surviving widow holding statutory first right under Section 8 and Class-I Schedule. Nominee on SBI savings, ICICI FD, and LIC policy.',
    requiredDocuments: [
      'Aadhaar & PAN Verification (Completed)',
      'Marriage Registration / Surviving Spouse Affidavit',
      'Bank Transmission Form Annexure-A',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession Act, 1956',
        section: 'Class-I Schedule (Widow)',
        summary: 'The widow takes one share. When there are more widows than one, all take together one share.',
      },
      {
        title: 'Insurance Laws (Amendment) Act, 2015',
        section: 'Section 39(7) (Beneficial Nominee)',
        summary: 'Nomination in favor of spouse or children confers beneficial ownership of the proceeds over all other claimants.',
      },
      {
        title: 'Supreme Court of India',
        section: 'Sarbati Devi v. Usha Devi (1984)',
        summary: 'Nominee holds funds as trustee for Class-I legal heirs; nomination does not destroy intestate succession.',
      },
    ],
  },
  'p-arjun': {
    id: 'p-arjun',
    type: 'person',
    name: 'Arjun Sharma',
    role: 'Son • Appointed Family Executor',
    relationship: 'Son (Child)',
    status: 'eligible',
    statusLabel: 'Class-I Heir (Eligible)',
    sharePercent: 20,
    shareAmount: 5680000,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Legitimate son holding simultaneous statutory share under Section 8. Registered nominee on Zerodha Demat account.',
    requiredDocuments: [
      'Aadhaar OTP e-Sign (Completed)',
      'Client Master Report (CMR) for Demat Transmission',
      'Form 31 RC Endorsement for Vehicle',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession Act, 1956',
        section: 'Section 8 & 9 (Order of succession)',
        summary: 'Sons and daughters take simultaneously and in equal proportions with the widow.',
      },
      {
        title: 'Motor Vehicles Act, 1988',
        section: 'Rule 56 (Transfer on death)',
        summary: 'Permits vehicle registration transfer to legal successor upon furnishing death certificate and family NOC.',
      },
    ],
  },
  'p-priya': {
    id: 'p-priya',
    type: 'person',
    name: 'Priya Sharma',
    role: 'Daughter • Class-I Coparcener',
    relationship: 'Daughter (Child)',
    status: 'eligible',
    statusLabel: 'Class-I Heir (Eligible)',
    sharePercent: 20,
    shareAmount: 5680000,
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Daughter holding equal statutory rights as coparcener pursuant to the Hindu Succession (Amendment) Act, 2005.',
    requiredDocuments: [
      'Digital e-KYC Verification (Completed)',
      'CAMS Mutual Fund Transmission Form T3',
      'Cancelled Cheque for Bank Mandate',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession (Amendment) Act, 2005',
        section: 'Section 6 (Coparcenary rights to daughters)',
        summary: 'Daughters are coparceners by birth in their own right in the same manner as sons.',
      },
      {
        title: 'SEBI Mutual Fund Master Circular',
        section: 'Chapter 14 (Transmission of Units)',
        summary: 'Standardized transmission upon KYC compliance and relationship proof.',
      },
    ],
  },
  'p-kamala': {
    id: 'p-kamala',
    type: 'person',
    name: 'Kamala Sharma',
    role: 'Surviving Mother (88 yo) • Class-I Heir',
    relationship: 'Mother (Parent)',
    status: 'needs_docs',
    statusLabel: 'Needs In-Person KYC / Thumbprint',
    sharePercent: 20,
    shareAmount: 5680000,
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Surviving mother of the deceased; takes an equal share with the widow and children under Class-I Schedule.',
    requiredDocuments: [
      'In-person Assisted Biometric KYC or Thumbprint Attestation',
      'Life Certificate / Bank Verification Form',
      'Legal Concierge Home Visit Scheduled',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession Act, 1956',
        section: 'Class-I Schedule (Mother)',
        summary: 'The mother of the intestate takes an equal share alongside the widow and children.',
      },
      {
        title: 'RBI Master Circular on Deceased Depositors',
        section: 'Para 3.2 (Elderly Heir Settlement)',
        summary: 'Provides doorstep verification facility for elderly and infirm legal heirs.',
      },
    ],
  },
  'p-vikram': {
    id: 'p-vikram',
    type: 'person',
    name: 'Vikram Sharma',
    role: 'Surviving Brother • Class-II Relative',
    relationship: 'Brother (Sibling)',
    status: 'conflict',
    statusLabel: 'Excluded by Class-I Heirs (Disputed)',
    sharePercent: 0,
    shareAmount: 0,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    legalBasis: 'Class-II relative (Entry II, Rule 1). Expressly excluded by living Class-I heirs. The 2018 informal memorandum is legally inoperative.',
    requiredDocuments: [
      'Section 8 Statutory Precedence Rebuttal Docket (Served)',
      'Sub-Registrar Title Clarification Notice',
      'High Court Caveat Search Certificate',
    ],
    lawCitations: [
      {
        title: 'Hindu Succession Act, 1956',
        section: 'Section 8 & Section 9 (Class-II exclusion)',
        summary: 'Class-II relatives inherit only if there is no heir of Class-I. Living spouse and children completely bar brothers.',
      },
      {
        title: 'Indian Registration Act, 1908',
        section: 'Section 17 (Compulsory registration)',
        summary: 'Instruments conferring title in immovable property require mandatory registration; unnotarized memoranda hold nil evidentiary weight.',
      },
    ],
  },
  // Assets
  'a-zerodha': {
    id: 'a-zerodha',
    type: 'asset',
    name: 'Zerodha Demat Account',
    role: 'Equity & SGB Holdings (₹45.0 Lakhs)',
    status: 'active_asset',
    statusLabel: 'Nominee: Arjun Sharma',
    sharePercent: 100,
    shareAmount: 4500000,
    assetId: 'asset-4',
    legalBasis: 'Demat portfolio governed by CDSL bylaws and SEBI transmission circular 2022. Nominee Arjun Sharma holds title to transfer.',
    requiredDocuments: ['Transmission Request Form (Annexure 7)', 'Client Master Report (CMR)'],
    lawCitations: [
      {
        title: 'SEBI Depositories Regulations, 2018',
        section: 'Regulation 53 (Transmission of Securities)',
        summary: 'Transmission to registered nominee proceeds without succession certificate up to statutory threshold.',
      },
    ],
  },
  'a-lic': {
    id: 'a-lic',
    type: 'asset',
    name: 'LIC Jeevan Anand Policy',
    role: 'Life Insurance Proceeds (₹30.0 Lakhs)',
    status: 'active_asset',
    statusLabel: 'Beneficial Nominee: Sunita Sharma',
    sharePercent: 100,
    shareAmount: 3000000,
    assetId: 'asset-6',
    legalBasis: 'Governed by Section 39 of Insurance Act. Sunita Sharma is a statutory Beneficial Nominee.',
    requiredDocuments: ['Discharge Voucher Form 3783', 'Original Policy Bond'],
    lawCitations: [
      {
        title: 'Insurance Act, 1938 (Amended 2015)',
        section: 'Section 39(7)',
        summary: 'Beneficial nominee takes absolute ownership over third-party family contests.',
      },
    ],
  },
  'a-flat': {
    id: 'a-flat',
    type: 'asset',
    name: 'Jubilee Hills 3BHK Flat',
    role: 'Residential Real Estate (₹1.40 Cr)',
    status: 'active_asset',
    statusLabel: 'Intestate Estate Asset',
    sharePercent: 100,
    shareAmount: 14000000,
    assetId: 'asset-11',
    legalBasis: 'Immovable property registered under Late Ramesh Sharma. 100% devolves upon 4 Class-I heirs equally.',
    requiredDocuments: ['Registered Sale Deed', 'Family Member Certificate (Tahsildar)', 'GHMC Mutation Form'],
    lawCitations: [
      {
        title: 'Registration Act, 1908',
        section: 'Section 17 & Section 49',
        summary: 'Unregistered family documents cannot affect immovable property or be received in evidence.',
      },
    ],
  },
  'a-sbi': {
    id: 'a-sbi',
    type: 'asset',
    name: 'SBI Savings Account',
    role: 'Banking Deposit (₹6.5 Lakhs)',
    status: 'active_asset',
    statusLabel: 'Nominee: Sunita Sharma',
    sharePercent: 100,
    shareAmount: 650000,
    assetId: 'asset-1',
    legalBasis: 'Pension credit account settled to registered survivor Sunita Sharma.',
    requiredDocuments: ['Death Certificate', 'Nominee KYC'],
    lawCitations: [
      {
        title: 'Banking Regulation Act, 1949',
        section: 'Section 45ZA (Nomination facility)',
        summary: 'Payment to registered nominee constitutes full discharge of bank liabilities.',
      },
    ],
  },
  'a-hdfc': {
    id: 'a-hdfc',
    type: 'asset',
    name: 'HDFC Savings Account',
    role: 'Banking Deposit (₹4.5 Lakhs)',
    status: 'active_asset',
    statusLabel: 'Disputed Nominee Contest',
    sharePercent: 100,
    shareAmount: 450000,
    assetId: 'asset-2',
    legalBasis: 'Brother filed informal claim. AI Precedence Rebuttal filed to enforce Class-I statutory precedence.',
    requiredDocuments: ['Class-I Indemnity Bond', 'Legal Heir Certificate'],
    lawCitations: [
      {
        title: 'Supreme Court of India',
        section: 'Sarbati Devi Precedent',
        summary: 'Nominee holds funds as trustee for Class-I legal heirs.',
      },
    ],
  },
};

export const FamilyHeirsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: paramCaseId } = useParams();
  const { caseId: storeCaseId } = useVirasatStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Bi-temporal URL params
  const validAtParam = searchParams.get('validAt') || '2026-02-18';
  const knownAtParam = searchParams.get('knownAt') || '2026-02-18';
  const biTemporalMode = (searchParams.get('mode') as 'valid' | 'known') || 'valid';

  // Layer filters
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showNominees, setShowNominees] = useState<boolean>(true);
  const [showWill, setShowWill] = useState<boolean>(false);

  // Time travel slider index (0 to 4)
  const currentSnapshotIndex = useMemo(() => {
    const idx = TIMELINE_SNAPSHOTS.findIndex((s) => s.validAt === validAtParam);
    return idx !== -1 ? idx : TIMELINE_SNAPSHOTS.length - 1;
  }, [validAtParam]);

  const activeSnapshot = TIMELINE_SNAPSHOTS[currentSnapshotIndex];

  // Selected Entity in Right Panel (default to Sunita Sharma or Ramesh)
  const [selectedEntityId, setSelectedEntityId] = useState<string>('p-sunita');
  const [showLawCitations, setShowLawCitations] = useState<boolean>(true);

  // Cytoscape DOM container
  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Handle Snapshot / Slider changes
  const handleSliderChange = (newIndex: number) => {
    const snap = TIMELINE_SNAPSHOTS[newIndex];
    if (!snap) return;

    const newParams = new URLSearchParams(searchParams);
    newParams.set('validAt', snap.validAt);
    newParams.set('knownAt', snap.knownAt);
    newParams.set('mode', biTemporalMode);
    setSearchParams(newParams);
  };

  const handleModeToggle = (mode: 'valid' | 'known') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('mode', mode);
    setSearchParams(newParams);
  };

  // Build Cytoscape Elements based on active Snapshot and Layer Toggles
  const cyElements = useMemo(() => {
    const is2018 = activeSnapshot.validAt === '2018-05-10';
    const is2022 = activeSnapshot.validAt === '2022-09-18';
    const isPreDeath = is2018 || is2022 || activeSnapshot.validAt === '2024-03-05';

    const elements: cytoscape.ElementDefinition[] = [];

    // 1. Center Node: Late Ramesh Sharma (Gold)
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-ramesh',
        label: isPreDeath ? 'Ramesh Sharma\n(Propositus)' : 'Late Ramesh Sharma\n(Deceased • ₹2.84 Cr)',
        type: 'deceased',
        color: '#C9A227',
        borderColor: '#92400E',
        size: 76,
      },
      position: { x: 380, y: 250 },
    });

    // 2. Sunita Sharma (Spouse • Green eligible)
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-sunita',
        label: 'Sunita Sharma\n(Spouse • 40%)',
        type: 'eligible',
        color: '#10B981',
        borderColor: '#047857',
        size: 64,
      },
      position: { x: 180, y: 130 },
    });
    elements.push({
      group: 'edges',
      data: {
        id: 'e-ramesh-sunita',
        source: 'p-ramesh',
        target: 'p-sunita',
        label: 'spouse',
        color: '#10B981',
        lineStyle: 'solid',
      },
    });

    // 3. Arjun Sharma (Son • Green eligible)
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-arjun',
        label: 'Arjun Sharma\n(Son • 20%)',
        type: 'eligible',
        color: '#10B981',
        borderColor: '#047857',
        size: 60,
      },
      position: { x: 230, y: 390 },
    });
    elements.push({
      group: 'edges',
      data: {
        id: 'e-ramesh-arjun',
        source: 'p-ramesh',
        target: 'p-arjun',
        label: 'child (son)',
        color: '#10B981',
        lineStyle: 'solid',
      },
    });

    // 4. Priya Sharma (Daughter • Green eligible)
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-priya',
        label: 'Priya Sharma\n(Daughter • 20%)',
        type: 'eligible',
        color: '#10B981',
        borderColor: '#047857',
        size: 60,
      },
      position: { x: 450, y: 400 },
    });
    elements.push({
      group: 'edges',
      data: {
        id: 'e-ramesh-priya',
        source: 'p-ramesh',
        target: 'p-priya',
        label: 'child (daughter)',
        color: '#10B981',
        lineStyle: 'solid',
      },
    });

    // 5. Kamala Sharma (Mother • Amber needs documents)
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-kamala',
        label: 'Kamala Sharma\n(Mother • 20%)',
        type: 'needs_docs',
        color: '#F59E0B',
        borderColor: '#B45309',
        size: 60,
      },
      position: { x: 420, y: 90 },
    });
    elements.push({
      group: 'edges',
      data: {
        id: 'e-ramesh-kamala',
        source: 'p-kamala',
        target: 'p-ramesh',
        label: 'parent (mother)',
        color: '#F59E0B',
        lineStyle: 'solid',
      },
    });

    // 6. Vikram Sharma (Brother • Red dashed border, "disputed")
    const isDisputedNow = activeSnapshot.validAt === '2026-02-18';
    elements.push({
      group: 'nodes',
      data: {
        id: 'p-vikram',
        label: isDisputedNow
          ? 'Vikram Sharma\n(Brother • Disputed)'
          : 'Vikram Sharma\n(Brother • Class-II)',
        type: isDisputedNow ? 'conflict' : 'class_ii',
        color: '#EF4444',
        borderColor: '#DC2626',
        borderStyle: 'dashed',
        borderWidth: 3,
        size: 58,
      },
      position: { x: 620, y: 240 },
    });
    elements.push({
      group: 'edges',
      data: {
        id: 'e-ramesh-vikram',
        source: 'p-ramesh',
        target: 'p-vikram',
        label: 'sibling (brother)',
        color: '#EF4444',
        lineStyle: 'dashed',
      },
    });

    // 7. Second Layer: Assets as Small Teal Nodes linked to Nominees
    if (showAssets) {
      // Zerodha Demat (₹45L)
      if (!is2018) {
        elements.push({
          group: 'nodes',
          data: {
            id: 'a-zerodha',
            label: 'Zerodha Demat\n(₹45L)',
            type: 'asset',
            color: '#14B8A6',
            borderColor: '#0F766E',
            size: 42,
          },
          position: { x: 130, y: 440 },
        });
        if (showNominees) {
          elements.push({
            group: 'edges',
            data: {
              id: 'e-arjun-zerodha',
              source: 'p-arjun',
              target: 'a-zerodha',
              label: 'nominee',
              color: '#14B8A6',
              lineStyle: 'dotted',
            },
          });
        }
      }

      // LIC Policy (₹30L)
      elements.push({
        group: 'nodes',
        data: {
          id: 'a-lic',
          label: 'LIC Policy\n(₹30L)',
          type: 'asset',
          color: '#14B8A6',
          borderColor: '#0F766E',
          size: 40,
        },
        position: { x: 70, y: 220 },
      });
      if (showNominees) {
        elements.push({
          group: 'edges',
          data: {
            id: 'e-sunita-lic',
            source: 'p-sunita',
            target: 'a-lic',
            label: 'beneficial nominee',
            color: '#14B8A6',
            lineStyle: 'dotted',
          },
        });
      }

      // SBI Savings (₹6.5L)
      elements.push({
        group: 'nodes',
        data: {
          id: 'a-sbi',
          label: 'SBI Savings\n(₹6.5L)',
          type: 'asset',
          color: '#14B8A6',
          borderColor: '#0F766E',
          size: 38,
        },
        position: { x: 80, y: 70 },
      });
      if (showNominees) {
        elements.push({
          group: 'edges',
          data: {
            id: 'e-sunita-sbi',
            source: 'p-sunita',
            target: 'a-sbi',
            label: 'nominee',
            color: '#14B8A6',
            lineStyle: 'dotted',
          },
        });
      }

      // Jubilee Hills Flat (₹1.40 Cr)
      elements.push({
        group: 'nodes',
        data: {
          id: 'a-flat',
          label: 'Jubilee Hills Flat\n(₹1.40 Cr)',
          type: 'asset',
          color: '#14B8A6',
          borderColor: '#0F766E',
          size: 44,
        },
        position: { x: 570, y: 110 },
      });
      elements.push({
        group: 'edges',
        data: {
          id: 'e-ramesh-flat',
          source: 'p-ramesh',
          target: 'a-flat',
          label: 'estate asset',
          color: '#94A3B8',
          lineStyle: 'solid',
        },
      });

      // HDFC Account (₹4.5L)
      elements.push({
        group: 'nodes',
        data: {
          id: 'a-hdfc',
          label: 'HDFC Savings\n(₹4.5L)',
          type: 'asset',
          color: '#14B8A6',
          borderColor: '#0F766E',
          size: 38,
        },
        position: { x: 700, y: 350 },
      });
      if (isDisputedNow && showNominees) {
        elements.push({
          group: 'edges',
          data: {
            id: 'e-vikram-hdfc',
            source: 'p-vikram',
            target: 'a-hdfc',
            label: 'adverse claim',
            color: '#EF4444',
            lineStyle: 'dashed',
          },
        });
      }
    }

    // 8. Will / Unregistered Memorandum Node
    if (showWill) {
      elements.push({
        group: 'nodes',
        data: {
          id: 'n-memo',
          label: 'Informal Memo\n(2018 Unregistered)',
          type: 'memorandum',
          color: '#F43F5E',
          borderColor: '#BE123C',
          size: 42,
        },
        position: { x: 740, y: 160 },
      });
      elements.push({
        group: 'edges',
        data: {
          id: 'e-vikram-memo',
          source: 'p-vikram',
          target: 'n-memo',
          label: 'asserts claim',
          color: '#F43F5E',
          lineStyle: 'dashed',
        },
      });
    }

    return elements;
  }, [activeSnapshot, showAssets, showNominees, showWill]);

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!cyContainerRef.current) return;

    // Destroy existing instance if any
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cyStyle: any[] = [
      {
        selector: 'node',
        style: {
          'background-color': 'data(color)',
          'label': 'data(label)',
          'color': '#0F172A',
          'font-family': 'Inter, sans-serif',
          'font-size': '11px',
          'font-weight': 600,
          'text-wrap': 'wrap',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-outline-color': '#FFFFFF',
          'text-outline-width': 2,
          'width': 'data(size)',
          'height': 'data(size)',
          'border-width': 3,
          'border-color': 'data(borderColor)',
          'border-style': 'solid',
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': 0.25,
          'overlay-opacity': 0,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 4,
          'border-color': '#0B1F3A',
        },
      },
      {
        selector: 'node[type = "deceased"]',
        style: {
          'text-outline-color': '#FEF3C7',
          'text-outline-width': 2.5,
          'font-size': '12px',
          'font-weight': 700,
          'border-width': 4,
          'border-color': '#92400E',
        },
      },
      {
        selector: 'node[type = "asset"]',
        style: {
          'font-size': '9.5px',
          'shape': 'round-rectangle',
        },
      },
      {
        selector: 'node[type = "conflict"]',
        style: {
          'border-style': 'dashed',
          'border-width': 3.5,
          'border-color': '#DC2626',
          'background-color': '#FEE2E2',
          'color': '#991B1B',
        },
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': 'data(color)',
          'line-style': 'solid',
          'target-arrow-shape': 'triangle',
          'target-arrow-color': 'data(color)',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-family': 'Inter, sans-serif',
          'font-size': '9px',
          'font-weight': 600,
          'color': '#64748B',
          'text-background-color': '#FFFFFF',
          'text-background-opacity': 0.85,
          'text-background-padding': '2px',
          'text-background-shape': 'roundrectangle',
          'arrow-scale': 0.8,
        },
      },
      {
        selector: 'edge[lineStyle = "dashed"]',
        style: {
          'line-style': 'dashed',
        },
      },
      {
        selector: 'edge[lineStyle = "dotted"]',
        style: {
          'line-style': 'dotted',
        },
      },
    ];

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: cyElements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: cyStyle,
      layout: {
        name: 'preset',
      },
    });

    // Node click updates the right panel
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const nodeId = node.id();
      setSelectedEntityId(nodeId);
    });

    // Fit on load
    cy.fit(undefined, 35);
    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [cyElements]);

  // Graph control helpers
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 35);
  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit(undefined, 35);
  };

  const selectedEntity = ENTITY_DETAILS[selectedEntityId] || ENTITY_DETAILS['p-sunita'];

  const isSharesTab = location.pathname.includes('/shares');

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-left relative">
      {/* Tab Switcher: Kinship Graph vs Share Allocation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={`/case/${activeCaseId}/heirs`}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            !isSharesTab
              ? 'bg-navy text-white shadow-soft'
              : 'text-slate-600 hover:text-navy hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-teal-400" />
          <span>Interactive Kinship Graph (Cytoscape)</span>
        </Link>
        <Link
          to={`/case/${activeCaseId}/heirs/shares`}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            isSharesTab
              ? 'bg-navy text-white shadow-soft'
              : 'text-slate-600 hover:text-navy hover:bg-slate-100'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Share Allocation & Succession Tax Simulator</span>
        </Link>
      </div>

      {isSharesTab ? (
        /* ========================================================================= */
        /* SHARES VIEW: Share Allocation & Succession Tax Simulator (/heirs/shares) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono">
                    STATUTORY ALLOCATION
                  </span>
                  <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy">
                  Estate Share Allocation & Tax Simulator
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Intestate distribution under Section 8 of the Hindu Succession Act, 1956 for ₹2.84 Cr net estate.
                </p>
              </div>

              <Link
                to={`/case/${activeCaseId}/heirs`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Return to Kinship Graph</span>
              </Link>
            </div>
          </div>

          {/* 4 Class-I Heirs Share Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  40% Share
                </span>
                <span className="text-xs text-slate-400 font-mono">Class-I</span>
              </div>
              <h3 className="text-base font-serif font-bold text-navy">Sunita Sharma</h3>
              <div className="text-2xl font-bold font-sans text-navy">₹1.136 Cr</div>
              <p className="text-xs text-slate-500">
                Spouse (Widow). Assigned primary share + beneficial nominee on SBI, ICICI, LIC.
              </p>
            </div>

            <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  20% Share
                </span>
                <span className="text-xs text-slate-400 font-mono">Class-I</span>
              </div>
              <h3 className="text-base font-serif font-bold text-navy">Arjun Sharma</h3>
              <div className="text-2xl font-bold font-sans text-navy">₹56.8 Lakhs</div>
              <p className="text-xs text-slate-500">
                Son & Family Executor. Registered nominee for Zerodha Demat & Creta Car.
              </p>
            </div>

            <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  20% Share
                </span>
                <span className="text-xs text-slate-400 font-mono">Class-I</span>
              </div>
              <h3 className="text-base font-serif font-bold text-navy">Priya Sharma</h3>
              <div className="text-2xl font-bold font-sans text-navy">₹56.8 Lakhs</div>
              <p className="text-xs text-slate-500">
                Daughter & Coparcener. Registered nominee for SBI Mutual Fund folios.
              </p>
            </div>

            <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  20% Share
                </span>
                <span className="text-xs text-slate-400 font-mono">Class-I</span>
              </div>
              <h3 className="text-base font-serif font-bold text-navy">Kamala Sharma</h3>
              <div className="text-2xl font-bold font-sans text-navy">₹56.8 Lakhs</div>
              <p className="text-xs text-slate-500">
                Mother (88 yo). Entitled to equal statutory share under Hindu Succession Act.
              </p>
            </div>
          </div>

          {/* Inheritance Tax Simulator Card */}
          <div className="p-6 rounded-virasat bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border border-emerald-200 shadow-soft space-y-4 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-serif font-bold text-navy">
                Indian Inheritance Tax & Capital Gains Analysis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Estate Duty / Inheritance Tax
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">₹0.00 (Exempt)</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Estate Duty Act abolished in 1985; zero death duty applicable.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Income Tax on Transmission
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">₹0.00 (Exempt)</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Exempt under Section 56(2)(x) proviso (inheritance from relative).
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Capital Gains on Transfer
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">₹0.00 (Exempt)</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Transfer under will/inheritance is not a "transfer" under Section 47(iii).
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* GRAPH VIEW: Interactive Cytoscape.js Node-Link Canvas (/heirs) */
        /* ========================================================================= */
        <>
          {/* Top Header Card */}
          <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              {/* Left: Heading & Legal Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
                    SPANNER KINSHIP GRAPH
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    CASE {activeCaseId}
                  </span>
                  <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                    Hindu Succession Act, 1956 (§8)
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
                  Family & Legal Heirs Kinship Graph
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                  Interactive node-link graph mapping surviving Class-I legal heirs, asset nominations, and Class-II kinship exclusion rules with bi-temporal history audit.
                </p>
              </div>

              {/* Right: Time Travel Slider ("View as of: [date]") */}
              <div className="shrink-0 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 xl:w-96 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-navy">
                      Time Travel: <span className="font-mono text-teal-700">{activeSnapshot.date}</span>
                    </span>
                  </div>

                  {/* Two Toggles: "As it was true" vs "As we knew it" */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleModeToggle('valid')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${
                        biTemporalMode === 'valid'
                          ? 'bg-navy text-white'
                          : 'text-slate-500 hover:text-navy'
                      }`}
                      title="Valid Time: As it was true in the real world"
                    >
                      As it was true
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeToggle('known')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${
                        biTemporalMode === 'known'
                          ? 'bg-navy text-white'
                          : 'text-slate-500 hover:text-navy'
                      }`}
                      title="Transaction Time: As known in Virasat's knowledge base"
                    >
                      As we knew it
                    </button>
                  </div>
                </div>

                {/* Slider Input */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={TIMELINE_SNAPSHOTS.length - 1}
                    value={currentSnapshotIndex}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                    className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>2018</span>
                    <span>2022</span>
                    <span>2024</span>
                    <span className="text-teal-700 font-bold">2026 (Now)</span>
                  </div>
                </div>

                {/* Current Snapshot Milestone Text */}
                <div className="text-[11px] text-slate-600 font-sans leading-snug bg-white p-2 rounded-xl border border-slate-200/80">
                  <strong className="text-navy">{activeSnapshot.label}: </strong>
                  {activeSnapshot.description}
                </div>
              </div>
            </div>
          </div>

      {/* ========================================================================= */}
      {/* MAIN 3-PANEL WORKSPACE: LEFT (Legend/Filters) | CENTER (Graph) | RIGHT (Details) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANEL (3 cols): Legend, Layer Toggles, Graph Controls, CTA */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5">
            {/* Layer Toggles */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-navy uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Graph Layers</span>
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={showAssets}
                    onChange={(e) => setShowAssets(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                  />
                  <span className="font-semibold text-slate-700">Show asset folios</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={showNominees}
                    onChange={(e) => setShowNominees(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                  />
                  <span className="font-semibold text-slate-700">Show nomination links</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={showWill}
                    onChange={(e) => setShowWill(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                  />
                  <span className="font-semibold text-slate-700">Show 2018 informal memo</span>
                </label>
              </div>
            </div>

            {/* Legend Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                Kinship Legend
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#C9A227] border-2 border-[#92400E] shrink-0" />
                  <span className="text-slate-700">Deceased Propositus</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-emerald-700 shrink-0" />
                  <span className="text-slate-700">Class-I Heir (Eligible)</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-amber-700 shrink-0" />
                  <span className="text-slate-700">Needs Documents (KYC)</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-100 border-2 border-dashed border-rose-600 shrink-0" />
                  <span className="text-slate-700">Class-II Relative (Excluded)</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-teal-500 border-2 border-teal-700 shrink-0" />
                  <span className="text-slate-700">Discovered Asset Holding</span>
                </div>
              </div>
            </div>

            {/* CTA Button: View Shares Allocation */}
            <div className="pt-3 border-t border-slate-100">
              <Link
                to="/heirs/shares"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
              >
                <Coins className="w-4 h-4 text-teal-400" />
                <span>View shares allocation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER PANEL (5 cols): Interactive Cytoscape.js Node-Link Canvas */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-virasat bg-gradient-to-b from-slate-50 via-white to-slate-50/70 border border-slate-200 shadow-soft overflow-hidden h-[620px]">
            {/* Floating Top Controls (Zoom / Fit) */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleFit}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors"
                title="Fit to Screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Floating Status Pill */}
            <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-xs text-[11px] font-mono font-semibold text-slate-600">
              Interactive • Click Node to Inspect
            </div>

            {/* Cytoscape DOM Mount */}
            <div ref={cyContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          </div>

          <div className="text-center text-[11px] text-slate-400">
            Scroll or pinch to zoom • Drag background to pan • Click any node or edge to inspect statutory credentials
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL (4 cols): Selected-Person Card with Law Citations & CTAs */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5 text-left">
            {/* Entity Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {selectedEntity.avatar ? (
                  <img
                    src={selectedEntity.avatar}
                    alt={selectedEntity.name}
                    className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-serif font-bold text-navy leading-tight">
                    {selectedEntity.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-sans mt-0.5">
                    {selectedEntity.role}
                  </div>
                </div>
              </div>

              <div>
                {selectedEntity.status === 'eligible' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Eligible
                  </span>
                )}
                {selectedEntity.status === 'needs_docs' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" /> Needs KYC
                  </span>
                )}
                {selectedEntity.status === 'conflict' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Disputed
                  </span>
                )}
                {selectedEntity.status === 'deceased' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    Deceased
                  </span>
                )}
              </div>
            </div>

            {/* Share % & Statutory Allocation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Intestate Statutory Share
                </div>
                <div className="text-xl font-bold font-sans text-navy">
                  {selectedEntity.sharePercent}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Estimated Value
                </div>
                <div className="text-base font-bold font-mono text-teal-700">
                  {selectedEntity.shareAmount > 0
                    ? `₹${(selectedEntity.shareAmount / 10000000).toFixed(2)} Cr`
                    : '₹0 (Excluded)'}
                </div>
              </div>
            </div>

            {/* Legal Basis Card */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-navy uppercase text-[10px] tracking-wider block">
                Statutory Legal Basis
              </span>
              <p className="text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                {selectedEntity.legalBasis}
              </p>
            </div>

            {/* Required Documents Checklist */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-navy uppercase text-[10px] tracking-wider block">
                Required Verification Documents
              </span>
              <div className="space-y-1.5">
                {selectedEntity.requiredDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* "Explain with sources" Expandable Section */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowLawCitations(!showLawCitations)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-xs font-bold text-navy"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Explain with statutory sources ({selectedEntity.lawCitations.length})</span>
                </div>
                {showLawCitations ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showLawCitations && (
                <div className="p-3.5 space-y-3 divide-y divide-slate-100 text-xs">
                  {selectedEntity.lawCitations.map((citation, idx) => (
                    <div key={idx} className={idx > 0 ? 'pt-3 space-y-1' : 'space-y-1'}>
                      <div className="font-bold text-navy flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                        <span>{citation.title}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700 font-mono">
                        {citation.section}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {citation.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions for Selected Entity */}
            <div className="pt-2">
              {selectedEntity.id === 'p-vikram' ? (
                <Link
                  to="/disputes"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-soft transition-all"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Open dispute & AI rebuttal docket</span>
                </Link>
              ) : selectedEntity.assetId ? (
                <Link
                  to={`/case/${activeCaseId}/assets/${selectedEntity.assetId}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
                >
                  <Eye className="w-4 h-4 text-teal-400" />
                  <span>View asset folio details</span>
                </Link>
              ) : (
                <Link
                  to="/heirs/shares"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
                >
                  <Coins className="w-4 h-4 text-teal-400" />
                  <span>View heir shares & tax simulator</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
};
