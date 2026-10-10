import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  ArrowRight,
  FileText,
  Calendar,
  Building2,
  ShieldAlert,
  HelpCircle,
  Search,
  Kanban,
  CalendarRange,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Send,
  Layers,
  Coins,
  ShieldCheck,
  Check,
  AlertCircle,
  Landmark,
  CreditCard,
  Briefcase,
  FileBadge,
  BadgeCheck,
  Info
} from 'lucide-react';
import { formatINR, cn } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

// =========================================================================
// TYPES & DEFINITIONS
// =========================================================================
export type ClaimKanbanStatus = 'Ready' | 'Submitted' | 'In Review' | 'Needs Action' | 'Settled';

export interface EnhancedClaim {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  institutionColor: string;
  institutionType: string;
  claimantName: string;
  claimantRelationship: string;
  amount: number;
  status: ClaimKanbanStatus;
  currentStep: number;
  stageTitle: string;
  stageDescription: string;
  daysOpen: number;
  submissionDate: string;
  slaDeadline: string;
  slaDaysLeft: number;
  slaStatus: 'Ahead' | 'On Track' | 'Due Soon' | 'Overdue' | 'Settled';
  referenceDocketNo: string;
  blockers?: string[];
  documentsRequired: string[];
  documentsSubmitted: string[];
  ganttStart: string; // YYYY-MM-DD
  ganttEnd: string;   // YYYY-MM-DD
  milestones: {
    name: string;
    date: string;
    completed: boolean;
  }[];
}

export interface BankReadinessItem {
  institutionId: string;
  name: string;
  code: string;
  color: string;
  totalDocs: number;
  verifiedDocs: number;
  percent: number;
  statusNote: string;
}

