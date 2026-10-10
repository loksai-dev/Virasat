import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FolderLock,
  FileText,
  ShieldCheck,
  Download,
  Upload,
  Eye,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Folder,
  FolderOpen,
  Lock,
  ExternalLink,
  ChevronRight,
  X,
  Edit3,
  Check,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Landmark,
  Shield,
  FileCheck2,
  Key,
  Database,
  Building2,
  CreditCard,
  FileBadge,
  Sparkles,
  RefreshCw,
  Hash,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

// =========================================================================
// TYPES & DEFINITIONS
// =========================================================================
export type DocumentFolder = 'all' | 'identity' | 'banking' | 'insurance' | 'property' | 'legal';

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number; // 0 - 100
  isLowConfidence?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number }; // percentage coords on doc
  notes?: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  docNumber: string;
  folder: 'identity' | 'banking' | 'insurance' | 'property' | 'legal';
  typeTag: string;
  status: 'Verified' | 'Pending Review' | 'Action Required';
  source: 'DigiLocker' | 'GHMC Portal' | 'MeeSeva' | 'Bank KRA' | 'Manual Upload';
  fileSize: string;
  uploadedAt: string;
  associatedAssetId?: string;
  associatedAssetName?: string;
  extractedFields: ExtractedField[];
  docTemplate: 'certificate' | 'bank_mandate' | 'policy' | 'deed' | 'kyc';
  thumbnailAccent: string;
}

