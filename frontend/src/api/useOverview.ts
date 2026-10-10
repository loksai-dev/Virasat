import { useState, useEffect } from 'react';
import { baseCaseData, CaseDetails } from '@/mocks/caseData';
import { baseAssets, EstateAsset, AssetCategory } from '@/mocks/assetsData';
import { basePeople, Person } from '@/mocks/peopleData';
import { baseAuditTrail, AuditEntry } from '@/mocks/auditData';
import { baseDisputes, Dispute } from '@/mocks/disputesData';

export interface NextBestAction {
  id: string;
  title: string;
  description: string;
  priority: 'P1 - High' | 'P2 - High' | 'P3 - Medium';
  agent: string;
  actionText: string;
  route: string;
  tag: string;
}

export interface SankeyNode {
  name: string;
  value?: number;
  category?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  label: string;
}

export interface OverviewData {
  caseId: string;
  title: string;
  status: string;
  deceased: {
    name: string;
    birthYear: number;
    deathYear: number;
    city: string;
    state: string;
    occupation: string;
    pan: string;
  };
  familyConsent: {
    completed: number;
    total: number;
    heirs: { name: string; relation: string; consented: boolean }[];
  };
  kpis: {
    estateValue: {
      amount: string;
      raw: number;
      label: string;
      grossInfo: string;
    };
    assetsFound: {
      count: number;
      subtitle: string;
    };
    claimsFiled: {
      filed: number;
      total: number;
      display: string;
      percentage: number;
    };
    estimatedSettlement: {
      days: number;
      comparison: string;
      benchmark: string;
    };
    riskScore: {
      level: string;
      status: string;
      confidence: string;
    };
  };
  assetCategories: {
    name: string;
    category: AssetCategory;
    value: number;
    formatted: string;
    percentage: number;
    color: string;
  }[];
  nextBestActions: NextBestAction[];
  sankeyData: {
    totalEstate: number;
    flows: {
      category: string;
      value: number;
      heirAllocations: { heir: string; sharePercent: number; amount: number }[];
    }[];
    heirs: {
      name: string;
      relation: string;
      sharePercent: number;
      totalAmount: number;
      color: string;
    }[];
  };
  familyTreeNodes: {
    id: string;
    name: string;
    relation: string;
    classType: string;
    sharePercent: number;
    consented: boolean;
    isDeceased?: boolean;
    isExcluded?: boolean;
    avatar: string;
  }[];
  recentActivity: AuditEntry[];
  amberAlert: {
    id: string;
    title: string;
    institution: string;
    account: string;
    description: string;
    conflictDetail: string;
    statutoryBasis: string;
    aiRecommendation: string;
    route: string;
    severity: string;
  };
}