// Initial 12 Claims Mock Data
const INITIAL_CLAIMS: EnhancedClaim[] = [
  {
    id: 'CLM-01',
    assetId: 'asset-1',
    assetName: 'SBI Savings Account',
    category: 'Banking',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India',
    institutionCode: 'SBI',
    institutionColor: '#1A4D8F',
    institutionType: 'Public Bank',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse (Primary Claimant)',
    amount: 650000,
    status: 'Settled',
    currentStep: 4,
    stageTitle: 'Funds Credited to Beneficiary',
    stageDescription: 'SBI Banjara Hills Branch processed the claim and credited ₹6,50,000 to Sunita Sharma’s account.',
    daysOpen: 4,
    submissionDate: '2026-01-22',
    slaDeadline: '2026-01-29',
    slaDaysLeft: 0,
    slaStatus: 'Settled',
    referenceDocketNo: 'SBI-DEC-2026-8812',
    documentsRequired: ['Death Certificate', 'Nominee Aadhaar', 'Bank Annexure-A'],
    documentsSubmitted: ['Death Certificate', 'Nominee Aadhaar', 'Bank Annexure-A'],
    ganttStart: '2026-01-22',
    ganttEnd: '2026-01-26',
    milestones: [
      { name: 'Ingestion', date: '2026-01-22', completed: true },
      { name: 'KYC Validated', date: '2026-01-23', completed: true },
      { name: 'Officer Signoff', date: '2026-01-25', completed: true },
      { name: 'Funds Disbursed', date: '2026-01-26', completed: true },
    ],
  },
  {
    id: 'CLM-02',
    assetId: 'asset-2',
    assetName: 'HDFC Savings Account',
    category: 'Banking',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank Ltd.',
    institutionCode: 'HDFC',
    institutionColor: '#004C8F',
    institutionType: 'Private Bank',
    claimantName: 'Sunita & Arjun Sharma',
    claimantRelationship: 'Spouse & Son (Co-claimants)',
    amount: 450000,
    status: 'Ready', // One of the 3 ready claims
    currentStep: 1,
    stageTitle: 'Transmission Docket Assembled & Verified',
    stageDescription: 'Aadhaar e-Signed Indemnity Bond with surety generated. All 4 Class-I heirs verified via DigiLocker.',
    daysOpen: 6,
    submissionDate: '2026-02-12',
    slaDeadline: '2026-02-24',
    slaDaysLeft: 6,
    slaStatus: 'On Track',
    referenceDocketNo: 'HDFC-DC-904128',
    documentsRequired: ['Death Certificate', 'Indemnity Bond with Surety', 'All Heirs NOC', 'Form DA-2'],
    documentsSubmitted: ['Death Certificate', 'Indemnity Bond with Surety', 'All Heirs NOC', 'Form DA-2'],
    ganttStart: '2026-02-12',
    ganttEnd: '2026-02-24',
    milestones: [
      { name: 'Docs Assembled', date: '2026-02-12', completed: true },
      { name: 'Pre-Audit Passed', date: '2026-02-17', completed: true },
      { name: 'Batch Queue', date: '2026-02-18', completed: false },
      { name: 'Final Disbursal', date: '2026-02-24', completed: false },
    ],
  },
  {
    id: 'CLM-03',
    assetId: 'asset-3',
    assetName: 'ICICI Fixed Deposit',
    category: 'Banking',
    institutionId: 'inst-icici',
    institutionName: 'ICICI Bank Ltd.',
    institutionCode: 'ICICI',
    institutionColor: '#A62B2B',
    institutionType: 'Private Bank',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse',
    amount: 1400000,
    status: 'Settled',
    currentStep: 4,
    stageTitle: 'Proceeds Transferred to Nominee',
    stageDescription: 'Premature closure penalty waived under death mandate; ₹14,00,000 credited to registered nominee.',
    daysOpen: 5,
    submissionDate: '2026-01-24',
    slaDeadline: '2026-02-05',
    slaDaysLeft: 0,
    slaStatus: 'Settled',
    referenceDocketNo: 'ICICI-TRANS-77291',
    documentsRequired: ['Death Certificate', 'FD Certificate Copy', 'Nominee KYC'],
    documentsSubmitted: ['Death Certificate', 'FD Certificate Copy', 'Nominee KYC'],
    ganttStart: '2026-01-24',
    ganttEnd: '2026-01-29',
    milestones: [
      { name: 'Ingestion', date: '2026-01-24', completed: true },
      { name: 'Survivor Review', date: '2026-01-26', completed: true },
      { name: 'Penalty Waived', date: '2026-01-28', completed: true },
      { name: 'Disbursal Credited', date: '2026-01-29', completed: true },
    ],
  },
  {
    id: 'CLM-04',
    assetId: 'asset-4',
    assetName: 'Zerodha Demat Portfolio',
    category: 'Investments',
    institutionId: 'inst-zerodha',
    institutionName: 'Zerodha Broking Ltd',
    institutionCode: 'ZERODHA',
    institutionColor: '#387ED1',
    institutionType: 'Broker',
    claimantName: 'Arjun Sharma',
    claimantRelationship: 'Son (Registered Nominee)',
    amount: 4500000,
    status: 'In Review',
    currentStep: 3,
    stageTitle: 'CDSL Depository Transmission Slip Review',
    stageDescription: 'Physical annexures verified by Zerodha Bengaluru HQ; electronic transmission slip lodged with CDSL depository.',
    daysOpen: 12,
    submissionDate: '2026-02-05',
    slaDeadline: '2026-02-23',
    slaDaysLeft: 5,
    slaStatus: 'On Track',
    referenceDocketNo: 'ZER-TR-CDSL-202602-91',
    documentsRequired: ['Client Master Report (CMR)', 'Death Certificate Notarized', 'Form 7 Transmission', 'PAN of Nominee'],
    documentsSubmitted: ['Client Master Report (CMR)', 'Death Certificate Notarized', 'Form 7 Transmission', 'PAN of Nominee'],
    ganttStart: '2026-02-05',
    ganttEnd: '2026-02-23',
    milestones: [
      { name: 'Form 7 Submitted', date: '2026-02-05', completed: true },
      { name: 'CMR Verified', date: '2026-02-10', completed: true },
      { name: 'CDSL Lodged', date: '2026-02-15', completed: true },
      { name: 'Folio Transfer', date: '2026-02-23', completed: false },
    ],
  },
  {
    id: 'CLM-05',
    assetId: 'asset-5',
    assetName: 'SBI Mutual Fund Folio',
    category: 'Investments',
    institutionId: 'inst-sbi',
    institutionName: 'SBI Mutual Fund (CAMS)',
    institutionCode: 'CAMS',
    institutionColor: '#0D9488',
    institutionType: 'Mutual Fund Registrar',
    claimantName: 'Priya Sharma',
    claimantRelationship: 'Daughter (Registered Nominee)',
    amount: 2500000,
    status: 'In Review',
    currentStep: 3,
    stageTitle: 'Unit Holder Transmission Processing',
    stageDescription: 'CAMS Hyderabad center validating signature card against KRA database; unit re-assignment underway.',
    daysOpen: 9,
    submissionDate: '2026-02-07',
    slaDeadline: '2026-02-25',
    slaDaysLeft: 7,
    slaStatus: 'On Track',
    referenceDocketNo: 'CAMS-KRA-MF-49102',
    documentsRequired: ['Annexure-I Transmission Form', 'Death Cert Attestation', 'Bank Mandate Form', 'FATCA Declaration'],
    documentsSubmitted: ['Annexure-I Transmission Form', 'Death Cert Attestation', 'Bank Mandate Form', 'FATCA Declaration'],
    ganttStart: '2026-02-07',
    ganttEnd: '2026-02-25',
    milestones: [
      { name: 'KRA Verified', date: '2026-02-07', completed: true },
      { name: 'Annexure Lodged', date: '2026-02-11', completed: true },
      { name: 'Sign Match', date: '2026-02-16', completed: true },
      { name: 'Units Transferred', date: '2026-02-25', completed: false },
    ],
  },
  {
    id: 'CLM-06',
    assetId: 'asset-6',
    assetName: 'LIC Jeevan Anand Policy',
    category: 'Insurance',
    institutionId: 'inst-lic',
    institutionName: 'Life Insurance Corporation of India',
    institutionCode: 'LIC',
    institutionColor: '#D97706',
    institutionType: 'Life Insurer',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse (Beneficial Nominee §39)',
    amount: 3000000,
    status: 'Needs Action', // Blocked / Needs action
    currentStep: 2,
    stageTitle: 'Discharge Voucher & Form 3783 Required',
    stageDescription: 'LIC Hyderabad Divisional office requires original policy bond and signed Discharge Voucher Form 3783 with revenue stamp.',
    daysOpen: 21,
    submissionDate: '2026-01-28',
    slaDeadline: '2026-02-16',
    slaDaysLeft: -2,
    slaStatus: 'Overdue',
    referenceDocketNo: 'LIC-CLM-HYD-002931',
    blockers: ['Upload scanned Form 3783 signed with ₹1 revenue stamp', 'Physician statement regarding hospital discharge'],
    documentsRequired: ['Original Policy Bond', 'Death Certificate', 'Form 3783 Discharge Voucher', 'Physician Form B'],
    documentsSubmitted: ['Original Policy Bond', 'Death Certificate'],
    ganttStart: '2026-01-28',
    ganttEnd: '2026-03-01',
    milestones: [
      { name: 'Intimation Lodged', date: '2026-01-28', completed: true },
      { name: 'Bond Deposited', date: '2026-02-04', completed: true },
      { name: 'Form 3783 Pending', date: '2026-02-18', completed: false },
      { name: 'Disbursal Due', date: '2026-03-01', completed: false },
    ],
  },
  {
    id: 'CLM-07',
    assetId: 'asset-7',
    assetName: 'Employees Provident Fund (EPF)',
    category: 'Retirement',
    institutionId: 'inst-epfo',
    institutionName: 'EPFO Hyderabad Regional Office',
    institutionCode: 'EPFO',
    institutionColor: '#059669',
    institutionType: 'Govt Pension',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse (Form 2 Nominee)',
    amount: 2800000,
    status: 'Ready', // One of the 3 ready claims
    currentStep: 1,
    stageTitle: 'Composite Claim Form Form-20 Ready for Filing',
    stageDescription: 'EPFO Form 20 & 10D generated with digital UAN seed. Irrigation Dept employer admin token pre-verified.',
    daysOpen: 5,
    submissionDate: '2026-02-13',
    slaDeadline: '2026-03-05',
    slaDaysLeft: 15,
    slaStatus: 'On Track',
    referenceDocketNo: 'EPFO-CCF-DEATH-77182',
    documentsRequired: ['Form 20 Composite Claim', 'Cancelled Cheque', 'Death Certificate', 'Joint Photograph'],
    documentsSubmitted: ['Form 20 Composite Claim', 'Cancelled Cheque', 'Death Certificate', 'Joint Photograph'],
    ganttStart: '2026-02-13',
    ganttEnd: '2026-03-05',
    milestones: [
      { name: 'Form 20 Drafted', date: '2026-02-13', completed: true },
      { name: 'UAN Mapped', date: '2026-02-16', completed: true },
      { name: 'Portal Dispatch', date: '2026-02-18', completed: false },
      { name: 'Settlement NEFT', date: '2026-03-05', completed: false },
    ],
  },
  {
    id: 'CLM-08',
    assetId: 'asset-8',
    assetName: 'Public Provident Fund (PPF)',
    category: 'Retirement',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India',
    institutionCode: 'SBI',
    institutionColor: '#1A4D8F',
    institutionType: 'Public Bank',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse',
    amount: 1600000,
    status: 'Settled',
    currentStep: 4,
    stageTitle: 'Account Closure & Tax-Free Disbursal',
    stageDescription: 'PPF balance with accrued interest credited to nominee without capital gains deduction.',
    daysOpen: 12,
    submissionDate: '2026-01-22',
    slaDeadline: '2026-02-10',
    slaDaysLeft: 0,
    slaStatus: 'Settled',
    referenceDocketNo: 'SBI-PPF-CL-8831',
    documentsRequired: ['PPF Passbook', 'Form G Closure Request', 'Death Certificate'],
    documentsSubmitted: ['PPF Passbook', 'Form G Closure Request', 'Death Certificate'],
    ganttStart: '2026-01-22',
    ganttEnd: '2026-02-03',
    milestones: [
      { name: 'Closure Lodged', date: '2026-01-22', completed: true },
      { name: 'Tax Exemption Calc', date: '2026-01-27', completed: true },
      { name: 'Interest Credited', date: '2026-02-01', completed: true },
      { name: 'Final Payment', date: '2026-02-03', completed: true },
    ],
  },
  {
    id: 'CLM-09',
    assetId: 'asset-9',
    assetName: 'Bank Safe Deposit Locker',
    category: 'Banking',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India',
    institutionCode: 'SBI',
    institutionColor: '#1A4D8F',
    institutionType: 'Public Bank',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Spouse (Registered Nominee)',
    amount: 200000,
    status: 'Ready', // One of the 3 ready claims
    currentStep: 1,
    stageTitle: 'Inventory Appointment & Valuer Docket Ready',
    stageDescription: 'Branch Manager appointment pre-scheduled. Form Annexure-C legal heir indemnity pre-signed.',
    daysOpen: 4,
    submissionDate: '2026-02-14',
    slaDeadline: '2026-02-28',
    slaDaysLeft: 10,
    slaStatus: 'On Track',
    referenceDocketNo: 'SBI-LCK-INV-9921',
    documentsRequired: ['Locker Key Affidavit', 'Nominee Verification', 'Independent Valuer Appointment Request'],
    documentsSubmitted: ['Locker Key Affidavit', 'Nominee Verification', 'Independent Valuer Appointment Request'],
    ganttStart: '2026-02-14',
    ganttEnd: '2026-02-28',
    milestones: [
      { name: 'Mandate Verified', date: '2026-02-14', completed: true },
      { name: 'Valuer Notified', date: '2026-02-17', completed: true },
      { name: 'Break-Open Slot', date: '2026-02-22', completed: false },
      { name: 'Inventory Handover', date: '2026-02-28', completed: false },
    ],
  },
  {
    id: 'CLM-10',
    assetId: 'asset-10',
    assetName: 'HDFC Home Loan Liability',
    category: 'Banking',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank Ltd.',
    institutionCode: 'HDFC',
    institutionColor: '#004C8F',
    institutionType: 'Private Bank',
    claimantName: 'Sunita Sharma',
    claimantRelationship: 'Co-borrower',
    amount: -2800000,
    status: 'Submitted',
    currentStep: 2,
    stageTitle: 'Credit Life Insurance Rider Settlement Claim',
    stageDescription: 'HDFC Life assessing loan payoff claim under Credit Protect rider to extinguish ₹28L outstanding balance.',
    daysOpen: 14,
    submissionDate: '2026-02-04',
    slaDeadline: '2026-03-08',
    slaDaysLeft: 18,
    slaStatus: 'On Track',
    referenceDocketNo: 'HDFC-HL-CP-2026-319',
    documentsRequired: ['Loan Sanction Letter', 'Credit Life Policy Bond', 'Death Certificate Certified'],
    documentsSubmitted: ['Loan Sanction Letter', 'Credit Life Policy Bond', 'Death Certificate Certified'],
    ganttStart: '2026-02-04',
    ganttEnd: '2026-03-08',
    milestones: [
      { name: 'Payoff Request', date: '2026-02-04', completed: true },
      { name: 'Insurer Assigned', date: '2026-02-10', completed: true },
      { name: 'Rider Review', date: '2026-02-25', completed: false },
      { name: 'Loan Extinguished', date: '2026-03-08', completed: false },
    ],
  },
  {
    id: 'CLM-11',
    assetId: 'asset-11',
    assetName: 'Jubilee Hills Residential Flat',
    category: 'Real Estate',
    institutionId: 'inst-registrar',
    institutionName: 'Registration & Stamps Dept, Telangana',
    institutionCode: 'REGISTRAR',
    institutionColor: '#7C3AED',
    institutionType: 'Land Registry',
    claimantName: 'All Legal Heirs',
    claimantRelationship: 'Sunita (40%), Arjun (20%), Priya (20%), Kamala (20%)',
    amount: 14000000,
    status: 'Needs Action', // Blocked / Action needed
    currentStep: 1,
    stageTitle: 'Tahsildar Field Verification Inquiry & Caveat Review',
    stageDescription: 'MeeSeva application submitted; revenue inspector inquiry scheduled. Vikram Sharma adverse caveat pending rebuttal.',
    daysOpen: 18,
    submissionDate: '2026-02-06',
    slaDeadline: '2026-03-20',
    slaDaysLeft: 30,
    slaStatus: 'Due Soon',
    referenceDocketNo: 'MEESEVA-TG-LHC-884019',
    blockers: ['Field verification report from Banjara Hills Mandal Revenue Officer', 'Formal caveat rebuttal response to Vikram Sharma informal memo'],
    documentsRequired: ['Title Deed No. 4410/2018', 'MeeSeva LHC Form', 'Family Settlement Deed', 'Death Certificate'],
    documentsSubmitted: ['Title Deed No. 4410/2018', 'MeeSeva LHC Form'],
    ganttStart: '2026-02-06',
    ganttEnd: '2026-03-20',
    milestones: [
      { name: 'MeeSeva Lodged', date: '2026-02-06', completed: true },
      { name: 'Caveat Flagged', date: '2026-02-14', completed: true },
      { name: 'Rebuttal Hearing', date: '2026-02-28', completed: false },
      { name: 'Mutation Certificate', date: '2026-03-20', completed: false },
    ],
  },
  {
    id: 'CLM-12',
    assetId: 'asset-12',
    assetName: 'Hyundai Creta RC Transfer',
    category: 'Movables',
    institutionId: 'inst-registrar',
    institutionName: 'RTA Hyderabad',
    institutionCode: 'RTA',
    institutionColor: '#4F46E5',
    institutionType: 'Transport Authority',
    claimantName: 'Arjun Sharma',
    claimantRelationship: 'Son (Form 31 Transferee)',
    amount: 700000,
    status: 'Settled',
    currentStep: 4,
    stageTitle: 'Digital Smart Card RC Dispatched',
    stageDescription: 'RTA Khairatabad approved Form 31 transfer; new smart card RC issued in Arjun Sharma’s name.',
    daysOpen: 17,
    submissionDate: '2026-01-23',
    slaDeadline: '2026-02-15',
    slaDaysLeft: 0,
    slaStatus: 'Settled',
    referenceDocketNo: 'RTA-TS09-TRF-44910',
    documentsRequired: ['Original RC Book', 'Form 31 Application', 'Death Certificate Attested', 'Valid Insurance & PUC'],
    documentsSubmitted: ['Original RC Book', 'Form 31 Application', 'Death Certificate Attested', 'Valid Insurance & PUC'],
    ganttStart: '2026-01-23',
    ganttEnd: '2026-02-09',
    milestones: [
      { name: 'Form 31 Lodged', date: '2026-01-23', completed: true },
      { name: 'Inspection Waiver', date: '2026-01-30', completed: true },
      { name: 'RTO Signoff', date: '2026-02-05', completed: true },
      { name: 'Smart Card Issued', date: '2026-02-09', completed: true },
    ],
  },
];

