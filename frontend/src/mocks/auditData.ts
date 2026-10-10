export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'AI Agent' | 'Family Member' | 'Institution Officer' | 'Legal Concierge';
  action: string;
  category: 'Document' | 'Claim' | 'Security & Dispute' | 'Verification' | 'Disbursement';
  details: string;
  hash: string;
}

export const baseAuditTrail: AuditEntry[] = [
  {
    id: 'aud-01',
    timestamp: '2026-02-18 10:45 AM',
    actor: 'DocuVerifyAgent',
    actorType: 'AI Agent',
    action: 'DigiLocker Cryptographic Hash Validation',
    category: 'Verification',
    details: 'Verified SHA-256 seal on GHMC Death Certificate (GHMC/2026/004812). Authenticity 100%.',
    hash: '0x9f1a...482c',
  },
  {
    id: 'aud-02',
    timestamp: '2026-02-17 03:20 PM',
    actor: 'Arjun Sharma',
    actorType: 'Family Member',
    action: 'Transmission Packet e-Signature',
    category: 'Claim',
    details: 'Aadhaar OTP e-Sign affixed to Zerodha Annexure 7 and client master report.',
    hash: '0x3c8e...90fa',
  },
  {
    id: 'aud-03',
    timestamp: '2026-02-16 11:15 AM',
    actor: 'DisputeGuardAI',
    actorType: 'AI Agent',
    action: 'Adverse Claim Flagged for Review',
    category: 'Security & Dispute',
    details: 'Identified informal unregistered claim submitted by Vikram Sharma. Flagged statutory Class-I precedence note.',
    hash: '0x7e21...11bd',
  },
  {
    id: 'aud-04',
    timestamp: '2026-02-09 04:30 PM',
    actor: 'RTA Khairatabad Officer',
    actorType: 'Institution Officer',
    action: 'Vehicle RC Endorsement Approved',
    category: 'Disbursement',
    details: 'Form 31 approved on transport Vahan portal. Registration transferred to Arjun Sharma.',
    hash: '0x11fa...6782',
  },
  {
    id: 'aud-05',
    timestamp: '2026-02-03 01:10 PM',
    actor: 'SBI Pension & PPF Desk',
    actorType: 'Institution Officer',
    action: 'PPF Proceeds Transferred',
    category: 'Disbursement',
    details: '₹16,00,000 NEFT credit executed to Sunita Sharma SBI account.',
    hash: '0x55dc...38a9',
  },
  {
    id: 'aud-06',
    timestamp: '2026-01-20 09:00 AM',
    actor: 'Aditi Varma',
    actorType: 'Legal Concierge',
    action: 'Estate Case Docket Initialized',
    category: 'Document',
    details: 'Case VR-2026-0142 created for Late Ramesh Sharma. 12 asset folios cataloged.',
    hash: '0x00ad...1822',
  },
];
