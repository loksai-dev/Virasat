import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Fingerprint,
  FileCheck2,
  Download,
  Copy,
  Check,
  Clock,
  User,
  Users,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Send,
  Lock,
  Building2,
  FileText,
  Eye,
  KeyRound,
  X,
  Share2,
  Printer
} from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

// --- Type Definitions ---
interface FamilyMemberConsent {
  id: string;
  name: string;
  relation: string;
  classType: 'Class-I Heir' | 'Class-II Relative' | 'Beneficiary';
  avatar: string;
  sharePercent: number;
  shareAmount: number;
  phone: string;
  maskedAadhaar: string;
  // Consents toggles
  assetDiscoveryConsent: boolean;
  settlementAgreementConsent: boolean;
  bankTransmissionConsent: boolean;
  // eSign details
  eSignStatus: 'signed' | 'pending' | 'revoked';
  eSignTimestamp?: string;
  eSignAuthId?: string;
  eSignIp?: string;
  certSerialNumber?: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  actorType: 'agent' | 'human' | 'system';
  actorName: string;
  actorRole: string;
  actionTitle: string;
  actionCategory: 'Intake' | 'Discovery' | 'Devolution' | 'Consent' | 'Approval' | 'Dispatch';
  description: string;
  hash: string;
  previousHash: string;
  status: 'VERIFIED' | 'APPROVED' | 'COMPLETED' | 'PENDING';
  payloadSummary: string;
  artifactUrl?: string;
}

// Initial Family Heirs with Consent & eSign status
const initialFamilyConsents: FamilyMemberConsent[] = [
  {
    id: 'p-sunita',
    name: 'Sunita Sharma',
    relation: 'Surviving Spouse • Primary Claimant',
    classType: 'Class-I Heir',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    sharePercent: 40,
    shareAmount: 11360000,
    phone: '+91 98490 •••••',
    maskedAadhaar: 'XXXX-XXXX-4819',
    assetDiscoveryConsent: true,
    settlementAgreementConsent: true,
    bankTransmissionConsent: true,
    eSignStatus: 'signed',
    eSignTimestamp: '2026-02-14 11:32:04 IST',
    eSignAuthId: 'UIDAI-OTP-AUTH-8829104',
    eSignIp: '182.73.14.88 (Hyderabad)',
    certSerialNumber: 'CCA-EMUDHRA-2026-904128'
  },
  {
    id: 'p-arjun',
    name: 'Arjun Sharma',
    relation: 'Son • Appointed Family Executor',
    classType: 'Class-I Heir',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    sharePercent: 20,
    shareAmount: 5680000,
    phone: '+91 99801 •••••',
    maskedAadhaar: 'XXXX-XXXX-7123',
    assetDiscoveryConsent: true,
    settlementAgreementConsent: true,
    bankTransmissionConsent: true,
    eSignStatus: 'signed',
    eSignTimestamp: '2026-02-15 09:14:22 IST',
    eSignAuthId: 'UIDAI-OTP-AUTH-8830419',
    eSignIp: '49.207.210.12 (Bengaluru)',
    certSerialNumber: 'CCA-EMUDHRA-2026-904129'
  },
  {
    id: 'p-kavita',
    name: 'Kavita Sharma-Nair',
    relation: 'Daughter • Co-Heir (London, UK)',
    classType: 'Class-I Heir',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    sharePercent: 20,
    shareAmount: 5680000,
    phone: '+44 7700 •••••',
    maskedAadhaar: 'XXXX-XXXX-3341',
    assetDiscoveryConsent: true,
    settlementAgreementConsent: true,
    bankTransmissionConsent: false,
    eSignStatus: 'pending',
    eSignTimestamp: undefined,
    eSignAuthId: undefined
  },
  {
    id: 'p-radha',
    name: 'Radha Sharma',
    relation: 'Mother of Deceased (Age 89)',
    classType: 'Class-I Heir',
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80',
    sharePercent: 20,
    shareAmount: 5680000,
    phone: '+91 94401 •••••',
    maskedAadhaar: 'XXXX-XXXX-1902',
    assetDiscoveryConsent: true,
    settlementAgreementConsent: true,
    bankTransmissionConsent: true,
    eSignStatus: 'signed',
    eSignTimestamp: '2026-02-16 16:45:10 IST',
    eSignAuthId: 'UIDAI-OTP-AUTH-8839912',
    eSignIp: '182.73.14.88 (Hyderabad)',
    certSerialNumber: 'CCA-EMUDHRA-2026-904130'
  }
];