// Bank Readiness Data
const BANK_READINESS_ITEMS: BankReadinessItem[] = [
  { institutionId: 'inst-sbi', name: 'State Bank of India', code: 'SBI', color: '#1A4D8F', totalDocs: 12, verifiedDocs: 12, percent: 100, statusNote: 'All 4 accounts/lockers pre-cleared' },
  { institutionId: 'inst-icici', name: 'ICICI Bank', code: 'ICICI', color: '#A62B2B', totalDocs: 3, verifiedDocs: 3, percent: 100, statusNote: 'FD proceeds transmission complete' },
  { institutionId: 'inst-zerodha', name: 'Zerodha Broking', code: 'ZERODHA', color: '#387ED1', totalDocs: 4, verifiedDocs: 4, percent: 100, statusNote: 'CDSL electronic slip verified' },
  { institutionId: 'inst-hdfc', name: 'HDFC Bank', code: 'HDFC', color: '#004C8F', totalDocs: 7, verifiedDocs: 6, percent: 86, statusNote: 'Indemnity stamp pre-authenticated' },
  { institutionId: 'inst-epfo', name: 'EPFO Hyderabad', code: 'EPFO', color: '#059669', totalDocs: 4, verifiedDocs: 3, percent: 75, statusNote: 'Employer token pre-validated' },
  { institutionId: 'inst-lic', name: 'LIC of India', code: 'LIC', color: '#D97706', totalDocs: 4, verifiedDocs: 2, percent: 50, statusNote: 'Form 3783 discharge voucher pending' },
  { institutionId: 'inst-registrar', name: 'Telangana Stamps & Land Registry', code: 'REGISTRAR', color: '#7C3AED', totalDocs: 5, verifiedDocs: 2, percent: 40, statusNote: 'Tahsildar field inquiry scheduled' },
];

