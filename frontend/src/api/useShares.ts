import { useState, useMemo } from 'react';

export type WillScenario = 'without_will' | 'with_will';

export interface SankeyFlowLink {
  id: string;
  sourceCategory: string;
  sourceAmount: number;
  targetHeir: string;
  targetAmount: number;
  flowValue: number;
  color: string;
}

export interface HeirShareRow {
  id: string;
  name: string;
  relationship: string;
  avatar: string;
  legalBasis: string;
  sharePercentage: number;
  amount: number;
  formattedAmount: string;
  documentsStatus: 'Verified' | 'Pending In-Person KYC' | 'NOC Required' | 'Excluded';
  statusColor: string;
  personId: string;
}

export interface LegalReasoningStep {
  stepNumber: number;
  title: string;
  explanation: string;
  statutoryReference?: string;
}

export interface LegalCitation {
  statute: string;
  provision: string;
  summary: string;
}

export interface SharesData {
  scenario: WillScenario;
  scenarioTitle: string;
  scenarioSubtitle: string;
  totalEstateValue: number;
  formattedTotalEstate: string;
  confidenceScore: number;
  confidenceLabel: string;
  confidenceNotes: string;
  heirs: HeirShareRow[];
  assetSources: {
    category: string;
    amount: number;
    formattedAmount: string;
    color: string;
  }[];
  flows: SankeyFlowLink[];
  reasoningSteps: LegalReasoningStep[];
  citations: LegalCitation[];
}

