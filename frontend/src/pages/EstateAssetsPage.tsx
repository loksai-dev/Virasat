import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Landmark,
  Search,
  Filter,
  ExternalLink,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  TrendingDown,
  Clock,
  ShieldCheck,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  Eye,
  Check,
  Building,
  Sparkles,
  Info,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';
import { estateService } from '@/api/estateService';
import { getMockData } from '@/mocks';

export type DisplayAssetStatus = 'Located' | 'Claim ready' | 'Filed' | 'Blocked';

export interface EnhancedEstateAsset {
  id: string;
  name: string;
  category: 'Banking' | 'Investments' | 'Insurance' | 'Retirement' | 'Real Estate' | 'Valuables & Movable' | 'Liabilities';
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  institutionColor: string;
  accountOrFolioNumber: string;
  grossValue: number;
  isLiability: boolean;
  status: DisplayAssetStatus;
  statusDetail: string;
  nomineeName: string;
  nomineeStatus: 'Registered Nominee' | 'No Nominee' | 'Disputed Nominee';
  confidenceScore: number; // e.g. 99.4%
  claimId: string;
  docId: string;
  docName: string;
  docType: string;
  docSource: string;
  timelineChanges: {
    date: string;
    event: string;
    source: string;
  }[];
  extractionFields: {
    label: string;
    value: string;
    verified: boolean;
  }[];
  notes: string;
  documentationRequired: string[];
}