export const ClaimsPage: React.FC = () => {
  const { caseId: paramCaseId, claimId: routeClaimId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { caseId: storeCaseId, addToast } = useVirasatStore();

  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // View state: ?view=board | timeline (persisted in URL)
  const currentView = (searchParams.get('view') === 'timeline' ? 'timeline' : 'board') as 'board' | 'timeline';

  const handleSetView = (newView: 'board' | 'timeline') => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('view', newView);
      return updated;
    });
  };

  // Local state for claims to support mock submission updates
  const [claimsList, setClaimsList] = useState<EnhancedClaim[]>(INITIAL_CLAIMS);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Batch Approval Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchApproved, setBatchApproved] = useState(false);

  // Selected claim drawer (via URL param or click)
  const selectedClaim = useMemo(() => {
    if (!routeClaimId) return null;
    return claimsList.find((c) => c.id === routeClaimId) || null;
  }, [routeClaimId, claimsList]);

  // Ready claims for batch submission
  const readyClaims = useMemo(() => {
    return claimsList.filter((c) => c.status === 'Ready');
  }, [claimsList]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalClaimed = claimsList.reduce((acc, c) => acc + (c.amount > 0 ? c.amount : 0), 0);
    const settledClaims = claimsList.filter((c) => c.status === 'Settled');
    const settledAmount = settledClaims.reduce((acc, c) => acc + (c.amount > 0 ? c.amount : 0), 0);
    const blockedCount = claimsList.filter((c) => c.status === 'Needs Action').length;
    const avgDays = 18.2;

    return {
      totalClaimed,
      settledCount: settledClaims.length,
      settledAmount,
      blockedCount,
      avgDays,
    };
  }, [claimsList]);

  // Filtered claims based on search
  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return claimsList;
    const q = searchQuery.toLowerCase();
    return claimsList.filter(
      (c) =>
        c.assetName.toLowerCase().includes(q) ||
        c.institutionName.toLowerCase().includes(q) ||
        c.referenceDocketNo.toLowerCase().includes(q) ||
        c.claimantName.toLowerCase().includes(q)
    );
  }, [claimsList, searchQuery]);

  // Group into Kanban columns
  const kanbanColumns: { status: ClaimKanbanStatus; title: string; subtitle: string; color: string }[] = [
    { status: 'Ready', title: 'Ready', subtitle: 'Pre-cleared for filing', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    { status: 'Submitted', title: 'Submitted', subtitle: 'Docket dispatched', color: 'bg-sky-50 border-sky-200 text-sky-800' },
    { status: 'In Review', title: 'In Review', subtitle: 'Depository / desk check', color: 'bg-teal-50 border-teal-200 text-teal-800' },
    { status: 'Needs Action', title: 'Needs Action', subtitle: 'Doc or caveat blocker', color: 'bg-amber-50 border-amber-200 text-amber-800' },
    { status: 'Settled', title: 'Settled', subtitle: 'Funds/units credited', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  ];

  // Batch Submit Action: moves all "Ready" claims to "Submitted"
  const handleConfirmBatchSubmit = () => {
    setIsSubmittingBatch(true);
    setTimeout(() => {
      setClaimsList((prev) =>
        prev.map((claim) => {
          if (claim.status === 'Ready') {
            return {
              ...claim,
              status: 'Submitted',
              currentStep: 2,
              stageTitle: 'Transmitted via API Gateway to Institution',
              stageDescription: `Docket dispatched electronically with DigiLocker digital attestation. Acknowledgement ref ${claim.referenceDocketNo}.`,
            };
          }
          return claim;
        })
      );
      setIsSubmittingBatch(false);
      setIsBatchModalOpen(false);
      setBatchApproved(true);

      addToast({
        type: 'success',
        title: '3 Ready Claims Submitted!',
        message: 'Dispatched electronic filings to HDFC Bank, EPFO, and SBI with digital timestamp certificates.',
      });
    }, 1000);
  };

  const handleCardClick = (claimId: string) => {
    navigate(`/case/${activeCaseId}/claims/${claimId}?view=${currentView}`);
  };

  const handleCloseDrawer = () => {
    navigate(`/case/${activeCaseId}/claims?view=${currentView}`);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-left relative">
      {/* Top Header Card */}
      <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
                INSTITUTIONAL CLAIMS
              </span>
              <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                12 Institutional Dockets
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Estate Claims & Transmission Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time settlement orchestration across 7 institutions, banking gateways, and depository registries.
            </p>
          </div>

          {/* Top Actions: View Toggle & Export */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Segmented Toggle */}
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center shadow-inner">
              <button
                onClick={() => handleSetView('board')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                  currentView === 'board'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-white/60'
                )}
              >
                <Kanban className="w-3.5 h-3.5 text-teal-400" />
                <span>Kanban Board</span>
              </button>

              <button
                onClick={() => handleSetView('timeline')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                  currentView === 'timeline'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-white/60'
                )}
              >
                <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                <span>Gantt Timeline</span>
              </button>
            </div>

            <button
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Transmission Dossier Downloaded',
                  message: 'Consolidated PDF package containing all 12 institutional transmission receipts.',
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-navy hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Export Master Dossier</span>
            </button>
          </div>
        </div>

        {/* Top KPI Strip: Total Claimed, Settled, Avg Days, Blocked */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Claimed Value</span>
            <span className="text-lg font-bold text-navy font-mono">{formatINR(kpis.totalClaimed)}</span>
            <span className="text-[10px] text-slate-500 block">Across 12 claim folios</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Settled & Transferred</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-emerald-700 font-mono">
                {kpis.settledCount} Claims
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500 block">{formatINR(kpis.settledAmount)} credited</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Turnaround Time</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-navy font-mono">{kpis.avgDays} Days</span>
              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                vs ~180d typical
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">89% faster through AI packager</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Action Needed / Blocked</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-amber-700 font-mono">
                {kpis.blockedCount} Blockers
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[10px] text-slate-500 block">LIC Form 3783 & Flat caveat</span>
          </div>
        </div>
      </div>

      {/* AI Smart Banner: "3 claims can be submitted today. Review and approve." */}
      {readyClaims.length > 0 ? (
        <div className="p-4 sm:p-5 rounded-virasat bg-gradient-to-r from-teal-900 via-navy to-indigo-950 text-white shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-500/30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-teal-300 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {readyClaims.length} claims can be submitted today. Review and approve.
                </span>
                <span className="text-[10px] bg-teal-400 text-navy font-bold px-2 py-0.5 rounded-full">
                  1-Click Batch
                </span>
              </div>
              <p className="text-xs text-slate-300">
                DigiLocker KYC, death certificate, and heir consent affidavits verified for HDFC Bank, EPFO, and SBI Locker. Ready for immediate transmission.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-400 to-teal-500 text-navy hover:from-teal-300 hover:to-teal-400 transition-all shadow-md flex items-center justify-center gap-2 shrink-0 font-sans"
          >
            <span>Review & Approve Batch ({readyClaims.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All pre-cleared claims submitted! Verification in progress with respective institutions.</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 font-bold">100% Batched</span>
        </div>
      )}

      {/* Search & Quick Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claim, asset, docket #, or institution..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Showing <span className="font-bold text-navy">{filteredClaims.length}</span> of 12 claims
        </div>
      </div>

      {/* Main Content Area: Board/Timeline (Left 8-9 Cols) + Bank Readiness Bar Chart (Right 3-4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Kanban Board OR Gantt Timeline */}
        <div className="xl:col-span-8 space-y-6">
          {currentView === 'board' ? (
            /* ========================================================================= */
            /* KANBAN BOARD VIEW                                                         */
            /* ========================================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {kanbanColumns.map((col) => {
                const colClaims = filteredClaims.filter((c) => c.status === col.status);
                const colTotalAmount = colClaims.reduce((acc, c) => acc + (c.amount > 0 ? c.amount : 0), 0);

                return (
                  <div
                    key={col.status}
                    className="flex flex-col bg-slate-100/70 rounded-2xl p-3 border border-slate-200 min-h-[580px]"
                  >
                    {/* Column Header */}
                    <div className="mb-3 px-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                          <span>{col.title}</span>
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-mono font-bold">
                            {colClaims.length}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{col.subtitle}</span>
                        <span className="font-mono text-slate-600 font-semibold">
                          {colTotalAmount > 0 ? formatINR(colTotalAmount, true) : '₹0'}
                        </span>
                      </div>
                    </div>

                    {/* Column Cards Container */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                      {colClaims.length === 0 ? (
                        <div className="h-32 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[11px] text-slate-400 p-3 text-center">
                          {col.status === 'Ready' && batchApproved
                            ? 'All caught up! 3 claims moved to Submitted.'
                            : 'No claims in this stage'}
                        </div>
                      ) : (
                        colClaims.map((claim) => (
                          <div
                            key={claim.id}
                            onClick={() => handleCardClick(claim.id)}
                            className={cn(
                              'p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-500/80 transition-all cursor-pointer group text-left space-y-2.5 relative',
                              claim.status === 'Needs Action' && 'border-amber-300/80 bg-amber-50/20'
                            )}
                          >
                            {/* Card Top: Institution Logo/Badge + Docket # */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: claim.institutionColor }}
                                />
                                <span className="text-[11px] font-bold text-navy truncate">
                                  {claim.institutionCode}
                                </span>
                              </div>

                              <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                {claim.id}
                              </span>
                            </div>

                            {/* Asset Name */}
                            <div>
                              <h4 className="text-xs font-serif font-bold text-navy group-hover:text-teal-700 transition-colors line-clamp-1">
                                {claim.assetName}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {claim.claimantName.split('&')[0].trim()}
                              </p>
                            </div>

                            {/* Amount in ₹ */}
                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                              <span className="text-xs font-mono font-bold text-navy">
                                {formatINR(claim.amount)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {claim.daysOpen}d open
                              </span>
                            </div>

                            {/* Bottom: SLA Chip & Quick Action for Needs Action */}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <span
                                className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1',
                                  claim.slaStatus === 'Settled'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : claim.slaStatus === 'Overdue'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : claim.slaStatus === 'Due Soon'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {claim.slaStatus === 'Settled' ? (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Clock className="w-2.5 h-2.5" />
                                )}
                                <span>{claim.slaStatus === 'Settled' ? 'Settled' : `${claim.slaDaysLeft}d left`}</span>
                              </span>

                              {/* Needs Action Links to /documents or /disputes */}
                              {claim.status === 'Needs Action' && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {claim.id === 'CLM-06' ? (
                                    <Link
                                      to={`/case/${activeCaseId}/documents`}
                                      className="text-[9px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded hover:bg-amber-200 transition-colors flex items-center gap-0.5"
                                    >
                                      <span>Doc</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  ) : (
                                    <Link
                                      to={`/case/${activeCaseId}/disputes`}
                                      className="text-[9px] font-bold text-rose-700 hover:text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded hover:bg-rose-200 transition-colors flex items-center gap-0.5"
                                    >
                                      <span>Dispute</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* TIMELINE VIEW (Gantt-Style Bars with Milestones & Today Marker)           */
            /* ========================================================================= */
            <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                    <CalendarRange className="w-5 h-5 text-amber-500" />
                    <span>Settlement Timeline & SLA Milestones</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Horizontal Gantt tracking from deceased passing (Jan 14) to anticipated full completion.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 text-[11px]">Settled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="text-slate-600 text-[11px]">In Progress</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-slate-600 text-[11px]">Needs Action</span>
                  </div>
                </div>
              </div>

              {/* Gantt Container */}
              <div className="overflow-x-auto relative pt-8 pb-4">
                {/* Time Axis Header (Jan 15 - Mar 25) */}
                <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-slate-200 pb-2 mb-4 px-2 min-w-[700px]">
                  <span>Jan 15</span>
                  <span>Jan 25</span>
                  <span>Feb 05</span>
                  <span>Feb 15</span>
                  <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                    TODAY (Feb 18)
                  </span>
                  <span>Feb 28</span>
                  <span>Mar 10</span>
                  <span>Mar 25</span>
                </div>

                {/* Vertical "Today" Marker Line (positioned at approx 52% of span) */}
                <div
                  className="absolute top-12 bottom-4 w-px bg-amber-400 border-l border-dashed border-amber-500 z-10 pointer-events-none"
                  style={{ left: '52%' }}
                >
                  <span className="absolute -top-4 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                    Today
                  </span>
                </div>

                {/* Claims Timeline Rows */}
                <div className="space-y-3 min-w-[700px]">
                  {filteredClaims.map((claim, idx) => {
                    // Approximate positioning based on Jan 15 to Mar 25 (~70 days)
                    // Start offset 0 to 100%
                    const isSettled = claim.status === 'Settled';
                    const isAction = claim.status === 'Needs Action';
                    const isReady = claim.status === 'Ready';

                    // Dynamic bar positioning
                    const leftPercent = Math.min(Math.max((idx * 4) + 6, 8), 45);
                    const widthPercent = isSettled ? 22 : isAction ? 45 : 36;

                    return (
                      <div
                        key={claim.id}
                        onClick={() => handleCardClick(claim.id)}
                        className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex items-center gap-3 border border-transparent hover:border-slate-200"
                      >
                        {/* Left Label */}
                        <div className="w-48 shrink-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: claim.institutionColor }}
                            />
                            <span className="text-xs font-bold text-navy truncate group-hover:text-teal-700 transition-colors">
                              {claim.assetName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span>{claim.institutionCode}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-600">{formatINR(claim.amount, true)}</span>
                          </div>
                        </div>

                        {/* Gantt Bar Lane */}
                        <div className="flex-1 relative h-7 bg-slate-100/70 rounded-lg flex items-center px-1">
                          {/* Colored Duration Bar */}
                          <div
                            className={cn(
                              'absolute h-5 rounded-md flex items-center justify-between px-2 text-[10px] text-white font-medium shadow-xs transition-all duration-300',
                              isSettled
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                                : isAction
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : isReady
                                ? 'bg-gradient-to-r from-indigo-500 to-sky-500'
                                : 'bg-gradient-to-r from-teal-600 to-navy'
                            )}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            <span className="truncate text-[10px] drop-shadow-xs font-sans">
                              {claim.stageTitle.split(':')[0]}
                            </span>

                            {/* Milestone dots */}
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {claim.milestones.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  title={`${m.name} (${m.date})`}
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full ring-1 ring-white/50',
                                    m.completed ? 'bg-white' : 'bg-white/30'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right Status */}
                        <div className="w-20 shrink-0 text-right">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block',
                              isSettled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isAction
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            )}
                          >
                            {claim.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: "Bank Readiness" Bar Chart */}
        <div className="xl:col-span-4 space-y-5">
          <div className="p-6 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-serif font-bold text-navy">Bank Readiness</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono border border-teal-200 font-bold">
                83% Overall
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Percentage of required documentation and heir approvals pre-cleared for each financial institution.
            </p>

            {/* Overall Gauge Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Estate Transmission Dossier</span>
                <span className="font-mono text-teal-700">83.4% Complete</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 transition-all duration-500"
                  style={{ width: '83.4%' }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>36 of 43 verification items locked</span>
                <span className="text-emerald-700 font-bold">Audit-Ready</span>
              </div>
            </div>

            {/* Institution Readiness Bar Chart */}
            <div className="space-y-3.5 pt-1">
              {BANK_READINESS_ITEMS.map((item) => (
                <div key={item.institutionId} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-navy truncate max-w-[180px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-navy text-[11px]">
                      {item.percent}%
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor:
                          item.percent === 100
                            ? '#10B981'
                            : item.percent >= 80
                            ? '#0D9488'
                            : item.percent >= 60
                            ? '#F59E0B'
                            : '#EF4444',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.statusNote}</span>
                    <span className="font-mono">
                      {item.verifiedDocs}/{item.totalDocs} items
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links Section */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                to={`/case/${activeCaseId}/documents`}
                className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Inspect Uploaded Documents (10)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={`/case/${activeCaseId}/disputes`}
                className="w-full p-2.5 rounded-xl text-xs font-semibold bg-rose-50/60 hover:bg-rose-50 text-rose-800 transition-colors flex items-center justify-between group border border-rose-200/50"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>View Dispute Defense Dossier (Vikram)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BATCH SUBMIT CONFIRMATION MODAL                                           */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                  BATCH TRANSMISSION
                </span>
                <h3 className="text-xl font-serif font-bold text-navy">
                  Confirm Batch Submission of {readyClaims.length} Claims
                </h3>
                <p className="text-xs text-slate-500">
                  Virasat AI has validated all KYC identities, death certificates, and heir NOCs for these institutions.
                </p>
              </div>

              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-navy p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of 3 Ready Claims */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {readyClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-navy">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: claim.institutionColor }}
                      />
                      <span>{claim.assetName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {claim.institutionName} • Claimant: {claim.claimantName}
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-navy block">{formatINR(claim.amount)}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Consent Notice */}
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                By confirming, electronic transmission dockets with digital signatures will be lodged directly with HDFC Bank, EPFO, and State Bank of India. Acknowledgement receipts will be attached to each folio.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchSubmit}
                disabled={isSubmittingBatch}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingBatch ? (
                  <>
                    <Clock className="w-4 h-4 text-teal-400 animate-spin" />
                    <span>Transmitting to Banking Gateways...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-teal-400" />
                    <span>Approve & Submit {readyClaims.length} Claims</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLAIM DETAIL SIDE DRAWER (Route: /claims/:claimId)                         */}
      {/* ========================================================================= */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200 text-left">
            {/* Drawer Header */}
            <div>
              <div className="p-6 border-b border-slate-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {selectedClaim.id}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedClaim.institutionColor }}
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedClaim.institutionName}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-navy">
                    {selectedClaim.assetName}
                  </h3>
                  <div className="text-2xl font-mono font-bold text-navy mt-1">
                    {formatINR(selectedClaim.amount)}
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="text-slate-400 hover:text-navy p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-210px)] overflow-y-auto">
                {/* Stage Banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-navy">{selectedClaim.stageTitle}</span>
                    <span className="font-mono text-[11px] text-teal-700 font-semibold">
                      Step {selectedClaim.currentStep} of 4
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedClaim.stageDescription}
                  </p>
                </div>

                {/* Blockers alert if present */}
                {selectedClaim.blockers && selectedClaim.blockers.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Action Required by Family / Counsel</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
                      {selectedClaim.blockers.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                    <div className="pt-2 flex items-center gap-3">
                      <Link
                        to={`/case/${activeCaseId}/documents`}
                        className="text-xs font-bold underline text-amber-900 hover:text-amber-950"
                      >
                        Upload to Document Vault →
                      </Link>
                      <span>•</span>
                      <Link
                        to={`/case/${activeCaseId}/disputes`}
                        className="text-xs font-bold underline text-amber-900 hover:text-amber-950"
                      >
                        Review Dispute Defense →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Docket Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Reference Docket</span>
                    <span className="font-mono font-bold text-navy text-[11px]">{selectedClaim.referenceDocketNo}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">SLA Target Date</span>
                    <span className="font-mono font-bold text-navy text-[11px]">{selectedClaim.slaDeadline}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Claimant</span>
                    <span className="font-semibold text-navy">{selectedClaim.claimantName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Relationship</span>
                    <span className="text-slate-600">{selectedClaim.claimantRelationship}</span>
                  </div>
                </div>

                {/* Attached Documents Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                    <FileBadge className="w-3.5 h-3.5 text-teal-600" />
                    <span>Required Verification Documents ({selectedClaim.documentsRequired.length})</span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {selectedClaim.documentsRequired.map((doc, idx) => {
                      const isVerified = selectedClaim.documentsSubmitted.includes(doc);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {isVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className={cn('text-[11px]', isVerified ? 'text-navy font-medium' : 'text-slate-500')}>
                              {doc}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            )}
                          >
                            {isVerified ? 'Attached' : 'Missing'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Milestones History */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Filing Milestone Trail</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    {selectedClaim.milestones.map((m, mIdx) => (
                      <div key={mIdx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              m.completed ? 'bg-emerald-500' : 'bg-slate-300'
                            )}
                          />
                          <span className={m.completed ? 'text-navy font-semibold' : 'text-slate-400'}>
                            {m.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">{m.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() =>
                  addToast({
                    type: 'info',
                    title: 'Direct Institution API Ping',
                    message: `Verified webhook connection to ${selectedClaim.institutionName} gateway. Status: Active.`,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Ping Institution API
              </button>

              <button
                onClick={handleCloseDrawer}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsPage;