// Initial Tamper-Evident Audit Timeline
const initialAuditTimeline: AuditEvent[] = [
  {
    id: 'ev-001',
    timestamp: '2026-01-20 09:15:33 IST',
    actorType: 'human',
    actorName: 'Arjun Sharma',
    actorRole: 'Family Administrator',
    actionTitle: 'Case Initiation & Death Certificate Upload',
    actionCategory: 'Intake',
    description: 'Case registered. Uploaded municipal death certificate GHMC/2026/004812 with family declaration.',
    hash: 'sha256:7e8a91b4028f09c81129b01859cda8112f00a9cb18491823a0184b8192a014a1',
    previousHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    status: 'COMPLETED',
    payloadSummary: '{"decedent": "Ramesh Sharma", "reg_no": "GHMC/2026/004812", "date_of_death": "2026-01-14"}'
  },
  {
    id: 'ev-002',
    timestamp: '2026-01-20 09:16:04 IST',
    actorType: 'agent',
    actorName: 'DocuVerifyAgent',
    actorRole: 'Vertex AI Document AI',
    actionTitle: 'Cloud DLP Masking & Civil Registration Verification',
    actionCategory: 'Intake',
    description: 'Aadhaar numbers masked with Cloud DLP. Death certificate authenticity validated against CRS database.',
    hash: 'sha256:3f18b901a8829cba1192830fba10928bcca1982839bfa810283bba8102938b81',
    previousHash: 'sha256:7e8a91b4028f09c81129b01859cda8112f00a9cb18491823a0184b8192a014a1',
    status: 'VERIFIED',
    payloadSummary: '{"crs_match": true, "dlp_redactions": 4, "masked_id": "XXXX-XXXX-7412", "model_armor_check": "PASS"}'
  },
  {
    id: 'ev-003',
    timestamp: '2026-01-21 14:22:18 IST',
    actorType: 'agent',
    actorName: 'AssetDiscoveryAgent',
    actorRole: 'Account Aggregator & KRA Client',
    actionTitle: 'Account Aggregator Consent & Asset Scan Completed',
    actionCategory: 'Discovery',
    description: 'Discovered 12 financial assets totaling ₹3.12 Cr across HDFC, SBI, Zerodha, CAMS, and LIC of India.',
    hash: 'sha256:91ba0283fb10928a88192039ba810293bfa019283ba810293bfa019283ba8102',
    previousHash: 'sha256:3f18b901a8829cba1192830fba10928bcca1982839bfa810283bba8102938b81',
    status: 'VERIFIED',
    payloadSummary: '{"assets_count": 12, "gross_value_inr": 31200000, "aa_session_token": "AA-IND-TS-991823"}'
  },
  {
    id: 'ev-004',
    timestamp: '2026-01-24 10:48:52 IST',
    actorType: 'agent',
    actorName: 'LegalDevolutionAgent',
    actorRole: 'GraphRAG Statutory Engine',
    actionTitle: 'Hindu Succession Act §8 & §10 Share Allocation Computed',
    actionCategory: 'Devolution',
    description: 'Grounded traversal of Class-I rules. Established 4 equal coparcenary and intestate shares.',
    hash: 'sha256:55ab102938bf8102938ba019283bfa019283ba8102938bfa019283ba8102938b',
    previousHash: 'sha256:91ba0283fb10928a88192039ba810293bfa019283ba810293bfa019283ba8102',
    status: 'VERIFIED',
    payloadSummary: '{"statute": "HSA_1956_SEC_8", "heirs_entitled": 4, "share_split": {"sunita": 0.40, "others": 0.20}}'
  },
  {
    id: 'ev-005',
    timestamp: '2026-02-02 11:15:40 IST',
    actorType: 'human',
    actorName: 'Adv. Rajeshwar Mehta',
    actorRole: 'Independent Legal Counsel (HITL Gate)',
    actionTitle: 'Human-in-the-Loop (HITL) Devolution Audit Clearance',
    actionCategory: 'Approval',
    description: 'Advocate verified kinship certificate MeeSeva-TS-8819 and confirmed exclusion of collateral claimants.',
    hash: 'sha256:4419283bfa019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa',
    previousHash: 'sha256:55ab102938bf8102938ba019283bfa019283ba8102938bfa019283ba8102938b',
    status: 'APPROVED',
    payloadSummary: '{"bar_council_id": "TS/1402/2009", "legal_opinion": "UNCONTESTED_CLASS_I_ENTITLEMENT", "dual_key": true}'
  },
  {
    id: 'ev-006',
    timestamp: '2026-02-14 11:32:04 IST',
    actorType: 'human',
    actorName: 'Sunita Sharma',
    actorRole: 'Surviving Spouse',
    actionTitle: 'Aadhaar OTP e-Sign Executed (Family Settlement Agreement)',
    actionCategory: 'Consent',
    description: 'Digitally signed unified Family Settlement Agreement (FSA) via UIDAI e-Sign portal.',
    hash: 'sha256:8b4f17a9e2c6081d4b673a1f9e20a4b8192839bfa810283bba8102938b81a29f',
    previousHash: 'sha256:4419283bfa019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa',
    status: 'COMPLETED',
    payloadSummary: '{"signer": "Sunita Sharma", "auth_id": "UIDAI-OTP-AUTH-8829104", "cert_sn": "CCA-EMUDHRA-2026-904128"}'
  },
  {
    id: 'ev-007',
    timestamp: '2026-02-15 09:14:22 IST',
    actorType: 'human',
    actorName: 'Arjun Sharma',
    actorRole: 'Son & Executor',
    actionTitle: 'Aadhaar OTP e-Sign Executed (Family Settlement Agreement)',
    actionCategory: 'Consent',
    description: 'Digitally signed unified Family Settlement Agreement (FSA) via UIDAI e-Sign portal.',
    hash: 'sha256:1a9283bfa019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa01',
    previousHash: 'sha256:8b4f17a9e2c6081d4b673a1f9e20a4b8192839bfa810283bba8102938b81a29f',
    status: 'COMPLETED',
    payloadSummary: '{"signer": "Arjun Sharma", "auth_id": "UIDAI-OTP-AUTH-8830419", "cert_sn": "CCA-EMUDHRA-2026-904129"}'
  },
  {
    id: 'ev-008',
    timestamp: '2026-02-16 16:45:10 IST',
    actorType: 'human',
    actorName: 'Radha Sharma',
    actorRole: 'Mother of Deceased',
    actionTitle: 'Aadhaar OTP e-Sign Executed (Assisted Biometric Sign)',
    actionCategory: 'Consent',
    description: 'Digitally signed unified Family Settlement Agreement (FSA) via UIDAI e-Sign portal.',
    hash: 'sha256:2b019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa019283ba',
    previousHash: 'sha256:1a9283bfa019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa01',
    status: 'COMPLETED',
    payloadSummary: '{"signer": "Radha Sharma", "auth_id": "UIDAI-OTP-AUTH-8839912", "cert_sn": "CCA-EMUDHRA-2026-904130"}'
  },
  {
    id: 'ev-009',
    timestamp: '2026-02-18 10:20:15 IST',
    actorType: 'agent',
    actorName: 'ClaimDossierPackager',
    actorRole: 'Institutional STP Dispatcher',
    actionTitle: 'RBI Master Circular Section 2.1 Standardized Indemnity Packaged',
    actionCategory: 'Dispatch',
    description: 'Auto-generated standardized claim packets for SBI, HDFC, and Zerodha. Dispatched to Bank STP API.',
    hash: 'sha256:6c9102938bfa019283ba8102938bfa019283ba8102938bfa019283ba8102938b',
    previousHash: 'sha256:2b019283ba8102938bfa019283ba8102938bfa019283ba8102938bfa019283ba',
    status: 'VERIFIED',
    payloadSummary: '{"dispatched_banks": ["SBI", "HDFC", "ZERODHA"], "stp_tokens_generated": 3, "rbi_circular": "DBOD.No.Leg.BC.95"}'
  }
];

