export interface Dispute {
  id: string;
  claimId: string;
  assetId: string;
  assetName: string;
  raisedBy: {
    name: string;
    relationship: string;
    advocateName?: string;
  };
  disputeType: 'Adverse Claim' | 'Unregistered Document' | 'Class-II Precedence Challenge' | 'Nominee vs Legal Heir Contest';
  status: 'Flagged by AI Guard' | 'Under Mediation' | 'Legal Notice Served' | 'Dismissed / Inactive';
  severity: 'Critical' | 'Moderate' | 'Low';
  description: string;
  legalAssessment: string;
  aiFraudScore: number; // 0 to 100, higher means suspicious
  aiAnalysisPoints: string[];
  recommendedAction: string;
  flaggedDate: string;
  resolutionDeadline: string;
}

export const baseDisputes: Dispute[] = [
  {
    id: 'DISP-01',
    claimId: 'CLM-11',
    assetId: 'asset-11',
    assetName: 'Jubilee Hills Residential Flat (₹1.40 Cr)',
    raisedBy: {
      name: 'Vikram Sharma',
      relationship: 'Brother of Deceased (Class-II Relative)',
      advocateName: 'Adv. S. K. Mahajan (Nagpur Bench)',
    },
    disputeType: 'Class-II Precedence Challenge',
    status: 'Flagged by AI Guard',
    severity: 'Critical',
    description: 'Vikram Sharma submitted an informal memorandum dated 2018 alleging a 50% interest in the ancestral apartment.',
    legalAssessment: 'Under Section 8 & Class-I Schedule of Hindu Succession Act 1956, Class-I heirs (Spouse, Son, Daughter, Mother) completely exclude Class-II heirs (Brother). The unnotarized paper holds no overriding testamentary effect.',
    aiFraudScore: 84,
    aiAnalysisPoints: [
      'Document lacks stamp duty and mandatory registration under Section 17 of Indian Registration Act.',
      'Signature strokes show 62% variance from deceased’s registered banking KYC specimens.',
      'Claimant does not possess legal standing while Class-I heirs are alive.',
    ],
    recommendedAction: 'Generate Section 8 Precedence Rebuttal letter and furnish certified copy of Family Member Certificate to Sub-Registrar.',
    flaggedDate: '2026-02-12',
    resolutionDeadline: '2026-02-28',
  },
  {
    id: 'DISP-02',
    claimId: 'CLM-06',
    assetId: 'asset-6',
    assetName: 'LIC Jeevan Anand Policy (₹30.0 Lakhs)',
    raisedBy: {
      name: 'Vikram Sharma',
      relationship: 'Brother of Deceased',
    },
    disputeType: 'Nominee vs Legal Heir Contest',
    status: 'Under Mediation',
    severity: 'Moderate',
    description: 'Sent formal objection email to LIC Hyderabad Branch contesting nominee Sunita Sharma’s right to sole payout.',
    legalAssessment: 'Insurance Amendment Act 2015 establishes spouse/children as "Beneficial Nominees" (Section 39), conferring absolute ownership of proceeds over external relatives.',
    aiFraudScore: 71,
    aiAnalysisPoints: [
      'Beneficial Nominee statutory clause applies to Sunita Sharma.',
      'No caveat registered in High Court of Telangana.',
      'LIC standard claims process can proceed upon indemnity affidavit.',
    ],
    recommendedAction: 'Submit Form 39 Beneficial Nominee clarification to LIC Senior Divisional Manager.',
    flaggedDate: '2026-02-14',
    resolutionDeadline: '2026-03-02',
  },
];