export const MOCK_SHARES_DATA: Record<WillScenario, SharesData> = {
  without_will: {
    scenario: 'without_will',
    scenarioTitle: 'Intestate Succession (Without Will)',
    scenarioSubtitle: 'Governed by Section 8, 9 & 10 of the Hindu Succession Act, 1956',
    totalEstateValue: 28400000,
    formattedTotalEstate: '₹2.84 Cr',
    confidenceScore: 99.2,
    confidenceLabel: 'Statutory Highest Certainty',
    confidenceNotes: 'Cryptographically verified with DigiLocker Family Member Certificate. Zero adverse caveats registered in Telangana High Court.',
    assetSources: [
      { category: 'Real Estate (Jubilee Hills)', amount: 11200000, formattedAmount: '₹1.12 Cr', color: '#0B1F3A' }, // Net of ₹28L loan
      { category: 'Investments (Demat & MF)', amount: 7000000, formattedAmount: '₹70.0 L', color: '#14B8A6' },
      { category: 'Retirement (EPF & PPF)', amount: 4400000, formattedAmount: '₹44.0 L', color: '#3B82F6' },
      { category: 'Insurance (LIC)', amount: 3000000, formattedAmount: '₹30.0 L', color: '#C9A227' },
      { category: 'Banking & FDs', amount: 2500000, formattedAmount: '₹25.0 L', color: '#10B981' },
      { category: 'Movables (Car & Locker)', amount: 300000, formattedAmount: '₹3.0 L', color: '#8B5CF6' },
    ],
    heirs: [
      {
        id: 'hs-sunita',
        name: 'Sunita Sharma',
        relationship: 'Spouse (Widow)',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Class-I Statutory Share (Section 8 HSA) + Consensual Family Settlement Agreement + Beneficial Nominee under Section 39 Insurance Act',
        sharePercentage: 40,
        amount: 11360000,
        formattedAmount: '₹1.136 Cr',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-sunita',
      },
      {
        id: 'hs-arjun',
        name: 'Arjun Sharma',
        relationship: 'Son (Class-I Heir)',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Simultaneous statutory share under Section 8 & Class-I Schedule. Nominee on Zerodha Demat & Vahan RC Rule 56 transferee',
        sharePercentage: 20,
        amount: 5680000,
        formattedAmount: '₹56.8 Lakhs',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-arjun',
      },
      {
        id: 'hs-priya',
        name: 'Priya Sharma',
        relationship: 'Daughter (Class-I Heir)',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Equal coparcenary statutory entitlement under Section 6 (as amended 2005) & Class-I Schedule of Hindu Succession Act',
        sharePercentage: 20,
        amount: 5680000,
        formattedAmount: '₹56.8 Lakhs',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-priya',
      },
      {
        id: 'hs-kamala',
        name: 'Kamala Sharma',
        relationship: 'Mother (Class-I Heir)',
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Surviving mother of the deceased; entitled to one equal Class-I statutory share under Section 8 & 10 of HSA 1956',
        sharePercentage: 20,
        amount: 5680000,
        formattedAmount: '₹56.8 Lakhs',
        documentsStatus: 'Pending In-Person KYC',
        statusColor: 'amber',
        personId: 'p-kamala',
      },
    ],
    flows: [
      // Real Estate Net ₹1.12 Cr
      { id: 'f-1', sourceCategory: 'Real Estate (Jubilee Hills)', sourceAmount: 11200000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 4480000, color: '#0B1F3A' },
      { id: 'f-2', sourceCategory: 'Real Estate (Jubilee Hills)', sourceAmount: 11200000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 2240000, color: '#0B1F3A' },
      { id: 'f-3', sourceCategory: 'Real Estate (Jubilee Hills)', sourceAmount: 11200000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 2240000, color: '#0B1F3A' },
      { id: 'f-4', sourceCategory: 'Real Estate (Jubilee Hills)', sourceAmount: 11200000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 2240000, color: '#0B1F3A' },

      // Investments ₹70.0 L
      { id: 'f-5', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 2800000, color: '#14B8A6' },
      { id: 'f-6', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 1400000, color: '#14B8A6' },
      { id: 'f-7', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 1400000, color: '#14B8A6' },
      { id: 'f-8', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 1400000, color: '#14B8A6' },

      // Retirement ₹44.0 L
      { id: 'f-9', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 1760000, color: '#3B82F6' },
      { id: 'f-10', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 880000, color: '#3B82F6' },
      { id: 'f-11', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 880000, color: '#3B82F6' },
      { id: 'f-12', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 880000, color: '#3B82F6' },

      // Insurance ₹30.0 L
      { id: 'f-13', sourceCategory: 'Insurance (LIC)', sourceAmount: 3000000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 1200000, color: '#C9A227' },
      { id: 'f-14', sourceCategory: 'Insurance (LIC)', sourceAmount: 3000000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 600000, color: '#C9A227' },
      { id: 'f-15', sourceCategory: 'Insurance (LIC)', sourceAmount: 3000000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 600000, color: '#C9A227' },
      { id: 'f-16', sourceCategory: 'Insurance (LIC)', sourceAmount: 3000000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 600000, color: '#C9A227' },

      // Banking ₹25.0 L
      { id: 'f-17', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 1000000, color: '#10B981' },
      { id: 'f-18', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 500000, color: '#10B981' },
      { id: 'f-19', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 500000, color: '#10B981' },
      { id: 'f-20', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 500000, color: '#10B981' },

      // Movables ₹3.0 L
      { id: 'f-21', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Sunita Sharma', targetAmount: 11360000, flowValue: 120000, color: '#8B5CF6' },
      { id: 'f-22', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Arjun Sharma', targetAmount: 5680000, flowValue: 60000, color: '#8B5CF6' },
      { id: 'f-23', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Priya Sharma', targetAmount: 5680000, flowValue: 60000, color: '#8B5CF6' },
      { id: 'f-24', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Kamala Sharma', targetAmount: 5680000, flowValue: 60000, color: '#8B5CF6' },
    ],
    reasoningSteps: [
      {
        stepNumber: 1,
        title: 'Intestate Condition Established',
        explanation: 'Deceased died without leaving a registered testamentary instrument (Will). Title registry & DigiLocker search returned 0 recorded wills.',
        statutoryReference: 'Section 8, Hindu Succession Act, 1956',
      },
      {
        stepNumber: 2,
        title: 'Class-I Statutory Heirs Identified',
        explanation: 'Four living Class-I heirs identified: Spouse (Sunita), Son (Arjun), Daughter (Priya), and Mother (Kamala). All take simultaneous priority.',
        statutoryReference: 'Schedule Class-I, Hindu Succession Act, 1956',
      },
      {
        stepNumber: 3,
        title: 'Total Bar on Class-II Relatives',
        explanation: 'Under Section 9, Class-I heirs completely exclude Class-II relatives (Brother Vikram Sharma). The unnotarized 2018 memorandum possesses zero legal standing.',
        statutoryReference: 'Section 9 & Section 8, Hindu Succession Act',
      },
      {
        stepNumber: 4,
        title: 'Consensual Family Redistribution',
        explanation: 'Statutory default provides equal 25% shares. Children & mother executed signed Family Settlement Agreement allocating 40% to surviving spouse to ensure lifecycle security.',
        statutoryReference: 'Supreme Court ruling in Kale v. Deputy Director of Consolidation (1976)',
      },
    ],
    citations: [
      {
        statute: 'Hindu Succession Act, 1956',
        provision: 'Section 8 & Section 10',
        summary: 'Intestate property devolves firstly upon Class-I heirs: the widow, children, and mother each take equal shares.',
      },
      {
        statute: 'Supreme Court of India',
        provision: 'Sarbati Devi v. Usha Devi (1984) 1 SCC 424',
        summary: 'Nomination only confers authority to collect payments; funds form part of the estate and vest strictly in legal heirs.',
      },
      {
        statute: 'Indian Registration Act, 1908',
        provision: 'Section 17(1)(b) & Section 49',
        summary: 'Documents transferring interest in immovable property valued over ₹100 require mandatory registration to be admissible in court.',
      },
    ],
  },

  with_will: {
    scenario: 'with_will',
    scenarioTitle: 'Testamentary Succession (With Will Scenario)',
    scenarioSubtitle: 'Governed by Section 30 of Hindu Succession Act & Indian Succession Act, 1925',
    totalEstateValue: 28400000,
    formattedTotalEstate: '₹2.84 Cr',
    confidenceScore: 88.5,
    confidenceLabel: 'Subject to Attestation Validation',
    confidenceNotes: 'Simulated model of specific testamentary bequests. Requires validation of 2 attesting witness signatures under Section 63 of Indian Succession Act.',
    assetSources: [
      { category: 'Real Estate (Jubilee Hills)', amount: 11200000, formattedAmount: '₹1.12 Cr', color: '#0B1F3A' },
      { category: 'Investments (Demat & MF)', amount: 7000000, formattedAmount: '₹70.0 L', color: '#14B8A6' },
      { category: 'Retirement (EPF & PPF)', amount: 4400000, formattedAmount: '₹44.0 L', color: '#3B82F6' },
      { category: 'Insurance (LIC)', amount: 3000000, formattedAmount: '₹30.0 L', color: '#C9A227' },
      { category: 'Banking & FDs', amount: 2500000, formattedAmount: '₹25.0 L', color: '#10B981' },
      { category: 'Movables (Car & Locker)', amount: 300000, formattedAmount: '₹3.0 L', color: '#8B5CF6' },
    ],
    heirs: [
      {
        id: 'hs-sunita-w',
        name: 'Sunita Sharma',
        relationship: 'Spouse (Widow)',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Specific testamentary bequest: 100% life interest in Jubilee Hills Flat + LIC policy proceeds + SBI pension account',
        sharePercentage: 50,
        amount: 14200000,
        formattedAmount: '₹1.42 Cr',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-sunita',
      },
      {
        id: 'hs-arjun-w',
        name: 'Arjun Sharma',
        relationship: 'Son (Appointed Executor)',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Specific bequest: Zerodha Demat equity portfolio + Hyundai Creta vehicle + 50% PPF retirement balance',
        sharePercentage: 25,
        amount: 7100000,
        formattedAmount: '₹71.0 Lakhs',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-arjun',
      },
      {
        id: 'hs-priya-w',
        name: 'Priya Sharma',
        relationship: 'Daughter (Legatee)',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Specific bequest: SBI Mutual Fund units (CAMS) + ICICI Fixed Deposit + 50% PPF retirement balance',
        sharePercentage: 25,
        amount: 7100000,
        formattedAmount: '₹71.0 Lakhs',
        documentsStatus: 'Verified',
        statusColor: 'emerald',
        personId: 'p-priya',
      },
      {
        id: 'hs-kamala-w',
        name: 'Kamala Sharma',
        relationship: 'Mother (Maintenance Covenant)',
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
        legalBasis: 'Covenant in will provides monthly maintenance via annuity funded by spouse. Zero direct capital entitlement.',
        sharePercentage: 0,
        amount: 0,
        formattedAmount: '₹0 (Annuity Protected)',
        documentsStatus: 'NOC Required',
        statusColor: 'amber',
        personId: 'p-kamala',
      },
    ],
    flows: [
      // Real Estate Net ₹1.12 Cr -> 100% to Sunita (residential life interest & ownership)
      { id: 'fw-1', sourceCategory: 'Real Estate (Jubilee Hills)', sourceAmount: 11200000, targetHeir: 'Sunita Sharma', targetAmount: 14200000, flowValue: 11200000, color: '#0B1F3A' },

      // Investments ₹70.0 L -> Arjun (₹45L Zerodha Demat) + Priya (₹25L Mutual Funds)
      { id: 'fw-2', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Arjun Sharma', targetAmount: 7100000, flowValue: 4500000, color: '#14B8A6' },
      { id: 'fw-3', sourceCategory: 'Investments (Demat & MF)', sourceAmount: 7000000, targetHeir: 'Priya Sharma', targetAmount: 7100000, flowValue: 2500000, color: '#14B8A6' },

      // Retirement ₹44.0 L -> Arjun (₹18L PPF) + Priya (₹26L EPF)
      { id: 'fw-4', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Arjun Sharma', targetAmount: 7100000, flowValue: 1800000, color: '#3B82F6' },
      { id: 'fw-5', sourceCategory: 'Retirement (EPF & PPF)', sourceAmount: 4400000, targetHeir: 'Priya Sharma', targetAmount: 7100000, flowValue: 2600000, color: '#3B82F6' },

      // Insurance ₹30.0 L -> 100% to Sunita (Beneficial Nominee §39 Insurance Act)
      { id: 'fw-6', sourceCategory: 'Insurance (LIC)', sourceAmount: 3000000, targetHeir: 'Sunita Sharma', targetAmount: 14200000, flowValue: 3000000, color: '#C9A227' },

      // Banking ₹25.0 L -> Arjun (₹7L SBI Savings) + Priya (₹18L ICICI FD)
      { id: 'fw-7', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Arjun Sharma', targetAmount: 7100000, flowValue: 700000, color: '#10B981' },
      { id: 'fw-8', sourceCategory: 'Banking & FDs', sourceAmount: 2500000, targetHeir: 'Priya Sharma', targetAmount: 7100000, flowValue: 1800000, color: '#10B981' },

      // Movables ₹3.0 L -> Arjun (₹1.0L Creta car) + Priya (₹2.0L Locker valuables)
      { id: 'fw-9', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Arjun Sharma', targetAmount: 7100000, flowValue: 100000, color: '#8B5CF6' },
      { id: 'fw-10', sourceCategory: 'Movables (Car & Locker)', sourceAmount: 300000, targetHeir: 'Priya Sharma', targetAmount: 7100000, flowValue: 200000, color: '#8B5CF6' },
    ],
    reasoningSteps: [
      {
        stepNumber: 1,
        title: 'Testamentary Power Under Section 30',
        explanation: 'Any Hindu may dispose of by will or other testamentary disposition any property which is capable of being so disposed of by him.',
        statutoryReference: 'Section 30, Hindu Succession Act, 1956',
      },
      {
        stepNumber: 2,
        title: 'Overriding of Intestate Equality',
        explanation: 'A valid testamentary disposition overrides the default equal distribution prescribed under Section 8. Legatees take according to testator’s expressed intent.',
        statutoryReference: 'Indian Succession Act, 1925',
      },
      {
        stepNumber: 3,
        title: 'Probate Exemption in Telangana',
        explanation: 'Under Section 213(2) of Indian Succession Act, probate is not mandatory for wills executed by Hindus in Telangana for properties situated outside Mumbai, Chennai, and Kolkata.',
        statutoryReference: 'Supreme Court in Clarence Pais v. Union of India (2001)',
      },
      {
        stepNumber: 4,
        title: 'Witness Attestation Verification',
        explanation: 'Requires verification of 2 independent attesting witnesses who observed testator affix signature with sound disposing mind.',
        statutoryReference: 'Section 63, Indian Succession Act, 1925',
      },
    ],
    citations: [
      {
        statute: 'Hindu Succession Act, 1956',
        provision: 'Section 30 (Testamentary disposition)',
        summary: 'Affirms absolute legal right to bequeath self-acquired property to chosen legatees.',
      },
      {
        statute: 'Indian Succession Act, 1925',
        provision: 'Section 63 & Section 213',
        summary: 'Execution requirements of unprivileged wills and jurisdictional probate rules.',
      },
    ],
  },
};

export function useShares(scenario: WillScenario = 'without_will') {
  const data = useMemo(() => {
    return MOCK_SHARES_DATA[scenario];
  }, [scenario]);

  return {
    data,
    totalHeirsCount: data.heirs.length,
    estateTotal: data.totalEstateValue,
  };
}