export const ENHANCED_ASSETS: EnhancedEstateAsset[] = [
  {
    id: 'asset-1',
    name: 'SBI Savings Account',
    category: 'Banking',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India',
    institutionCode: 'SBI',
    institutionColor: '#1A4D8F',
    accountOrFolioNumber: 'SB-0921-3912',
    grossValue: 650000,
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Proceeds disbursed to nominee account',
    nomineeName: 'Sunita Sharma (Spouse)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 99.8,
    claimId: 'CLM-01',
    docId: 'DOC-01',
    docName: 'SBI_Passbook_DeceasedMandate.pdf',
    docType: 'Bank Account Passbook & Survivor Mandate',
    docSource: 'SBI Core Banking Gateway',
    timelineChanges: [
      { date: '2019-04-12', event: 'Nominee registered as Sunita Sharma', source: 'SBI Branch Record' },
      { date: '2024-01-15', event: 'Mandate re-confirmed on netbanking KYC', source: 'INB Portal' },
      { date: '2026-01-22', event: 'Claim submitted via DigiLocker Death Cert', source: 'Virasat Engine' },
      { date: '2026-01-26', event: 'Disbursement completed to Sunita Sharma', source: 'NEFT Ref #99102' },
    ],
    extractionFields: [
      { label: 'Account Holder', value: 'Late Ramesh Sharma', verified: true },
      { label: 'Nominee on Record', value: 'Sunita Sharma (100% share)', verified: true },
      { label: 'IFSC Code', value: 'SBIN0001822 (Banjara Hills)', verified: true },
      { label: 'Cleared Balance', value: '₹6,50,000.00', verified: true },
    ],
    notes: 'Primary pension credit account. Settled via SBI survivor mandate with death cert.',
    documentationRequired: ['Death Certificate', 'KYC of Nominee', 'Annexure-A Form'],
  },
  {
    id: 'asset-2',
    name: 'HDFC Savings Account',
    category: 'Banking',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank',
    institutionCode: 'HDFC',
    institutionColor: '#004C8F',
    accountOrFolioNumber: 'SB-4810-7721',
    grossValue: 450000,
    isLiability: false,
    status: 'Blocked',
    statusDetail: 'Nominee contest by Vikram Sharma under dispute review',
    nomineeName: 'Contested (Vikram Sharma objection)',
    nomineeStatus: 'Disputed Nominee',
    confidenceScore: 94.2,
    claimId: 'CLM-02',
    docId: 'DOC-02',
    docName: 'HDFC_Account_Statement_4810.pdf',
    docType: 'HDFC Account Statement & Objection Notice',
    docSource: 'HDFC Central Processing Unit',
    timelineChanges: [
      { date: '2017-06-20', event: 'Account opened with Nil nominee', source: 'HDFC Branch' },
      { date: '2023-08-11', event: 'Informal nomination slip submitted by brother', source: 'Email Query' },
      { date: '2026-02-14', event: 'AI DisputeGuard flagged Class-I precedence conflict', source: 'Virasat Sentinel' },
    ],
    extractionFields: [
      { label: 'Account Holder', value: 'Late Ramesh Sharma', verified: true },
      { label: 'Nominee Status', value: 'Disputed / No Formal Registered Nominee', verified: true },
      { label: 'Statutory Class-I Heirs', value: 'Sunita, Arjun, Priya, Kamala', verified: true },
      { label: 'Available Balance', value: '₹4,50,000.00', verified: true },
    ],
    notes: 'No nominee registered on record. Class-I heirs NOC submitted; indemnity bond generated.',
    documentationRequired: ['Legal Heir Certificate', 'NOC from all Class-I heirs', 'Indemnity Bond'],
  },
  {
    id: 'asset-3',
    name: 'ICICI Fixed Deposit',
    category: 'Banking',
    institutionId: 'inst-icici',
    institutionName: 'ICICI Bank',
    institutionCode: 'ICICI',
    institutionColor: '#B02A30',
    accountOrFolioNumber: 'FD-7701-8840',
    grossValue: 1400000,
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Matured cumulative deposit settled to registered nominee',
    nomineeName: 'Sunita Sharma (Spouse)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 99.5,
    claimId: 'CLM-03',
    docId: 'DOC-01',
    docName: 'ICICI_Cumulative_FD_Receipt.pdf',
    docType: 'Fixed Deposit Receipt & Interest Certificate',
    docSource: 'ICICI NetBanking Vault',
    timelineChanges: [
      { date: '2021-03-05', event: 'FD booked for 5 years with Sunita Sharma as nominee', source: 'Branch Booking' },
      { date: '2024-03-05', event: 'Auto-renewal confirmed', source: 'System' },
      { date: '2026-01-28', event: 'Claim filed and approved by ICICI Central Desk', source: 'Virasat API' },
    ],
    extractionFields: [
      { label: 'Deposit Principal', value: '₹12,00,000.00', verified: true },
      { label: 'Accrued Interest', value: '₹2,00,000.00', verified: true },
      { label: 'Registered Nominee', value: 'Sunita Sharma (Spouse)', verified: true },
      { label: 'Maturity Amount', value: '₹14,00,000.00', verified: true },
    ],
    notes: 'Matured cumulative deposit. Principal + accrued interest paid to registered nominee.',
    documentationRequired: ['FD Receipt Original / Loss Affidavit', 'Death Certificate', 'Nominee Cancelled Cheque'],
  },
  {
    id: 'asset-4',
    name: 'Zerodha Demat Account',
    category: 'Investments',
    institutionId: 'inst-zerodha',
    institutionName: 'Zerodha Broking Ltd',
    institutionCode: 'ZERODHA',
    institutionColor: '#387ED1',
    accountOrFolioNumber: 'DP-12081600-4491',
    grossValue: 4500000,
    isLiability: false,
    status: 'Claim ready',
    statusDetail: 'Annexure 7 compiled; client master ready for transmission',
    nomineeName: 'Arjun Sharma (Son)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 98.9,
    claimId: 'CLM-04',
    docId: 'DOC-04',
    docName: 'Zerodha_CMR_Holding_Statement.pdf',
    docType: 'Client Master Report (CMR) & CDSL Statement',
    docSource: 'CDSL Depository Gateway',
    timelineChanges: [
      { date: '2022-09-18', event: 'Nominee updated to Arjun Sharma under SEBI circular', source: 'Zerodha Console' },
      { date: '2024-05-10', event: 'Holding report synced with CDSL', source: 'CDSL API' },
      { date: '2026-02-05', event: 'Transmission packet auto-filled by Claims Packager', source: 'Virasat Agent' },
    ],
    extractionFields: [
      { label: 'BO ID / Demat ID', value: '12081600-4491-0028', verified: true },
      { label: 'Nominee Registered', value: 'Arjun Sharma (100% share)', verified: true },
      { label: 'Equity Portfolio', value: '₹35,00,000.00 (Bluechip)', verified: true },
      { label: 'Sovereign Gold Bonds', value: '₹10,00,000.00 (SGB Tranche IV)', verified: true },
    ],
    notes: 'Includes Bluechip Nifty 50 shares and Sovereign Gold Bonds. Transmission form submitted.',
    documentationRequired: ['Transmission Request Form (Annexure 7)', 'Client Master Report (CMR)', 'Client Death Certificate'],
  },
  {
    id: 'asset-5',
    name: 'SBI Mutual Fund Folio',
    category: 'Investments',
    institutionId: 'inst-sbi',
    institutionName: 'SBI Mutual Fund (CAMS)',
    institutionCode: 'CAMS',
    institutionColor: '#0E7490',
    accountOrFolioNumber: 'MF-88319014/9',
    grossValue: 2500000,
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Units transmitted to daughter Priya Sharma demat account',
    nomineeName: 'Priya Sharma (Daughter)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 99.1,
    claimId: 'CLM-05',
    docId: 'DOC-05',
    docName: 'CAMS_Consolidated_Account_Statement.pdf',
    docType: 'Consolidated Account Statement (CAS)',
    docSource: 'CAMS MF Central Hub',
    timelineChanges: [
      { date: '2020-11-20', event: 'Nomination recorded in favor of Priya Sharma', source: 'CAMS Online' },
      { date: '2026-01-29', event: 'Form T3 Transmission submitted via MF Central', source: 'Virasat Portal' },
      { date: '2026-02-08', event: 'Units successfully credited to beneficiary demat', source: 'NSDL Registrar' },
    ],
    extractionFields: [
      { label: 'Folio Number', value: '88319014/9', verified: true },
      { label: 'Scheme Name', value: 'SBI Bluechip Fund - Direct Plan', verified: true },
      { label: 'Registered Nominee', value: 'Priya Sharma (100% allocation)', verified: true },
      { label: 'Latest NAV Valuation', value: '₹25,00,000.00', verified: true },
    ],
    notes: 'SBI Bluechip Fund & Small Cap Fund. Units transmitted to daughter’s demat folio.',
    documentationRequired: ['Form T3 Transmission', 'CAMS e-KYC', 'Attested Death Certificate'],
  },
  {
    id: 'asset-6',
    name: 'LIC Jeevan Anand Policy',
    category: 'Insurance',
    institutionId: 'inst-lic',
    institutionName: 'Life Insurance Corporation of India',
    institutionCode: 'LIC',
    institutionColor: '#D97706',
    accountOrFolioNumber: 'POL-682914129',
    grossValue: 3000000,
    isLiability: false,
    status: 'Claim ready',
    statusDetail: 'Beneficial nominee confirmed under Insurance Act §39',
    nomineeName: 'Sunita Sharma (Beneficial Nominee)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 97.4,
    claimId: 'CLM-06',
    docId: 'DOC-06',
    docName: 'LIC_Policy_Bond_JeevanAnand.pdf',
    docType: 'Original Policy Bond & Discharge Voucher',
    docSource: 'LIC Divisional Office 2, Hyderabad',
    timelineChanges: [
      { date: '2015-08-14', event: 'Policy issued with spouse as Beneficial Nominee', source: 'LIC Policy Docket' },
      { date: '2026-02-12', event: 'Vikram Sharma objection dismissed under Section 39', source: 'AI DisputeGuard' },
      { date: '2026-02-16', event: 'Form 3783 compiled with indemnity bond', source: 'Claims Packager' },
    ],
    extractionFields: [
      { label: 'Policy Number', value: '682914129', verified: true },
      { label: 'Sum Assured', value: '₹20,00,000.00', verified: true },
      { label: 'Accrued Reversionary Bonus', value: '₹10,00,000.00', verified: true },
      { label: 'Beneficial Nominee', value: 'Sunita Sharma (Spouse)', verified: true },
    ],
    notes: 'Sum assured ₹20L + vested reversionary bonuses ₹10L. Requires original discharge voucher Form 3783.',
    documentationRequired: ['Form 3783 (Discharge Voucher)', 'Original Policy Bond', 'Hospital Medical Attendant Report'],
  },
  {
    id: 'asset-7',
    name: 'Employees Provident Fund (EPF)',
    category: 'Retirement',
    institutionId: 'inst-epfo',
    institutionName: 'Employees Provident Fund Organisation',
    institutionCode: 'EPFO',
    institutionColor: '#2563EB',
    accountOrFolioNumber: 'UAN-100488921892',
    grossValue: 2800000,
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Composite Claim Form in verification at Hyderabad RO',
    nomineeName: 'Sunita Sharma (Spouse)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 98.0,
    claimId: 'CLM-07',
    docId: 'DOC-04',
    docName: 'EPFO_E-Nomination_Form20.pdf',
    docType: 'UAN Member Passbook & E-Nomination Receipt',
    docSource: 'EPFO Member Unified Portal',
    timelineChanges: [
      { date: '2021-01-19', event: 'E-Nomination digitally signed with Aadhaar OTP', source: 'EPFO Portal' },
      { date: '2026-01-25', event: 'Form 20 & 10D submitted to Hyderabad Regional Office', source: 'Virasat Direct' },
      { date: '2026-02-10', event: 'Employer counter-signature completed', source: 'Irrigation Dept' },
    ],
    extractionFields: [
      { label: 'Universal Account Number (UAN)', value: '100488921892', verified: true },
      { label: 'Total PF Corpus Balance', value: '₹28,00,000.00', verified: true },
      { label: 'Nominee Allocation', value: 'Sunita Sharma (100%)', verified: true },
      { label: 'Pension Scheme (EPS 95)', value: 'Monthly Widow Pension Eligible', verified: true },
    ],
    notes: 'Composite Claim Form (Death) submitted via EPFO Portal Hyderabad Regional Office.',
    documentationRequired: ['EPFO Form 20 & 10D', 'Employer Attestation Certificate', 'Cancelled Cheque of Claimant'],
  },
  {
    id: 'asset-8',
    name: 'Public Provident Fund (PPF)',
    category: 'Retirement',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India (PPF Branch)',
    institutionCode: 'SBI-PPF',
    institutionColor: '#1E3A8A',
    accountOrFolioNumber: 'PPF-0019283-HYD',
    grossValue: 1600000,
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Form G processed; maturity proceeds disbursed',
    nomineeName: 'Sunita Sharma (Spouse)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 99.6,
    claimId: 'CLM-08',
    docId: 'DOC-01',
    docName: 'SBI_PPF_Passbook_Closed.pdf',
    docType: 'PPF Passbook & Form G Settlement Receipt',
    docSource: 'SBI Banjara Hills Branch',
    timelineChanges: [
      { date: '2016-02-10', event: 'Form E nomination filed during account opening', source: 'Branch Ledger' },
      { date: '2026-01-24', event: 'Form G death claim presented with passbook', source: 'Virasat Concierge' },
      { date: '2026-02-03', event: '₹16,00,000 credited to beneficiary via NEFT', source: 'SBI CBS' },
    ],
    extractionFields: [
      { label: 'Account Number', value: 'PPF-0019283-HYD', verified: true },
      { label: 'Registered Nominee', value: 'Sunita Sharma (Spouse)', verified: true },
      { label: 'Closing Balance', value: '₹16,00,000.00', verified: true },
      { label: 'Tax Status', value: 'Exempt under Section 10(11)', verified: true },
    ],
    notes: 'Matured PPF account closed. Proceed credits transferred to Sunita Sharma savings account.',
    documentationRequired: ['Form G (Death Claim)', 'Original PPF Passbook', 'Death Certificate'],
  },
  {
    id: 'asset-9',
    name: 'Bank Safe Deposit Locker',
    category: 'Valuables & Movable',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India (Banjara Hills)',
    institutionCode: 'SBI-LOCKER',
    institutionColor: '#475569',
    accountOrFolioNumber: 'LOCKER-B142',
    grossValue: 200000,
    isLiability: false,
    status: 'Located',
    statusDetail: 'Inventory inspection scheduled with bank valuer',
    nomineeName: 'Sunita Sharma (Joint Mandate)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 95.0,
    claimId: 'CLM-09',
    docId: 'DOC-07',
    docName: 'Locker_Agreement_B142.pdf',
    docType: 'Bank Locker Lease Agreement & Key Token',
    docSource: 'SBI Branch Vault Records',
    timelineChanges: [
      { date: '2018-10-09', event: 'Locker leased with survivorship mandate', source: 'Branch Agreement' },
      { date: '2026-02-15', event: 'Physical access notice served to branch manager', source: 'Legal Concierge' },
      { date: '2026-02-28', event: 'Inventory appraisal date booked', source: 'Calendar Sync' },
    ],
    extractionFields: [
      { label: 'Locker Number', value: 'B-142 (Medium Size)', verified: true },
      { label: 'Operation Mandate', value: 'Either or Survivor (Sunita Sharma)', verified: true },
      { label: 'Appraised Asset Value', value: '₹2,00,000.00 (Estimated)', verified: true },
      { label: 'Key Token Verification', value: 'Confirmed in Family Safe', verified: true },
    ],
    notes: 'Locker inventory inspection scheduled with bank manager and approved valuer.',
    documentationRequired: ['Locker Key', 'Inventory Form with 2 Independent Witnesses', 'Death Certificate'],
  },
  {
    id: 'asset-10',
    name: 'HDFC Home Loan Liability',
    category: 'Liabilities',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank (Mortgages)',
    institutionCode: 'HDFC-LOAN',
    institutionColor: '#E11D48',
    accountOrFolioNumber: 'HL-6812-5512',
    grossValue: -2800000,
    isLiability: true,
    status: 'Claim ready',
    statusDetail: 'Credit protect insurance claim prepared to extinguish loan',
    nomineeName: 'Co-borrower: Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 98.7,
    claimId: 'CLM-10',
    docId: 'DOC-08',
    docName: 'HDFC_Loan_Statement_Mortgage.pdf',
    docType: 'Home Loan Sanction Letter & Credit Protect Cover',
    docSource: 'HDFC Limited Loan Portal',
    timelineChanges: [
      { date: '2014-07-22', event: 'Home loan sanctioned with HDFC Life Credit Protect', source: 'Loan Sanction File' },
      { date: '2026-02-01', event: 'Loan foreclosure request initiated with death notice', source: 'Virasat Concierge' },
      { date: '2026-02-12', event: 'Credit life claim documents compiled to waive ₹28L debt', source: 'Claims Packager' },
    ],
    extractionFields: [
      { label: 'Loan Account', value: 'HL-6812-5512', verified: true },
      { label: 'Outstanding Principal', value: '₹28,00,000.00', verified: true },
      { label: 'Credit Protect Cover', value: 'Active (HDFC Life Policy CP-98124)', verified: true },
      { label: 'Primary Collateral', value: 'Jubilee Hills Flat Sale Deed', verified: true },
    ],
    notes: 'Outstanding home loan balance on Jubilee Hills flat. Life insurance credit-cover claim initiated.',
    documentationRequired: ['Loan Account Statement', 'Credit Protect Insurance Claim Form', 'Death Certificate'],
  },
  {
    id: 'asset-11',
    name: 'Jubilee Hills Residential Flat',
    category: 'Real Estate',
    institutionId: 'inst-registrar',
    institutionName: 'Registration & Stamps Dept, Telangana',
    institutionCode: 'IGR-TS',
    institutionColor: '#7C3AED',
    accountOrFolioNumber: 'DOC-HYD-2014-8821',
    grossValue: 14000000,
    isLiability: false,
    status: 'Blocked',
    statusDetail: 'Class-II caveat challenge by brother Vikram Sharma',
    nomineeName: 'No Nominee on Title Deed (Intestate)',
    nomineeStatus: 'No Nominee',
    confidenceScore: 96.5,
    claimId: 'CLM-11',
    docId: 'DOC-02',
    docName: 'SaleDeed_JubileeHills_Registered.pdf',
    docType: 'Registered Sale Deed & Encumbrance Certificate',
    docSource: 'Telangana IGRS MeeSeva Portal',
    timelineChanges: [
      { date: '2014-06-18', event: 'Registered Sale Deed executed in favor of Ramesh Sharma', source: 'Sub-Registrar Khairatabad' },
      { date: '2026-02-12', event: 'Vikram Sharma submitted informal unregistered claim', source: 'Caveat Scanner' },
      { date: '2026-02-16', event: 'Section 8 Precedence Rebuttal Docket generated', source: 'Virasat AI Guard' },
    ],
    extractionFields: [
      { label: 'Property Title', value: '3BHK Flat #402, Jubilee Hills, Hyderabad', verified: true },
      { label: 'Govt Guidance Value', value: '₹1,40,00,000.00', verified: true },
      { label: 'Encumbrance Certificate', value: 'Nil encumbrance except HDFC mortgage', verified: true },
      { label: 'Succession Precedence', value: 'Class-I Heirs Exclude Brother (Sec 8 HSA)', verified: true },
    ],
    notes: '3BHK apartment in Jubilee Hills. Requires GHMC Property Tax name mutation & Sub-Registrar transfer.',
    documentationRequired: ['Registered Sale Deed', 'Family Member Certificate (Tahsildar)', 'GHMC Mutation Application'],
  },
  {
    id: 'asset-12',
    name: 'Hyundai Creta (Car)',
    category: 'Valuables & Movable',
    institutionId: 'inst-registrar',
    institutionName: 'RTA Hyderabad (Transport Dept)',
    institutionCode: 'RTA-TS',
    institutionColor: '#059669',
    accountOrFolioNumber: 'RC-TS09EA4492',
    grossValue: 100000, // ₹1.0 Lakh (Depreciated book value)
    isLiability: false,
    status: 'Filed',
    statusDetail: 'Form 31 transfer completed on Vahan portal in favor of Arjun Sharma',
    nomineeName: 'Arjun Sharma (Son)',
    nomineeStatus: 'Registered Nominee',
    confidenceScore: 99.4,
    claimId: 'CLM-12',
    docId: 'DOC-08',
    docName: 'Vahan_RC_Endorsement_Form31.pdf',
    docType: 'Motor Vehicle Registration Certificate & Form 31',
    docSource: 'Ministry of Road Transport Vahan Portal',
    timelineChanges: [
      { date: '2021-08-30', event: 'Vehicle purchased & registered (TS09EA4492)', source: 'RTA Khairatabad' },
      { date: '2026-01-25', event: 'Form 31 application filed online with family NOC', source: 'Vahan 4.0' },
      { date: '2026-02-09', event: 'RC ownership officially mutated to Arjun Sharma', source: 'RTA Final Endorsement' },
    ],
    extractionFields: [
      { label: 'Registration Number', value: 'TS09EA4492', verified: true },
      { label: 'Vehicle Model', value: 'Hyundai Creta SX(O) Petrol 2021', verified: true },
      { label: 'Transferee Name', value: 'Arjun Sharma (Son)', verified: true },
      { label: 'Depreciated Value', value: '₹1,00,000.00', verified: true },
    ],
    notes: 'Vehicle RC transfer completed in favor of Arjun Sharma under Motor Vehicles Rule 56.',
    documentationRequired: ['Form 31 (Transfer on Death)', 'Original RC Book', 'PUC & Insurance Endorsement'],
  },
];