export function useOverview(caseIdParam?: string) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Simulate mock data fetch with slight realistic delay (300ms) for skeleton rendering
    const timer = setTimeout(() => {
      if (!isMounted) return;

      try {
        const mockOverview: OverviewData = {
          caseId: caseIdParam || baseCaseData.id,
          title: baseCaseData.title,
          status: 'In progress',
          deceased: {
            name: baseCaseData.deceased.name,
            birthYear: baseCaseData.deceased.birthYear,
            deathYear: baseCaseData.deceased.deathYear,
            city: baseCaseData.deceased.city,
            state: baseCaseData.deceased.state,
            occupation: baseCaseData.deceased.occupation,
            pan: baseCaseData.deceased.panNumber,
          },
          familyConsent: {
            completed: 3,
            total: 4,
            heirs: [
              { name: 'Sunita Sharma', relation: 'Spouse', consented: true },
              { name: 'Arjun Sharma', relation: 'Son', consented: true },
              { name: 'Priya Sharma', relation: 'Daughter', consented: true },
              { name: 'Kamala Sharma', relation: 'Mother (88)', consented: false },
            ],
          },
          kpis: {
            estateValue: {
              amount: '₹2.84 Cr',
              raw: 28400000,
              label: 'Estate Value',
              grossInfo: 'Gross ₹3.12 Cr net of ₹28L loan',
            },
            assetsFound: {
              count: 12,
              subtitle: 'Across 7 financial institutions',
            },
            claimsFiled: {
              filed: 5,
              total: 11,
              display: '5 of 11',
              percentage: 45,
            },
            estimatedSettlement: {
              days: 38,
              comparison: 'vs ~6 months typical',
              benchmark: '78% faster than traditional probate',
            },
            riskScore: {
              level: 'Low-Medium',
              status: 'AI DisputeGuard Active',
              confidence: '99.4% Precedence Resolution',
            },
          },
          assetCategories: [
            {
              name: 'Real Estate',
              category: 'Real Estate',
              value: 14000000,
              formatted: '₹1.40 Cr',
              percentage: 49.3,
              color: '#0B1F3A', // Primary Navy
            },
            {
              name: 'Investments',
              category: 'Investments',
              value: 7000000,
              formatted: '₹70.0 Lakhs',
              percentage: 24.6,
              color: '#14B8A6', // Accent Teal
            },
            {
              name: 'Retirement (EPF & PPF)',
              category: 'Retirement',
              value: 4400000,
              formatted: '₹44.0 Lakhs',
              percentage: 15.5,
              color: '#3B82F6', // Blue
            },
            {
              name: 'Insurance (LIC)',
              category: 'Insurance',
              value: 3000000,
              formatted: '₹30.0 Lakhs',
              percentage: 10.6,
              color: '#C9A227', // Legacy Gold
            },
            {
              name: 'Banking & FDs',
              category: 'Banking',
              value: 2500000,
              formatted: '₹25.0 Lakhs',
              percentage: 8.8,
              color: '#10B981', // Emerald
            },
            {
              name: 'Valuables & Movables',
              category: 'Valuables & Movable',
              value: 900000,
              formatted: '₹9.0 Lakhs',
              percentage: 3.2,
              color: '#8B5CF6', // Purple
            },
          ],
          nextBestActions: [
            {
              id: 'nba-1',
              title: 'Submit HDFC Bank Transmission Docket',
              description: 'Annexure-A form and verified death certificate compiled. Ready for one-click direct submission.',
              priority: 'P1 - High',
              agent: 'Claims Packager Agent',
              actionText: 'Submit Claim',
              route: `/case/${caseIdParam || baseCaseData.id}/claims`,
              tag: 'Banking',
            },
            {
              id: 'nba-2',
              title: 'Obtain Consent Thumbprint for Kamala Sharma',
              description: 'Surviving mother (88) requires in-person assisted KYC or assisted biometrics for mutual fund transfer.',
              priority: 'P2 - High',
              agent: 'Legal Eligibility Agent',
              actionText: 'Request Consent',
              route: `/case/${caseIdParam || baseCaseData.id}/family`,
              tag: 'Consent',
            },
            {
              id: 'nba-3',
              title: 'Review Nominee Conflict Rebuttal for HDFC Account',
              description: 'AI DisputeGuard prepared Section 8 Statutory Precedence Rebuttal Docket against Vikram Sharma contest.',
              priority: 'P3 - Medium',
              agent: 'Fraud & Dispute Sentinel',
              actionText: 'Review Dispute',
              route: `/case/${caseIdParam || baseCaseData.id}/claims`,
              tag: 'DisputeGuard',
            },
          ],
          sankeyData: {
            totalEstate: 28400000,
            flows: [
              {
                category: 'Real Estate (₹1.40 Cr)',
                value: 14000000,
                heirAllocations: [
                  { heir: 'Sunita Sharma', sharePercent: 40, amount: 5600000 },
                  { heir: 'Arjun Sharma', sharePercent: 20, amount: 2800000 },
                  { heir: 'Priya Sharma', sharePercent: 20, amount: 2800000 },
                  { heir: 'Kamala Sharma', sharePercent: 20, amount: 2800000 },
                ],
              },
              {
                category: 'Investments & Demat (₹70.0 L)',
                value: 7000000,
                heirAllocations: [
                  { heir: 'Sunita Sharma', sharePercent: 40, amount: 2800000 },
                  { heir: 'Arjun Sharma', sharePercent: 20, amount: 1400000 },
                  { heir: 'Priya Sharma', sharePercent: 20, amount: 1400000 },
                  { heir: 'Kamala Sharma', sharePercent: 20, amount: 1400000 },
                ],
              },
              {
                category: 'Retirement & Insurance (₹74.0 L)',
                value: 7400000,
                heirAllocations: [
                  { heir: 'Sunita Sharma', sharePercent: 40, amount: 2960000 },
                  { heir: 'Arjun Sharma', sharePercent: 20, amount: 1480000 },
                  { heir: 'Priya Sharma', sharePercent: 20, amount: 1480000 },
                  { heir: 'Kamala Sharma', sharePercent: 20, amount: 1480000 },
                ],
              },
            ],
            heirs: [
              {
                name: 'Sunita Sharma',
                relation: 'Spouse (Class-I)',
                sharePercent: 40,
                totalAmount: 11360000,
                color: '#14B8A6',
              },
              {
                name: 'Arjun Sharma',
                relation: 'Son (Class-I)',
                sharePercent: 20,
                totalAmount: 5680000,
                color: '#0284C7',
              },
              {
                name: 'Priya Sharma',
                relation: 'Daughter (Class-I)',
                sharePercent: 20,
                totalAmount: 5680000,
                color: '#8B5CF6',
              },
              {
                name: 'Kamala Sharma',
                relation: 'Mother (Class-I)',
                sharePercent: 20,
                totalAmount: 5680000,
                color: '#C9A227',
              },
            ],
          },
          familyTreeNodes: [
            {
              id: 'p-0',
              name: 'Late Ramesh Sharma',
              relation: 'Deceased',
              classType: 'Propositus',
              sharePercent: 100,
              consented: true,
              isDeceased: true,
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
            },
            {
              id: 'p-1',
              name: 'Sunita Sharma',
              relation: 'Spouse',
              classType: 'Class-I Heir',
              sharePercent: 40,
              consented: true,
              avatar: basePeople[0].avatar,
            },
            {
              id: 'p-2',
              name: 'Arjun Sharma',
              relation: 'Son',
              classType: 'Class-I Heir',
              sharePercent: 20,
              consented: true,
              avatar: basePeople[1].avatar,
            },
            {
              id: 'p-3',
              name: 'Priya Sharma',
              relation: 'Daughter',
              classType: 'Class-I Heir',
              sharePercent: 20,
              consented: true,
              avatar: basePeople[2].avatar,
            },
            {
              id: 'p-4',
              name: 'Kamala Sharma',
              relation: 'Mother',
              classType: 'Class-I Heir',
              sharePercent: 20,
              consented: false,
              avatar: basePeople[3].avatar,
            },
            {
              id: 'p-5',
              name: 'Vikram Sharma',
              relation: 'Brother',
              classType: 'Class-II Relative',
              sharePercent: 0,
              consented: false,
              isExcluded: true,
              avatar: basePeople[4].avatar,
            },
          ],
          recentActivity: baseAuditTrail.slice(0, 5),
          amberAlert: {
            id: 'ALT-HDFC-01',
            title: 'Nominee Conflict at HDFC Bank (A/C ...4820)',
            institution: 'HDFC Bank',
            account: 'SB-4810-7721',
            description: 'Vikram Sharma (brother) filed an informal objection email regarding the HDFC account proceeds.',
            conflictDetail: 'Nominee vs Class-I Statutory Rights Contest',
            statutoryBasis: 'Under Section 8 of Hindu Succession Act & SC ruling in Sarbati Devi, nominees hold funds as trustees for Class-I legal heirs.',
            aiRecommendation: 'Submit AI Precedence Rebuttal Docket and Annexure-7 statutory affidavit to HDFC Nodal Officer.',
            route: `/case/${caseIdParam || baseCaseData.id}/claims`,
            severity: 'Amber Alert • High Attention',
          },
        };

        setData(mockOverview);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error loading overview data'));
        setIsLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [caseIdParam]);

  return { data, isLoading, error };
}