// Initial Mock Documents
const INITIAL_VAULT_DOCUMENTS: VaultDocument[] = [
  {
    id: 'DOC-01',
    title: 'GHMC Certified Death Certificate',
    docNumber: 'GHMC/2026/004812',
    folder: 'identity',
    typeTag: 'Death Certificate',
    status: 'Verified',
    source: 'DigiLocker',
    fileSize: '1.4 MB',
    uploadedAt: '2026-01-20',
    associatedAssetId: 'asset-1',
    associatedAssetName: 'SBI Savings Account',
    docTemplate: 'certificate',
    thumbnailAccent: '#0D9488',
    extractedFields: [
      { id: 'f-1', label: 'Deceased Full Name', value: 'Late Ramesh Sharma', confidence: 99.8 },
      { id: 'f-2', label: 'Date of Death', value: '14-January-2026', confidence: 99.2 },
      { id: 'f-3', label: 'Registration Number', value: 'GHMC/2026/004812', confidence: 98.5 },
      {
        id: 'f-4',
        label: 'Place of Death (Hospital)',
        value: 'Care Hospital, Banjara Hills',
        confidence: 64.0,
        isLowConfidence: true,
        notes: 'Handwritten medical registry entry; OCR confidence below 75%. Please verify against scan.',
      },
      { id: 'f-5', label: 'Issuing Registrar', value: 'Health Officer, GHMC Circle 10', confidence: 97.4 },
    ],
  },
  {
    id: 'DOC-02',
    title: 'Family Member Certificate (Tahsildar)',
    docNumber: 'TG-REV-FMC-981291',
    folder: 'legal',
    typeTag: 'Succession Certificate',
    status: 'Verified',
    source: 'MeeSeva',
    fileSize: '2.1 MB',
    uploadedAt: '2026-01-24',
    associatedAssetId: 'asset-11',
    associatedAssetName: 'Jubilee Hills Residential Flat',
    docTemplate: 'certificate',
    thumbnailAccent: '#7C3AED',
    extractedFields: [
      { id: 'f-201', label: 'Surviving Spouse (Widow)', value: 'Sunita Sharma (Age 64)', confidence: 99.5 },
      { id: 'f-202', label: 'Living Son (Class-I)', value: 'Arjun Sharma (Age 34)', confidence: 99.0 },
      { id: 'f-203', label: 'Living Daughter (Class-I)', value: 'Priya Sharma (Age 30)', confidence: 98.8 },
      { id: 'f-204', label: 'Surviving Mother (Class-I)', value: 'Kamala Sharma (Age 88)', confidence: 98.2 },
      { id: 'f-205', label: 'Tahsildar Mandal Seal', value: 'Shaikpet Mandal, Hyderabad Dist', confidence: 96.5 },
    ],
  },
  {
    id: 'DOC-03',
    title: 'Legal Heir Certificate Application',
    docNumber: 'TG-LHC-APP-2026-44',
    folder: 'legal',
    typeTag: 'Statutory Application',
    status: 'Pending Review',
    source: 'MeeSeva',
    fileSize: '840 KB',
    uploadedAt: '2026-02-06',
    associatedAssetId: 'asset-11',
    associatedAssetName: 'Jubilee Hills Residential Flat',
    docTemplate: 'certificate',
    thumbnailAccent: '#F59E0B',
    extractedFields: [
      { id: 'f-301', label: 'Application Number', value: 'TG-LHC-APP-2026-44109', confidence: 99.1 },
      { id: 'f-302', label: 'MeeSeva Center ID', value: 'TS-MEESEVA-HYD-041', confidence: 92.5 },
      {
        id: 'f-303',
        label: 'Field Verification Report',
        value: 'Pending Village Revenue Officer Signoff',
        confidence: 68.5,
        isLowConfidence: true,
        notes: 'Inquiry in progress; signature pending from Mandal Revenue Inspector.',
      },
      { id: 'f-304', label: 'Court Caveat Search', value: 'Caveat Notice Lodged (Vikram Sharma)', confidence: 91.0 },
    ],
  },
  {
    id: 'DOC-04',
    title: 'Deceased PAN & Aadhaar Deactivation Dossier',
    docNumber: 'ABCPS4819M',
    folder: 'identity',
    typeTag: 'KYC Deactivation',
    status: 'Verified',
    source: 'DigiLocker',
    fileSize: '950 KB',
    uploadedAt: '2026-01-21',
    associatedAssetId: 'asset-1',
    associatedAssetName: 'SBI Savings Account',
    docTemplate: 'kyc',
    thumbnailAccent: '#0D9488',
    extractedFields: [
      { id: 'f-401', label: 'Permanent Account Number (PAN)', value: 'ABCPS4819M', confidence: 99.6 },
      { id: 'f-402', label: 'Aadhaar Reference Token', value: 'XXXX-XXXX-9104', confidence: 98.4 },
      { id: 'f-403', label: 'Deceased Legal Name', value: 'Ramesh Chandra Sharma', confidence: 99.1 },
      {
        id: 'f-404',
        label: 'Father’s Name in Record',
        value: 'Late Om Prakash Sharma',
        confidence: 71.0,
        isLowConfidence: true,
        notes: 'Slight ink fading on physical PAN card photocopy.',
      },
    ],
  },
  {
    id: 'DOC-05',
    title: 'Zerodha Demat Transmission Form (Annexure 7)',
    docNumber: 'ZER-TR-CDSL-202602-91',
    folder: 'banking',
    typeTag: 'Depository Annexure',
    status: 'Verified',
    source: 'Bank KRA',
    fileSize: '3.2 MB',
    uploadedAt: '2026-02-05',
    associatedAssetId: 'asset-4',
    associatedAssetName: 'Zerodha Demat Portfolio',
    docTemplate: 'bank_mandate',
    thumbnailAccent: '#387ED1',
    extractedFields: [
      { id: 'f-501', label: 'Depository Participant ID', value: 'IN300126 (CDSL)', confidence: 99.4 },
      { id: 'f-502', label: 'Client BO ID', value: '12081600-09281721', confidence: 99.0 },
      { id: 'f-503', label: 'Transferee Nominee Name', value: 'Arjun Sharma', confidence: 98.2 },
      { id: 'f-504', label: 'Estimated Equity Valuation', value: '₹45,00,000.00', confidence: 95.8 },
      { id: 'f-505', label: 'Client Master Report (CMR)', value: 'Verified Digitally via CDSL Easiest', confidence: 98.6 },
    ],
  },
  {
    id: 'DOC-06',
    title: 'CAMS Mutual Fund Form T3 Transmission Request',
    docNumber: 'CAMS-KRA-MF-49102',
    folder: 'banking',
    typeTag: 'Mutual Fund Transmission',
    status: 'Verified',
    source: 'Bank KRA',
    fileSize: '1.8 MB',
    uploadedAt: '2026-01-25',
    associatedAssetId: 'asset-5',
    associatedAssetName: 'SBI Mutual Fund Folio',
    docTemplate: 'bank_mandate',
    thumbnailAccent: '#0D9488',
    extractedFields: [
      { id: 'f-601', label: 'Mutual Fund Folio Number', value: '91028471/02', confidence: 99.3 },
      { id: 'f-602', label: 'Scheme Description', value: 'SBI Bluechip Fund - Direct Growth', confidence: 98.8 },
      { id: 'f-603', label: 'Registered Nominee', value: 'Priya Sharma (Daughter)', confidence: 98.0 },
      { id: 'f-604', label: 'Unit Balance', value: '38,410.88 Units (₹25,00,000)', confidence: 96.5 },
    ],
  },
  {
    id: 'DOC-07',
    title: 'LIC Jeevan Anand Policy Bond (Original Policy)',
    docNumber: 'LIC-POL-6819201',
    folder: 'insurance',
    typeTag: 'Life Insurance Bond',
    status: 'Verified',
    source: 'DigiLocker',
    fileSize: '2.8 MB',
    uploadedAt: '2026-01-28',
    associatedAssetId: 'asset-6',
    associatedAssetName: 'LIC Jeevan Anand Policy',
    docTemplate: 'policy',
    thumbnailAccent: '#D97706',
    extractedFields: [
      { id: 'f-701', label: 'Policy Number', value: '681920194', confidence: 99.4 },
      { id: 'f-702', label: 'Sum Assured & Bonuses', value: '₹30,00,000.00', confidence: 98.9 },
      { id: 'f-703', label: 'Beneficial Nominee (§39)', value: 'Sunita Sharma (Spouse)', confidence: 99.2 },
      { id: 'f-704', label: 'Branch Code', value: 'LIC Divisional Office Hyderabad (641)', confidence: 97.0 },
    ],
  },
  {
    id: 'DOC-08',
    title: 'HDFC Multi-Heir Indemnity Bond & Stamp Franking',
    docNumber: 'HDFC-IB-2026-88',
    folder: 'banking',
    typeTag: 'Bank Indemnity Bond',
    status: 'Verified',
    source: 'Manual Upload',
    fileSize: '4.5 MB',
    uploadedAt: '2026-02-02',
    associatedAssetId: 'asset-2',
    associatedAssetName: 'HDFC Savings Account',
    docTemplate: 'bank_mandate',
    thumbnailAccent: '#004C8F',
    extractedFields: [
      { id: 'f-801', label: 'Deceased Account Number', value: '5010048107721', confidence: 99.1 },
      { id: 'f-802', label: 'Franking Stamp Duty', value: '₹500 Non-Judicial E-Stamp', confidence: 97.5 },
      {
        id: 'f-803',
        label: 'Surety Witness Signature',
        value: 'M. S. Narayanan (Surety 1)',
        confidence: 62.5,
        isLowConfidence: true,
        notes: 'Handwritten notary cursive text; requires visual audit.',
      },
      { id: 'f-804', label: 'Joint Indemnifiers', value: 'Sunita Sharma & Arjun Sharma', confidence: 98.0 },
    ],
  },
  {
    id: 'DOC-09',
    title: 'Registered Sale Deed (Jubilee Hills Apartment)',
    docNumber: 'DOC-HYD-2014-8821',
    folder: 'property',
    typeTag: 'Title Deed',
    status: 'Verified',
    source: 'Manual Upload',
    fileSize: '6.8 MB',
    uploadedAt: '2026-01-26',
    associatedAssetId: 'asset-11',
    associatedAssetName: 'Jubilee Hills Residential Flat',
    docTemplate: 'deed',
    thumbnailAccent: '#7C3AED',
    extractedFields: [
      { id: 'f-901', label: 'Document Number', value: 'Book 1 / 4410 / 2014', confidence: 99.4 },
      { id: 'f-902', label: 'Sub-Registrar Office', value: 'SRO Banjara Hills, Hyderabad', confidence: 98.7 },
      { id: 'f-903', label: 'Super Built-up Area', value: '2,450 Sq. Ft. (Flat 402)', confidence: 97.0 },
      {
        id: 'f-904',
        label: 'Municipal Property Tax Assessment #',
        value: 'PTIN: 1012-004-912',
        confidence: 68.0,
        isLowConfidence: true,
        notes: 'Faded Telugu revenue stamp on endorsement page 12.',
      },
    ],
  },
  {
    id: 'DOC-10',
    title: 'EPFO Composite Death Claim Form 20 & 10D',
    docNumber: 'EPFO-CCF-DEATH-77182',
    folder: 'banking',
    typeTag: 'Provident Fund Claim',
    status: 'Pending Review',
    source: 'Manual Upload',
    fileSize: '2.4 MB',
    uploadedAt: '2026-02-13',
    associatedAssetId: 'asset-7',
    associatedAssetName: 'Employees Provident Fund (EPF)',
    docTemplate: 'bank_mandate',
    thumbnailAccent: '#059669',
    extractedFields: [
      { id: 'f-1001', label: 'Universal Account Number (UAN)', value: '100918274619', confidence: 99.7 },
      { id: 'f-1002', label: 'Establishment Code', value: 'AP/HYD/0019284/000', confidence: 98.9 },
      { id: 'f-1003', label: 'Nominee Aadhaar Token', value: 'XXXX-XXXX-1920', confidence: 98.2 },
      { id: 'f-1004', label: 'Total Accumulation (EPF + EPS)', value: '₹28,00,000.00', confidence: 96.0 },
    ],
  },
  {
    id: 'DOC-11',
    title: 'Telangana MeeSeva Encumbrance Certificate',
    docNumber: 'TG-EC-2026-00192',
    folder: 'property',
    typeTag: 'Encumbrance Certificate',
    status: 'Verified',
    source: 'MeeSeva',
    fileSize: '1.2 MB',
    uploadedAt: '2026-02-01',
    associatedAssetId: 'asset-11',
    associatedAssetName: 'Jubilee Hills Residential Flat',
    docTemplate: 'deed',
    thumbnailAccent: '#7C3AED',
    extractedFields: [
      { id: 'f-1101', label: 'Period of Search', value: '01-Jan-2010 to 31-Jan-2026 (16 Years)', confidence: 99.2 },
      { id: 'f-1102', label: 'Encumbrance Finding', value: 'HDFC Bank Mortgage Charge (₹28L)', confidence: 98.4 },
      { id: 'f-1103', label: 'Survey Number', value: 'Sy No. 129/1 Paiki, Jubilee Hills', confidence: 97.8 },
    ],
  },
  {
    id: 'DOC-12',
    title: 'LIC Form 3783 (Discharge Voucher Form)',
    docNumber: 'LIC-DV-3783-HYD',
    folder: 'insurance',
    typeTag: 'Discharge Voucher',
    status: 'Action Required',
    source: 'Manual Upload',
    fileSize: '620 KB',
    uploadedAt: '2026-02-15',
    associatedAssetId: 'asset-6',
    associatedAssetName: 'LIC Jeevan Anand Policy',
    docTemplate: 'policy',
    thumbnailAccent: '#D97706',
    extractedFields: [
      { id: 'f-1201', label: 'Policy Number', value: '681920194', confidence: 98.6 },
      { id: 'f-1202', label: 'Claimant Signature', value: 'Sunita Sharma (Affixed)', confidence: 95.0 },
      {
        id: 'f-1203',
        label: 'One-Rupee Revenue Stamp',
        value: 'Missing / Unfranked Stamp Block',
        confidence: 58.0,
        isLowConfidence: true,
        notes: 'Action Required: Scanned voucher is missing signed ₹1 revenue stamp.',
      },
    ],
  },
];