export const ConsentAuditPage: React.FC = () => {
  const { caseId: paramCaseId } = useParams();
  const { addToast } = useVirasatStore();

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberConsent[]>(initialFamilyConsents);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditTimeline);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedAuditForModal, setSelectedAuditForModal] = useState<AuditEvent | null>(null);
  const [selectedHeirForESignModal, setSelectedHeirForESignModal] = useState<FamilyMemberConsent | null>(null);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState<boolean>(false);
  const [isVerifyingMerkle, setIsVerifyingMerkle] = useState<boolean>(false);
  const [merkleValid, setMerkleValid] = useState<boolean>(true);

  // Toggle consent helper
  const handleToggleConsent = (
    memberId: string,
    consentType: 'assetDiscoveryConsent' | 'settlementAgreementConsent' | 'bankTransmissionConsent'
  ) => {
    setFamilyMembers((prev) =>
      prev.map((member) => {
        if (member.id === memberId) {
          const newVal = !member[consentType];
          const consentLabel =
            consentType === 'assetDiscoveryConsent'
              ? 'Asset Discovery (AA)'
              : consentType === 'settlementAgreementConsent'
              ? 'Settlement Consensus (FSA)'
              : 'Bank Transmission Direct Credit';

          // Add a new audit event for this state toggle
          const newEventId = `ev-${Date.now().toString().slice(-4)}`;
          const newHash = `sha256:${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
          const lastEvent = auditEvents[auditEvents.length - 1];

          const newAudit: AuditEvent = {
            id: newEventId,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
            actorType: 'human',
            actorName: member.name,
            actorRole: member.relation.split('•')[0].trim(),
            actionTitle: `Consent Updated: ${consentLabel} -> ${newVal ? 'GRANTED' : 'REVOKED'}`,
            actionCategory: 'Consent',
            description: `${member.name} ${newVal ? 'granted' : 'revoked'} statutory consent for ${consentLabel}.`,
            hash: newHash,
            previousHash: lastEvent ? lastEvent.hash : 'sha256:000000000',
            status: newVal ? 'COMPLETED' : 'PENDING',
            payloadSummary: JSON.stringify({
              member_id: member.id,
              consent_type: consentType,
              new_state: newVal,
              client_timestamp: new Date().toISOString()
            })
          };

          setAuditEvents((prevEvents) => [...prevEvents, newAudit]);

          addToast({
            type: newVal ? 'success' : 'warning',
            title: `Consent ${newVal ? 'Granted' : 'Revoked'}`,
            message: `${member.name} has ${newVal ? 'approved' : 'revoked'} ${consentLabel}. Audit log appended.`
          });

          return { ...member, [consentType]: newVal };
        }
        return member;
      })
    );
  };

  // Trigger eSign request
  const handleResendESign = (member: FamilyMemberConsent) => {
    addToast({
      type: 'info',
      title: 'Aadhaar e-Sign Request Dispatched',
      message: `SMS & Email authentication link dispatched to ${member.phone} (${member.name}).`
    });
  };

  // Copy hash to clipboard
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    addToast({
      type: 'info',
      title: 'Hash Copied to Clipboard',
      message: 'Cryptographic SHA-256 seal ready for verification.'
    });
  };

  // Live Merkle verification simulation
  const handleVerifyIntegrity = () => {
    setIsVerifyingMerkle(true);
    setTimeout(() => {
      setIsVerifyingMerkle(false);
      setMerkleValid(true);
      addToast({
        type: 'success',
        title: 'Merkle Integrity Confirmed: 100%',
        message: 'All 9 timeline blocks match their cryptographic hash chain. Zero tampering detected.'
      });
    }, 1200);
  };

  // Filtered timeline
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((ev) => {
      const matchesCategory =
        filterCategory === 'all' ||
        (filterCategory === 'agents' && ev.actorType === 'agent') ||
        (filterCategory === 'humans' && ev.actorType === 'human') ||
        (filterCategory === 'consents' && ev.actionCategory === 'Consent');

      const matchesSearch =
        ev.actionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.hash.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [auditEvents, filterCategory, searchQuery]);

  // Overall consensus percentage
  const totalSigned = familyMembers.filter((m) => m.eSignStatus === 'signed').length;
  const consensusPercentage = Math.round((totalSigned / familyMembers.length) * 100);

  return (
    <div className="min-h-screen bg-warm-sand text-navy pb-24 selection:bg-teal-500 selection:text-white">
      {/* 1. HEADER SECTION WITH AUDIT METADATA & ACTIONS */}
      <section className="bg-white border-b border-slate-200/90 pt-8 pb-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb & Case Identifier */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/case/VR-2026-0142/overview" className="hover:text-teal-700">
                Case VR-2026-0142
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/case/VR-2026-0142/family" className="hover:text-teal-700">
                Family & Heirs
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-navy font-semibold">Consent & Audit Trail</span>
            </div>

            {/* Evidence Act Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Section 65B Indian Evidence Act Certified</span>
            </div>
          </div>

          {/* Title & Actions Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                <Fingerprint className="w-4 h-4 text-teal-600" />
                <span>Statutory Consensus & Cryptographic Integrity</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-navy">
                Family Consent & Tamper-Evident Audit
              </h1>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Manage statutory heir consents, verify Aadhaar OTP eSign signatures, and inspect the immutable cryptographic hash chain 
                securing every agent action and legal approval for Estate VR-2026-0142.
              </p>
            </div>

            {/* Top Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Verify Merkle Root Button */}
              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifyingMerkle}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                  merkleValid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-navy border-slate-300 hover:bg-slate-50'
                )}
              >
                <ShieldCheck className={cn('w-4 h-4 text-emerald-600', isVerifyingMerkle && 'animate-spin')} />
                <span>{isVerifyingMerkle ? 'Verifying Block Hashes...' : 'Verify Merkle Integrity'}</span>
              </button>

              {/* Export Audit PDF Button */}
              <button
                onClick={() => setIsExportPdfOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-light text-white font-semibold text-xs shadow-soft transition-all"
              >
                <Download className="w-4 h-4 text-teal-300" />
                <span>Export Audit PDF</span>
              </button>
            </div>
          </div>

          {/* Consensus Overview Meter Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-teal-50/50 to-amber-50/40 border border-teal-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {consensusPercentage}%
              </div>
              <div>
                <div className="text-xs font-semibold text-teal-900 uppercase tracking-wider">
                  Family Statutory Consensus
                </div>
                <div className="text-sm font-serif font-bold text-navy mt-0.5">
                  {totalSigned} of {familyMembers.length} Legal Heirs Digitally e-Signed (FSA)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>3 Signed via Aadhaar OTP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-800 font-medium">1 Awaiting NRI e-Sign (Kavita)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FAMILY MEMBERS CONSENT & E-SIGN CARDS */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-navy">
              1. Legal Heir Consent Toggles & Aadhaar e-Sign Badges
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Statutory consents are individually tracked per Section 8 of the Hindu Succession Act. Toggling updates the immutable audit trail in real time.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-500">
            Active Estate: Late Ramesh Sharma (₹2.84 Cr Net)
          </span>
        </div>

        {/* Heirs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {familyMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-virasat p-6 border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between space-y-5"
            >
              {/* Top Profile Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-teal-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-navy">
                        {member.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold">
                        {member.classType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{member.relation}</p>
                  </div>
                </div>

                {/* Entitlement share chip */}
                <div className="text-right">
                  <div className="text-sm font-bold font-sans text-navy">
                    {member.sharePercent}% Share
                  </div>
                  <div className="text-xs font-mono text-teal-700 font-semibold">
                    {formatINR(member.shareAmount)}
                  </div>
                </div>
              </div>

              {/* Aadhaar eSign Status Banner */}
              <div
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between gap-3 text-xs',
                  member.eSignStatus === 'signed'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {member.eSignStatus === 'signed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {member.eSignStatus === 'signed'
                        ? 'e-Signed via Aadhaar OTP'
                        : 'Aadhaar e-Sign Pending'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {member.eSignStatus === 'signed'
                        ? `${member.eSignTimestamp} • Auth ID: ${member.eSignAuthId?.slice(0, 16)}...`
                        : `SMS invitation dispatched to ${member.phone}`}
                    </div>
                  </div>
                </div>

                {member.eSignStatus === 'signed' ? (
                  <button
                    onClick={() => setSelectedHeirForESignModal(member)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 text-[11px] font-semibold text-emerald-800 transition-colors shrink-0"
                  >
                    View Receipt
                  </button>
                ) : (
                  <button
                    onClick={() => handleResendESign(member)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Resend Link</span>
                  </button>
                )}
              </div>

              {/* Interactive Statutory Consent Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Mandatory Consent Toggles:
                </span>

                {/* Consent 1: Account Aggregator (AA) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-navy block">
                      Asset Discovery (AA Protocol)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Authorizes Account Aggregator financial scans
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleConsent(member.id, 'assetDiscoveryConsent')}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      member.assetDiscoveryConsent ? 'bg-teal-600' : 'bg-slate-300'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        member.assetDiscoveryConsent ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Consent 2: Family Settlement Agreement (FSA) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-navy block">
                      Settlement Consensus (FSA)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Approves unanimous Class-I asset devolution splits
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleConsent(member.id, 'settlementAgreementConsent')}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      member.settlementAgreementConsent ? 'bg-teal-600' : 'bg-slate-300'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        member.settlementAgreementConsent ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Consent 3: Bank Direct Transmission */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-navy block">
                      Direct Core-Banking Transmission
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Allows RTGS transfer direct to heir's registered bank account
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleConsent(member.id, 'bankTransmissionConsent')}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      member.bankTransmissionConsent ? 'bg-teal-600' : 'bg-slate-300'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        member.bankTransmissionConsent ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom masked ID */}
              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                <span>Aadhaar: {member.maskedAadhaar}</span>
                <span className="text-teal-700">Verified via DigiLocker</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. TAMPER-EVIDENT AUDIT TIMELINE */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-20 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Cryptographic Chain of Custody</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-navy">
              2. Tamper-Evident Audit Timeline of Every Agent & Human Action
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Every system invocation, statutory devolution computation, eSign timestamp, and legal sign-off is hashed using SHA-256 
              and chained sequentially for unassailable judicial admissibility.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search action, actor, or hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-navy placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
              <button
                onClick={() => setFilterCategory('all')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                  filterCategory === 'all' ? 'bg-white text-navy shadow-xs' : 'text-slate-600'
                )}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterCategory('agents')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                  filterCategory === 'agents' ? 'bg-white text-navy shadow-xs' : 'text-slate-600'
                )}
              >
                Agents
              </button>
              <button
                onClick={() => setFilterCategory('humans')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                  filterCategory === 'humans' ? 'bg-white text-navy shadow-xs' : 'text-slate-600'
                )}
              >
                Approvals
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="bg-white rounded-virasat p-6 md:p-8 border border-slate-200/90 shadow-elevated space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">
              Showing {filteredEvents.length} Verified Ledger Events
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Immutable SHA-256 Linkage Active
              </span>
              <span>Merkle Root: #VR-MERKLE-2026-0142</span>
            </div>
          </div>

          {/* Timeline List */}
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8">
            {filteredEvents.map((ev, idx) => (
              <div key={ev.id} className="relative group">
                {/* Node marker pin */}
                <span
                  className={cn(
                    'absolute -left-[33px] md:-left-[41px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white transition-transform group-hover:scale-110',
                    ev.actorType === 'agent'
                      ? 'bg-navy text-teal-300'
                      : ev.actorType === 'human'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gold text-navy'
                  )}
                >
                  {idx + 1}
                </span>

                <div className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-200/80 transition-all space-y-3">
                  {/* Top line metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {ev.timestamp}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-semibold',
                          ev.actorType === 'agent'
                            ? 'bg-navy text-teal-300'
                            : 'bg-teal-100 text-teal-900'
                        )}
                      >
                        {ev.actorType === 'agent' ? '🤖 Autonomous Agent' : '👤 Human Approver'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-navy">
                        {ev.actorName} ({ev.actorRole})
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold self-start sm:self-auto font-mono">
                      ✓ {ev.status}
                    </span>
                  </div>

                  {/* Action Title & Description */}
                  <div>
                    <h3 className="text-sm md:text-base font-serif font-bold text-navy">
                      {ev.actionTitle}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>

                  {/* Hash Chip & Details Row */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Hash Chip */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        Hash Seal:
                      </span>
                      <button
                        onClick={() => handleCopyHash(ev.hash)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-navy hover:border-slate-300 font-mono text-[11px] transition-all group/hash"
                      >
                        <span>{ev.hash.slice(0, 18)}...{ev.hash.slice(-6)}</span>
                        {copiedHash === ev.hash ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 group-hover/hash:text-navy" />
                        )}
                      </button>
                    </div>

                    {/* View Raw Payload Modal Trigger */}
                    <button
                      onClick={() => setSelectedAuditForModal(ev)}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Payload & Proof</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MODAL: AUDIT EVENT PAYLOAD INSPECTION */}
      {selectedAuditForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-virasat max-w-2xl w-full p-6 md:p-7 shadow-elevated border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-navy">
                    Cryptographic Audit Event Payload
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedAuditForModal.id} • {selectedAuditForModal.timestamp}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditForModal(null)}
                className="text-slate-400 hover:text-navy p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Action Title:
                </span>
                <p className="text-navy font-semibold text-sm mt-0.5">
                  {selectedAuditForModal.actionTitle}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Actor & Authority:
                </span>
                <p className="text-slate-700 mt-0.5">
                  {selectedAuditForModal.actorName} ({selectedAuditForModal.actorRole}) • {selectedAuditForModal.actorType.toUpperCase()}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Current SHA-256 Hash:
                </span>
                <div className="p-2 rounded bg-slate-100 font-mono text-[11px] text-slate-800 break-all select-all mt-0.5">
                  {selectedAuditForModal.hash}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Previous Chained Hash:
                </span>
                <div className="p-2 rounded bg-slate-100 font-mono text-[11px] text-slate-800 break-all select-all mt-0.5">
                  {selectedAuditForModal.previousHash}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                  Raw Grounded State Payload (JSON):
                </span>
                <pre className="p-3 rounded-xl bg-navy text-teal-300 font-mono text-[11px] overflow-x-auto mt-1 max-h-48">
                  {selectedAuditForModal.payloadSummary}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Evidence Act §65B Hash Matches Verified Merkle Node
              </span>
              <button
                onClick={() => setSelectedAuditForModal(null)}
                className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-light"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: E-SIGN CERTIFICATE RECEIPT */}
      {selectedHeirForESignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-elevated border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-navy">
                    Aadhaar e-Sign Certificate Receipt
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Signer: {selectedHeirForESignModal.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHeirForESignModal(null)}
                className="text-slate-400 hover:text-navy p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Signer Identity:</span>
                <strong className="text-navy">{selectedHeirForESignModal.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Entitlement:</span>
                <strong className="text-navy">{selectedHeirForESignModal.classType} ({selectedHeirForESignModal.sharePercent}%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Masked Aadhaar:</span>
                <span className="font-mono text-navy font-semibold">{selectedHeirForESignModal.maskedAadhaar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UIDAI Auth Code:</span>
                <span className="font-mono text-teal-700 font-semibold">{selectedHeirForESignModal.eSignAuthId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-700">{selectedHeirForESignModal.eSignTimestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Digital Cert Serial No:</span>
                <span className="font-mono text-slate-700">{selectedHeirForESignModal.certSerialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Origin IP:</span>
                <span className="font-mono text-slate-700">{selectedHeirForESignModal.eSignIp}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px]">
              This signature was generated via e-Mudhra Licensed Certifying Authority (CCA) using Aadhaar e-KYC One Time Password in full compliance with Information Technology Act, 2000 Section 3A.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHeirForESignModal(null)}
                className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-light"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXPORT AUDIT PDF SIMULATOR (SECTION 65B CERTIFICATE) */}
      {isExportPdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-virasat max-w-2xl w-full p-6 md:p-8 shadow-elevated border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-navy">
                    Section 65B Electronic Records Audit Certificate
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Case VR-2026-0142 • Formal Court-Admissible Dossier
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsExportPdfOpen(false)}
                className="text-slate-400 hover:text-navy p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Official Document Preview */}
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-4 font-serif text-slate-800 text-xs">
              <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500">
                  Government of India • Indian Evidence Act, 1872
                </div>
                <h4 className="text-base font-bold text-navy">
                  CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT
                </h4>
                <div className="text-[11px] font-sans text-slate-600">
                  Relating to Electronic Records produced by the Virasat AI Sovereign Estate System
                </div>
              </div>

              <div className="space-y-2 font-sans text-xs text-slate-700 leading-relaxed">
                <p>
                  I, <strong className="text-navy">Adv. Rajeshwar Mehta</strong> (Bar Council ID: TS/1402/2009), do hereby solemnly certify and declare:
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    That the electronic records containing the Estate Devolution of <strong className="text-navy">Late Ramesh Sharma</strong> (Case VR-2026-0142) were generated by computer systems operating under lawful control.
                  </li>
                  <li>
                    That the cryptographic hash chain from Block #1 (<code className="text-navy font-mono text-[10px]">sha256:7e8a91b...</code>) to Block #9 has remained intact without any manual truncation or unauthorized alteration.
                  </li>
                  <li>
                    That the consents of all Class-I heirs were received via Aadhaar OTP eSign authenticated under the Information Technology Act Section 3A.
                  </li>
                </ol>
              </div>

              {/* Hash & Signature Seal Block */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 grid grid-cols-2 gap-4 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Merkle Root Seal:</span>
                  <strong className="text-teal-900 block truncate">sha256:8b4f17a9e2c6081d...</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Timestamp Certified:</span>
                  <strong className="text-navy block">2026-02-18 10:20:15 IST</strong>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-sans text-slate-500 border-t border-slate-200">
                <span>Certified by Virasat Trust Engine</span>
                <span className="text-teal-700 font-semibold">Digital Seal Verified ✓</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                PDF generated with embedded cryptographic signatures and QR code.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsExportPdfOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsExportPdfOpen(false);
                    addToast({
                      type: 'success',
                      title: 'Audit PDF Generated Successfully',
                      message: 'Case_VR-2026-0142_Section65B_Audit_Trail.pdf downloaded to your device.'
                    });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-accent hover:bg-teal-400 text-navy font-semibold text-xs shadow-soft transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Signed PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentAuditPage;