export const EstateAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId, assetId: paramAssetId } = useParams();
  const { caseId: storeCaseId, addToast } = useVirasatStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Read URL query params
  const typeFilter = searchParams.get('type') || 'All';
  const statusFilter = searchParams.get('status') || 'All';
  const searchQuery = searchParams.get('q') || '';
  const sortKey = searchParams.get('sort') || 'value'; // 'name' | 'value' | 'confidence' | 'status'
  const sortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

  const [assetsList, setAssetsList] = useState<EnhancedEstateAsset[]>(ENHANCED_ASSETS);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'Banking' as any,
    accountOrFolioNumber: '',
    grossValue: 500000,
    nomineeName: 'Sunita Sharma (Spouse)',
  });

  const [nomineeShare, setNomineeShare] = useState<number>(100);
  const [nominee2Share, setNominee2Share] = useState<number>(0);
  const [nomineeError, setNomineeError] = useState<string | null>(null);
  const [isSavingNominees, setIsSavingNominees] = useState(false);

  // Active asset for drawer (from URL param or fallback)
  const activeAsset = useMemo(() => {
    if (!paramAssetId) return null;
    return assetsList.find((a) => a.id === paramAssetId) || null;
  }, [paramAssetId, assetsList]);

  // Sync nominee share when activeAsset changes
  useEffect(() => {
    if (activeAsset) {
      setNomineeShare(100);
      setNominee2Share(0);
      setNomineeError(null);
    }
  }, [activeAsset]);

  const handleSaveNominees = async () => {
    if (!activeAsset) return;
    const total = Number(nomineeShare) + Number(nominee2Share);
    if (total !== 100) {
      setNomineeError(`Nominees must total exactly 100% (currently ${total}%)`);
      addToast({
        type: 'risk',
        title: 'Validation Failed',
        message: `Nominee shares must total exactly 100%, got ${total}%.`,
      });
      return;
    }
    setNomineeError(null);
    setIsSavingNominees(true);
    try {
      const nomineesPayload = [
        { person_id: 'p-sunita', share_pct: Number(nomineeShare) },
        ...(Number(nominee2Share) > 0 ? [{ person_id: 'p-arjun', share_pct: Number(nominee2Share) }] : []),
      ];
      await estateService.updateNominees(activeAsset.id, nomineesPayload);
      addToast({
        type: 'success',
        title: 'Nominee Shares Recorded',
        message: `Updated nominees for ${activeAsset.name} to total 100%. Numbers recalculated.`,
      });
      setAssetsList((prev) =>
        prev.map((a) =>
          a.id === activeAsset.id
            ? {
                ...a,
                nomineeName:
                  Number(nominee2Share) > 0
                    ? `Sunita (${nomineeShare}%) & Arjun (${nominee2Share}%)`
                    : `Sunita Sharma (${nomineeShare}%)`,
              }
            : a
        )
      );
    } catch (err: any) {
      addToast({
        type: 'risk',
        title: 'Update Failed',
        message: err.message || 'Could not update nominees.',
      });
    } finally {
      setIsSavingNominees(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!activeAsset) return;
    try {
      await estateService.deleteAsset(activeAsset.id);
      addToast({
        type: 'success',
        title: 'Asset Removed',
        message: `${activeAsset.name} removed from estate registry.`,
      });
      setAssetsList((prev) => prev.filter((a) => a.id !== activeAsset.id));
      closeDrawer();
    } catch (err: any) {
      addToast({
        type: 'risk',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete asset.',
      });
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    setIsSubmitting(true);
    try {
      const created: any = await estateService.createAsset(activeCaseId, {
        category: newAsset.category,
        description: newAsset.name,
        gross_value: Number(newAsset.grossValue),
        account_no: newAsset.accountOrFolioNumber,
        nominees: [{ person_id: 'p-sunita', share_pct: 100 }],
      });
      const newEnhanced: EnhancedEstateAsset = {
        id: created.id || `asset-${Date.now()}`,
        name: newAsset.name,
        category: newAsset.category,
        institutionId: 'inst-other',
        institutionName: newAsset.category + ' Institution',
        institutionCode: 'NEW',
        institutionColor: '#0D9488',
        accountOrFolioNumber: newAsset.accountOrFolioNumber || 'ACC-NEW-1',
        grossValue: Number(newAsset.grossValue),
        isLiability: false,
        status: 'Located',
        statusDetail: 'Newly registered asset under review',
        nomineeName: newAsset.nomineeName,
        nomineeStatus: 'Registered Nominee',
        confidenceScore: 99.0,
        claimId: `CLM-${Date.now().toString().slice(-2)}`,
        docId: 'DOC-NEW',
        docName: `${newAsset.name}_Certificate.pdf`,
        docType: 'Asset Registration Mandate',
        docSource: 'Direct Family Submission',
        timelineChanges: [
          { date: new Date().toISOString().slice(0, 10), event: 'Asset manually added to estate registry', source: 'Family Concierge' },
        ],
        extractionFields: [
          { label: 'Asset Title', value: newAsset.name, verified: true },
          { label: 'Gross Value', value: `₹${Number(newAsset.grossValue).toLocaleString()}`, verified: true },
        ],
        notes: 'Asset registered directly by legal heirs during estate intake.',
        documentationRequired: ['Ownership Certificate / Statement', 'Death Certificate'],
      };
      setAssetsList((prev) => [newEnhanced, ...prev]);
      setIsAddAssetModalOpen(false);
      addToast({
        type: 'success',
        title: 'Asset Added',
        message: `${newAsset.name} added to case registry.`,
      });
    } catch (err: any) {
      addToast({
        type: 'risk',
        title: 'Could Not Add Asset',
        message: err.message || 'Error creating asset.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update URL search parameters
  const updateFilter = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'All' || val === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, val);
      }
    });
    setSearchParams(newParams);
  };

  const handleRowClick = (asset: EnhancedEstateAsset) => {
    const currentQuery = searchParams.toString();
    const queryPart = currentQuery ? `?${currentQuery}` : '';
    navigate(`/case/${activeCaseId}/assets/${asset.id}${queryPart}`);
  };

  const closeDrawer = () => {
    const currentQuery = searchParams.toString();
    const queryPart = currentQuery ? `?${currentQuery}` : '';
    navigate(`/case/${activeCaseId}/assets${queryPart}`);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      updateFilter({ order: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateFilter({ sort: key, order: 'desc' });
    }
  };

  // Filter and sort the assets
  const filteredAndSortedAssets = useMemo(() => {
    return assetsList.filter((asset) => {
      // Type Filter
      const matchesType =
        typeFilter === 'All'
          ? true
          : typeFilter === 'Liabilities'
          ? asset.isLiability
          : asset.category.toLowerCase() === typeFilter.toLowerCase();

      // Status Filter
      const matchesStatus =
        statusFilter === 'All' ? true : asset.status.toLowerCase() === statusFilter.toLowerCase();

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.institutionName.toLowerCase().includes(q) ||
        asset.accountOrFolioNumber.toLowerCase().includes(q) ||
        asset.nomineeName.toLowerCase().includes(q);

      return matchesType && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'value') {
        comparison = a.grossValue - b.grossValue;
      } else if (sortKey === 'confidence') {
        comparison = a.confidenceScore - b.confidenceScore;
      } else if (sortKey === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [assetsList, typeFilter, statusFilter, searchQuery, sortKey, sortOrder]);

  // Overall Estate Totals
  const totalGrossAssets = useMemo(
    () => ENHANCED_ASSETS.filter((a) => !a.isLiability).reduce((acc, a) => acc + a.grossValue, 0),
    []
  );
  const totalLiabilities = useMemo(
    () => Math.abs(ENHANCED_ASSETS.filter((a) => a.isLiability).reduce((acc, a) => acc + a.grossValue, 0)),
    []
  );
  const netEstateValue = totalGrossAssets - totalLiabilities;

  // Counts by status
  const locatedCount = ENHANCED_ASSETS.filter((a) => a.status === 'Located').length;
  const claimReadyCount = ENHANCED_ASSETS.filter((a) => a.status === 'Claim ready').length;
  const filedCount = ENHANCED_ASSETS.filter((a) => a.status === 'Filed').length;
  const blockedCount = ENHANCED_ASSETS.filter((a) => a.status === 'Blocked').length;

  const categories = [
    'All',
    'Banking',
    'Investments',
    'Insurance',
    'Retirement',
    'Real Estate',
    'Liabilities',
  ];

  const statuses: ('All' | DisplayAssetStatus)[] = [
    'All',
    'Located',
    'Claim ready',
    'Filed',
    'Blocked',
  ];

  const getStatusBadge = (status: DisplayAssetStatus) => {
    switch (status) {
      case 'Filed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Filed</span>
          </span>
        );
      case 'Claim ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <Sparkles className="w-3 h-3 text-sky-600" />
            <span>Claim ready</span>
          </span>
        );
      case 'Located':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Located</span>
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Blocked</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-7xl mx-auto text-left relative">
      {/* ========================================================================= */}
      {/* TOP TITLE & BREADCRUMB */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
              ESTATE PORTFOLIO
            </span>
            <span className="text-xs text-slate-400 font-mono">
              CASE {activeCaseId}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
            Estate Assets & Holdings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            12 discovered holdings registered under Late Ramesh Sharma (PAN: ABCPS4819M) with live settlement and transmission statuses.
          </p>
        </div>

        {/* Quick Summary Pill & Add Asset CTA */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddAssetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-md"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>Add Asset</span>
          </button>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-soft shrink-0">
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Estate</div>
              <div className="text-sm font-bold font-sans text-navy">₹2.84 Cr</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Status</div>
              <div className="text-xs font-semibold text-teal-700">12 of 12 Located</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEGMENTED FILTERS & SEARCH BOX (Synced with URL Query Params) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Segmented Filter Pills by Type */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => updateFilter({ type: cat })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  typeFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-navy hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat}
                {cat === 'All' ? ` (${ENHANCED_ASSETS.length})` : ''}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateFilter({ q: e.target.value })}
              placeholder="Search asset, institution, folio..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateFilter({ q: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Status Pills */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Status:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {statuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateFilter({ status: st })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    statusFilter.toLowerCase() === st.toLowerCase()
                      ? 'bg-teal-50 text-teal-800 border border-teal-300'
                      : 'text-slate-500 hover:text-navy hover:bg-slate-50'
                  }`}
                >
                  {st}
                  {st === 'Located' && ` (${locatedCount})`}
                  {st === 'Claim ready' && ` (${claimReadyCount})`}
                  {st === 'Filed' && ` (${filedCount})`}
                  {st === 'Blocked' && ` (${blockedCount})`}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Showing {filteredAndSortedAssets.length} of 12 Assets
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTERABLE DATA TABLE OF 12 ASSETS */}
      {/* Columns: Asset, Institution (logo), Type, Estimated value, Nominee, Status, Confidence, Action */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-virasat border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-navy transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset</span>
                    {sortKey === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Type</th>
                <th
                  onClick={() => handleSort('value')}
                  className="py-3 px-4 cursor-pointer hover:text-navy transition-colors select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Estimated value</span>
                    {sortKey === 'value' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Nominee</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-navy transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortKey === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('confidence')}
                  className="py-3 px-4 cursor-pointer hover:text-navy transition-colors select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Confidence</span>
                    {sortKey === 'confidence' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No assets match your search filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter({ type: null, status: null, q: null });
                      }}
                      className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAndSortedAssets.map((asset) => {
                  const isSelected = activeAsset?.id === asset.id;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => handleRowClick(asset)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-teal-50/60 font-medium'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Asset Name + Folio */}
                      <td className="py-3.5 px-4 font-serif">
                        <div className="font-bold text-navy group-hover:text-teal-700 transition-colors">
                          {asset.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {asset.accountOrFolioNumber}
                        </div>
                      </td>

                      {/* 2. Institution with Logo / Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-xs shrink-0"
                            style={{ backgroundColor: asset.institutionColor }}
                          >
                            {asset.institutionCode.slice(0, 3)}
                          </div>
                          <span className="text-slate-700 font-sans truncate max-w-[150px]">
                            {asset.institutionName}
                          </span>
                        </div>
                      </td>

                      {/* 3. Type Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            asset.isLiability
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {asset.category}
                        </span>
                      </td>

                      {/* 4. Estimated Value */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold font-mono text-xs sm:text-sm ${
                            asset.isLiability ? 'text-rose-600' : 'text-navy'
                          }`}
                        >
                          {formatINR(asset.grossValue, true)}
                        </span>
                      </td>

                      {/* 5. Nominee */}
                      <td className="py-3.5 px-4">
                        <div className="truncate max-w-[150px] text-slate-700">
                          {asset.nomineeName}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {asset.nomineeStatus}
                        </span>
                      </td>

                      {/* 6. Status Pill (Located / Claim ready / Filed / Blocked) */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(asset.status)}
                      </td>

                      {/* 7. Confidence Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          <span>{asset.confidenceScore}%</span>
                        </span>
                      </td>

                      {/* 8. Action (Open Drawer) */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(asset);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-navy px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIDE DRAWER (Opens when :assetId is in URL) */}
      {/* Shows: asset details, source doc thumbnail, extraction confidence, mini timeline */}
      {/* ========================================================================= */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-navy/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-full max-w-lg bg-white shadow-2xl h-full flex flex-col justify-between overflow-y-auto border-l border-slate-200 animate-in slide-in-from-right duration-200 text-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs"
                    style={{ backgroundColor: activeAsset.institutionColor }}
                  >
                    {activeAsset.institutionCode.slice(0, 3)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {activeAsset.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-navy hover:bg-slate-200/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-serif font-bold text-navy">
                  {activeAsset.name}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  {activeAsset.institutionName} • Folio {activeAsset.accountOrFolioNumber}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                {getStatusBadge(activeAsset.status)}
                <span className="text-xs text-slate-500">{activeAsset.statusDetail}</span>
              </div>
            </div>

            {/* Drawer Body Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Valuation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/30 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Estimated Asset Valuation
                  </div>
                  <div className="text-2xl font-bold font-sans text-navy">
                    {formatINR(activeAsset.grossValue, true)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Asset Class
                  </div>
                  <span className="text-xs font-semibold text-teal-800">
                    {activeAsset.isLiability ? 'Liability (Debt)' : 'Transferable Wealth'}
                  </span>
                </div>
              </div>

              {/* Extraction Confidence Section */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    <div>
                      <div className="text-xs font-bold text-navy">
                        AI Extraction Confidence
                      </div>
                      <div className="text-[10px] text-teal-700">
                        Verified via {activeAsset.docSource}
                      </div>
                    </div>
                  </div>
                  <span className="text-base font-mono font-bold text-teal-700">
                    {activeAsset.confidenceScore}%
                  </span>
                </div>

                {/* Extraction Fields */}
                <div className="space-y-1.5 pt-2 border-t border-teal-200/60">
                  {activeAsset.extractionFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/80"
                    >
                      <span className="text-slate-500">{field.label}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy">{field.value}</span>
                        {field.verified && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Document Thumbnail & "View Source Document" CTA */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-navy flex items-center justify-between">
                  <span>Source Verification Document</span>
                  <span className="text-[10px] text-slate-400 font-mono">DigiLocker Synced</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition-all space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-navy truncate">
                        {activeAsset.docName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {activeAsset.docType}
                      </div>
                      <div className="text-[10px] text-teal-700 mt-0.5">
                        Source: {activeAsset.docSource}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/case/${activeCaseId}/documents/${activeAsset.docId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-teal-800 border border-teal-200 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>View source document</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Mini Timeline of Changes ("Nominee updated 2023, recorded 2024") */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-navy flex items-center justify-between">
                  <span>History & Recorded Changes</span>
                  <span className="text-[10px] text-slate-400">Institutional Audit</span>
                </div>

                <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activeAsset.timelineChanges.map((item, idx) => (
                    <div key={idx} className="relative text-xs space-y-0.5">
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white" />
                      <div className="font-semibold text-navy font-sans">
                        {item.event}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Documentation */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-navy">
                  Required Transmission Documents
                </div>
                <div className="space-y-1.5">
                  {activeAsset.documentationRequired.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-700"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nominee Share Allocation Editor (Must total 100%) */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>Registered Nominee Allocations</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      Number(nomineeShare) + Number(nominee2Share) === 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Total: {Number(nomineeShare) + Number(nominee2Share)}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-medium text-navy">Sunita Sharma (Spouse)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={nomineeShare}
                        onChange={(e) => setNomineeShare(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded-lg text-navy text-xs"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-medium text-navy">Arjun Sharma (Son)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={nominee2Share}
                        onChange={(e) => setNominee2Share(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded-lg text-navy text-xs"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>

                {nomineeError && (
                  <p className="text-[11px] text-rose-600 font-medium">{nomineeError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSaveNominees}
                  disabled={isSavingNominees}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm"
                >
                  {isSavingNominees ? 'Saving...' : 'Save Nominees (Must Total 100%)'}
                </button>
              </div>

              {/* Special Notes */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong className="text-navy">Asset Note: </strong>
                {activeAsset.notes}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2 sticky bottom-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAsset}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <Link
                to={`/case/${activeCaseId}/claims/${activeAsset.claimId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
              >
                <span>Open claim</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                Add Estate Asset
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-navy mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kotak Mahindra Fixed Deposit"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="Banking">Banking</option>
                    <option value="Investments">Investments</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Valuables & Movable">Valuables & Movable</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-navy mb-1">Gross Value (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAsset.grossValue}
                    onChange={(e) => setNewAsset({ ...newAsset, grossValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-navy mb-1">Account / Folio Number</label>
                <input
                  type="text"
                  placeholder="e.g. FD-0912-4418"
                  value={newAsset.accountOrFolioNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, accountOrFolioNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light shadow-sm"
                >
                  {isSubmitting ? 'Adding...' : 'Add to Estate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM SUMMARY BAR: Total Assets vs Liabilities (Home Loan) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-elevated py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Summary Numbers */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Gross Discovered Assets
              </span>
              <span className="font-bold font-mono text-sm sm:text-base text-navy">
                {formatINR(totalGrossAssets, true)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">(11 Assets)</span>
            </div>

            <div className="h-7 w-px bg-slate-200" />

            <div>
              <span className="text-[10px] text-rose-500 uppercase font-semibold block">
                Total Liabilities
              </span>
              <span className="font-bold font-mono text-sm sm:text-base text-rose-600">
                -{formatINR(totalLiabilities, true)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">(HDFC Home Loan)</span>
            </div>

            <div className="h-7 w-px bg-slate-200" />

            <div>
              <span className="text-[10px] text-teal-600 uppercase font-bold block">
                Net Estate Value
              </span>
              <span className="font-bold font-mono text-base sm:text-lg text-navy">
                {formatINR(netEstateValue, true)}
              </span>
            </div>
          </div>

          {/* Right: Status Counts & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                {filedCount} Filed
              </span>
              <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md font-semibold">
                {claimReadyCount} Ready
              </span>
              <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                {locatedCount} Located
              </span>
              <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-semibold">
                {blockedCount} Blocked
              </span>
            </div>

            <Link
              to={`/case/${activeCaseId}/claims`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-colors"
            >
              <span>View All Claims</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