export const DocumentsPage: React.FC = () => {
  const { caseId: paramCaseId, docId: routeDocId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { caseId: storeCaseId, addToast } = useVirasatStore();

  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Folder filter in URL: ?folder=all | identity | banking | insurance | property | legal
  const currentFolder = (searchParams.get('folder') || 'all') as DocumentFolder;

  const handleSelectFolder = (folder: DocumentFolder) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (folder === 'all') {
        next.delete('folder');
      } else {
        next.set('folder', folder);
      }
      return next;
    });
  };

  // Local state for documents & extracted field edits
  const [documents, setDocuments] = useState<VaultDocument[]>(INITIAL_VAULT_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected document for split view (from URL :docId or state)
  const selectedDoc = useMemo(() => {
    if (!routeDocId) return null;
    return documents.find((d) => d.id === routeDocId) || null;
  }, [routeDocId, documents]);

  // Editable fields state for selected doc
  const [editableFields, setEditableFields] = useState<ExtractedField[]>([]);
  const [hasFieldEdits, setHasFieldEdits] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setEditableFields(JSON.parse(JSON.stringify(selectedDoc.extractedFields)));
      setHasFieldEdits(false);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCloseSplitView();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedDoc]);

  // Filter documents by folder and search query
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesFolder = currentFolder === 'all' ? true : doc.folder === currentFolder;
      const matchesSearch =
        searchQuery.trim() === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.typeTag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [documents, currentFolder, searchQuery]);

  // Folder counts
  const folderCounts = useMemo(() => {
    return {
      all: documents.length,
      identity: documents.filter((d) => d.folder === 'identity').length,
      banking: documents.filter((d) => d.folder === 'banking').length,
      insurance: documents.filter((d) => d.folder === 'insurance').length,
      property: documents.filter((d) => d.folder === 'property').length,
      legal: documents.filter((d) => d.folder === 'legal').length,
    };
  }, [documents]);

  // Split view navigation
  const handleOpenDoc = (docId: string) => {
    const folderParam = currentFolder !== 'all' ? `?folder=${currentFolder}` : '';
    navigate(`/case/${activeCaseId}/documents/${docId}${folderParam}`);
  };

  const handleCloseSplitView = () => {
    const folderParam = currentFolder !== 'all' ? `?folder=${currentFolder}` : '';
    navigate(`/case/${activeCaseId}/documents${folderParam}`);
  };

  // Save edits to extracted fields
  const handleSaveFieldEdits = () => {
    if (!selectedDoc) return;
    setDocuments((prev) =>
      prev.map((d) => (d.id === selectedDoc.id ? { ...d, extractedFields: editableFields } : d))
    );
    setHasFieldEdits(false);
    addToast({
      type: 'success',
      title: 'Extracted Data Updated',
      message: `Verified and saved ${editableFields.length} extracted fields for ${selectedDoc.title}.`,
    });
  };

  const handleFieldValueChange = (fieldId: string, newValue: string) => {
    setEditableFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value: newValue } : f))
    );
    setHasFieldEdits(true);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-left relative">
      {/* Top Header Card */}
      <div className="p-6 md:p-7 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <FolderLock className="w-3.5 h-3.5 text-teal-600" />
                <span>EVIDENCE & DOCUMENT VAULT</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {documents.length} Cryptographic Folios
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Encrypted Document Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              DigiLocker integrated repository with Gemini Vision OCR extraction, cryptographic hash verification, and court-admissible audit logging.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'DigiLocker Pull Initiated',
                  message: 'Querying national repository with Aadhaar OTP authentication. Fetching GHMC & MeeSeva archives.',
                })
              }
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-md flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Fetch via DigiLocker</span>
            </button>
          </div>
        </div>

        {/* Security Banner: "Encrypted, access-logged" */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-slate-900 via-navy to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-teal-500/30 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-teal-300" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">
                  Encrypted, access-logged
                </span>
                <span className="text-[10px] bg-teal-400/20 text-teal-300 border border-teal-400/40 px-2 py-0.2 rounded-full font-mono">
                  AES-256 GCM
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                All document queries, edits, and transmission exports are permanently logged to an immutable SHA-256 Google Cloud KMS ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>KMS Vault Active</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Folder Tree (Col 3) + Main Documents Grid (Col 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Folder Tree (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-teal-600" />
                <span>Folders</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {documents.length} Total
              </span>
            </div>

            {/* Folder Navigation Tree */}
            <nav className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Documents', icon: Folder, count: folderCounts.all },
                { id: 'identity', label: 'Identity', icon: Shield, count: folderCounts.identity },
                { id: 'banking', label: 'Banking', icon: Landmark, count: folderCounts.banking },
                { id: 'insurance', label: 'Insurance', icon: ShieldCheck, count: folderCounts.insurance },
                { id: 'property', label: 'Property', icon: Building2, count: folderCounts.property },
                { id: 'legal', label: 'Legal', icon: Scale, count: folderCounts.legal },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentFolder === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectFolder(item.id as DocumentFolder)}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all text-left',
                      isActive
                        ? 'bg-navy text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-navy hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-teal-400' : 'text-slate-400')} />
                      <span>{item.label}</span>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md font-mono font-bold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Verification Stats Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Verification Health
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                </span>
                <span className="font-mono font-bold text-navy">
                  {documents.filter((d) => d.status === 'Verified').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-700 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                </span>
                <span className="font-mono font-bold text-navy">
                  {documents.filter((d) => d.status === 'Pending Review').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-rose-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Action Required
                </span>
                <span className="font-mono font-bold text-navy">
                  {documents.filter((d) => d.status === 'Action Required').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area: Search Bar + Documents Grid (9 Cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Search & Active Folder Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, document #, or type tag..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 shadow-xs"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Showing:</span>
              <span className="font-bold text-navy capitalize bg-slate-100 px-2 py-0.5 rounded-md">
                {currentFolder} Folder ({filteredDocuments.length})
              </span>
            </div>
          </div>

          {/* Grid of Document Cards with Thumbnails, Type Tags & Extracted Fields Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const isVerified = doc.status === 'Verified';
              const isAction = doc.status === 'Action Required';
              const lowConfidenceField = doc.extractedFields.find((f) => f.isLowConfidence || f.confidence < 75);

              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDoc(doc.id)}
                  className="p-4 rounded-virasat bg-white border border-slate-200/90 shadow-soft hover:shadow-md hover:border-teal-500/80 transition-all cursor-pointer group flex flex-col justify-between space-y-3.5 text-left relative overflow-hidden"
                >
                  {/* Top: Thumbnail Preview Box */}
                  <div className="relative h-28 w-full rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden flex flex-col items-center justify-center p-3 group-hover:border-teal-300 transition-colors">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0B1F3A_1px,transparent_1px)] [background-size:8px_8px]" />

                    {/* Miniature Document Visual Card */}
                    <div className="w-3/4 h-20 bg-white rounded-md shadow-xs border border-slate-200 p-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: doc.thumbnailAccent }} />
                        <span className="text-[8px] font-mono text-slate-400">{doc.docNumber}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-1.5 bg-slate-200 rounded-sm" />
                        <div className="w-1/2 h-1 bg-slate-100 rounded-sm" />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[7px] text-teal-700 font-mono">SEALED</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" />
                      </div>
                    </div>

                    {/* Floating Status Badge on Thumbnail */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={cn(
                          'text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-xs',
                          isVerified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isAction
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {doc.status}
                      </span>
                    </div>

                    {/* Type Tag on bottom left */}
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[9px] font-medium bg-navy/85 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {doc.typeTag}
                      </span>
                    </div>
                  </div>

                  {/* Document Title & Reference # */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-serif font-bold text-navy group-hover:text-teal-700 transition-colors line-clamp-1">
                      {doc.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Doc #{doc.docNumber}</span>
                      <span>{doc.fileSize}</span>
                    </div>
                  </div>

                  {/* "Extracted Fields" Preview Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>Extracted Data Preview</span>
                      <span className="text-teal-700 font-mono">
                        {doc.extractedFields.length} fields
                      </span>
                    </div>

                    {/* First 2 extracted fields */}
                    <div className="space-y-0.5 pt-0.5">
                      {doc.extractedFields.slice(0, 2).map((field) => (
                        <div key={field.id} className="flex items-baseline justify-between text-[11px] gap-2">
                          <span className="text-slate-500 truncate max-w-[110px]">{field.label}:</span>
                          <span className="font-semibold text-navy truncate font-sans">{field.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Low-confidence field indicator if present */}
                    {lowConfidenceField && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Low Confidence Flag: {lowConfidenceField.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Source & Click prompt */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400 text-[10px]">
                      Source: <strong className="text-slate-700">{doc.source}</strong>
                    </span>

                    <span className="text-teal-600 group-hover:text-teal-800 font-semibold text-[11px] flex items-center gap-0.5">
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SPLIT VIEW MODAL / DRAWER (ORIGINAL DOC LEFT vs EXTRACTED DATA RIGHT)     */}
      {/* ========================================================================= */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy/60 backdrop-blur-xs cursor-pointer"
          onClick={handleCloseSplitView}
        >
          <div
            className="bg-white rounded-virasat max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col justify-between overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Split View Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-serif font-bold text-navy truncate">
                      {selectedDoc.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                      {selectedDoc.docNumber}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        selectedDoc.status === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {selectedDoc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Source: {selectedDoc.source} • Uploaded {selectedDoc.uploadedAt} • File size: {selectedDoc.fileSize}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Linked Asset Link */}
                {selectedDoc.associatedAssetId && (
                  <Link
                    to={`/case/${activeCaseId}/assets/${selectedDoc.associatedAssetId}`}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Linked asset ({selectedDoc.associatedAssetName?.split(' ')[0]}) →</span>
                  </Link>
                )}

                <button
                  onClick={handleCloseSplitView}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-200 transition-colors"
                  aria-label="Close split view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split View Body: 50% Left (Document Facsimile) + 50% Right (Extracted Fields) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
              {/* LEFT SIDE: Original Document Image Facsimile */}
              <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-navy flex items-center gap-1.5">
                    <FileBadge className="w-4 h-4 text-teal-600" />
                    <span>Original Document Facsimile Scan</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <span>100% Zoom</span>
                  </div>
                </div>

                {/* High-Fidelity Certificate / Document Preview Container */}
                <div className="flex-1 min-h-[360px] bg-white rounded-xl shadow-md border border-slate-300 p-6 flex flex-col justify-between space-y-4 relative select-none">
                  {/* Decorative Border */}
                  <div className="absolute inset-2 border border-slate-200 pointer-events-none rounded-lg" />
                  <div className="absolute inset-3 border border-dashed border-slate-200 pointer-events-none rounded-sm" />

                  {/* Header of Certificate */}
                  <div className="text-center space-y-1 relative z-10 pt-2">
                    <div className="text-[10px] tracking-widest uppercase font-bold text-slate-400 font-mono">
                      GOVERNMENT OF TELANGANA / CERTIFIED REGISTRY
                    </div>
                    <h4 className="font-serif font-bold text-base sm:text-lg text-navy tracking-tight">
                      {selectedDoc.title.toUpperCase()}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500">
                      DOCUMENT REFERENCE: {selectedDoc.docNumber}
                    </p>
                  </div>

                  {/* Body text representation */}
                  <div className="space-y-3 relative z-10 text-xs text-slate-700 font-serif leading-relaxed px-2">
                    <p className="text-center italic text-slate-500 text-[11px]">
                      This is to certify that pursuant to statutory filings under the Registration of Births & Deaths Act / Indian Succession Act, the following records are certified:
                    </p>

                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/70 space-y-1.5 font-sans text-xs">
                      {editableFields.map((f) => (
                        <div
                          key={f.id}
                          className={cn(
                            'flex justify-between py-0.5 border-b border-slate-100 text-[11px]',
                            (f.isLowConfidence || f.confidence < 75) && 'bg-amber-100/60 px-1 rounded'
                          )}
                        >
                          <span className="text-slate-500">{f.label}:</span>
                          <span className="font-semibold text-navy">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Stamps & Signatures */}
                  <div className="flex items-end justify-between pt-4 border-t border-slate-200 relative z-10 text-[10px]">
                    <div className="space-y-1">
                      <div className="w-12 h-12 rounded-full border-2 border-teal-600/40 border-dashed flex items-center justify-center text-[8px] font-bold text-teal-800 rotate-12">
                        OFFICIAL SEAL
                      </div>
                      <span className="text-slate-400 font-mono">VERIFIED BY DIGILOCKER</span>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-serif italic font-bold text-navy text-xs underline">
                        R. K. Shastry
                      </div>
                      <div className="text-[9px] text-slate-500">Authorized Certifying Officer</div>
                      <div className="text-[8px] font-mono text-slate-400">Date: {selectedDoc.uploadedAt}</div>
                    </div>
                  </div>
                </div>

                {/* Document Scan Controls */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        addToast({
                          type: 'info',
                          title: 'Export Document PDF',
                          message: `Downloading certified copy of ${selectedDoc.title}...`,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-navy font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    SHA-256: 7f83b1657ff1...
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: Editable Extracted Fields with Confidence Colors */}
              <div className="p-4 sm:p-6 overflow-y-auto bg-white flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  {/* Confidence Summary Banner */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span>AI Extracted Fields & Confidence Score</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Extracted via Gemini Vision 1.5 Pro. Edit fields directly to update records.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        96.8% Match
                      </span>
                    </div>
                  </div>

                  {/* List of Editable Extracted Fields with VISIBLE LOW-CONFIDENCE HIGHLIGHTING */}
                  <div className="space-y-3">
                    {editableFields.map((field) => {
                      const isLowConfidence = field.isLowConfidence || field.confidence < 75;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            'p-3.5 rounded-xl border transition-all text-xs space-y-1.5',
                            isLowConfidence
                              ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-300/40 shadow-xs'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-navy text-[11px] flex items-center gap-1.5">
                              <span>{field.label}</span>
                              {isLowConfidence && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                            </label>

                            {/* Confidence Score Pill */}
                            <span
                              className={cn(
                                'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
                                field.confidence >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : field.confidence >= 75
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-rose-100 text-rose-800 font-bold border border-rose-300 animate-pulse'
                              )}
                            >
                              {field.confidence >= 90 && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {isLowConfidence && <AlertCircle className="w-2.5 h-2.5" />}
                              <span>{field.confidence}% Confidence</span>
                            </span>
                          </div>

                          {/* Editable Input Box */}
                          <div className="relative">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                              className={cn(
                                'w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 transition-all font-sans',
                                isLowConfidence
                                  ? 'border-amber-400 focus:ring-amber-500 font-semibold text-amber-950'
                                  : 'border-slate-300 focus:ring-teal-500 text-slate-800'
                              )}
                            />
                          </div>

                          {/* Low Confidence Warning Note */}
                          {isLowConfidence && (
                            <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1 pt-0.5">
                              <span>⚠️ Low confidence field: Please inspect original scan to confirm accuracy.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Changes Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {hasFieldEdits ? (
                      <span className="text-amber-700 font-semibold">● Unsaved field modifications</span>
                    ) : (
                      <span>All fields in sync with verified vault</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedDoc.associatedAssetId && (
                      <Link
                        to={`/case/${activeCaseId}/assets/${selectedDoc.associatedAssetId}`}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-navy transition-colors flex items-center gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>View Asset</span>
                      </Link>
                    )}

                    <button
                      onClick={handleSaveFieldEdits}
                      disabled={!hasFieldEdits}
                      className={cn(
                        'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5',
                        hasFieldEdits
                          ? 'bg-navy text-white hover:bg-navy-light'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      <Save className="w-3.5 h-3.5 text-teal-400" />
                      <span>Save Field Edits</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
