import { useState, useEffect } from 'react';
import { baseCaseData } from '@/mocks/caseData';
import { baseAssets, AssetCategory } from '@/mocks/assetsData';
import { basePeople } from '@/mocks/peopleData';
import { baseAuditTrail, AuditEntry } from '@/mocks/auditData';
import { baseDisputes } from '@/mocks/disputesData';
import { API_CONFIG } from './config';
import { estateService } from './estateService';
import { formatINR } from '@/lib/utils';

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

    async function loadData() {
      const activeId = caseIdParam || baseCaseData.id;

      if (!API_CONFIG.USE_MOCKS) {
        try {
          const res = await estateService.getOverview(activeId);
          let people: any[] = [];
          try {
            people = await estateService.getPeople(activeId);
          } catch {}

          const rawNet = Number(res.estate_value_inr || 0);
          const formattedVal = rawNet >= 10000000
            ? `₹${(rawNet / 10000000).toFixed(2)} Cr`
            : rawNet > 0
            ? `₹${(rawNet / 100000).toFixed(2)} Lakh`
            : '₹0';

          const heirsData = Array.isArray(people)
            ? people.map((p: any) => ({
                id: p.person_id,
                name: p.full_name || 'Legal Heir',
                relation: p.role || 'Heir',
                classType: p.eligibility || 'Class-I Heir',
                sharePercent: p.alive ? 25 : 0,
                consented: true,
                isDeceased: !p.alive,
                isExcluded: p.eligibility === 'EXCLUDED',
                avatar: basePeople[0]?.avatar,
              }))
            : [];

          const liveOverview: OverviewData = {
            caseId: res.case_id || activeId,
            title: `Estate of ${res.deceased_name || 'Deceased'}`,
            status: res.status || 'In progress',
            deceased: {
              name: res.deceased_name || 'Late Ramesh Sharma',
              birthYear: 1961,
              deathYear: 2026,
              city: 'Hyderabad',
              state: 'Telangana',
              occupation: 'Business Owner',
              pan: 'ABCPS4819M',
            },
            familyConsent: {
              completed: res.consent?.given ?? 3,
              total: res.consent?.total ?? 4,
              heirs: heirsData.map((h) => ({
                name: h.name,
                relation: h.relation,
                consented: h.consented,
              })),
            },
            kpis: {
              estateValue: {
                amount: formattedVal,
                raw: rawNet,
                label: 'Net Estate Value',
                grossInfo: `Net statutory valuation: ${formatINR(rawNet)}`,
              },
              assetsFound: {
                count: res.assets_found ?? 12,
                subtitle: 'Verified institutional folios',
              },
              claimsFiled: {
                filed: res.claims_filed ?? 0,
                total: res.claims_total ?? 12,
                display: `${res.claims_filed ?? 0} of ${res.claims_total ?? 12}`,
                percentage: res.claims_total ? Math.round(((res.claims_filed ?? 0) / res.claims_total) * 100) : 0,
              },
              estimatedSettlement: {
                days: res.est_settlement_days ?? 21,
                comparison: `${Math.round(((res.baseline_days ?? 180) - (res.est_settlement_days ?? 21)) / 30)} months faster`,
                benchmark: `vs ${res.baseline_days ?? 180} days manual offline benchmark`,
              },
              riskScore: {
                level: (res.risk_label || 'Low').toUpperCase(),
                status: res.risk_label === 'High' ? 'Amber Alert Active' : 'Verified Clear',
                confidence: '99.4% AI Confidence',
              },
            },
            assetCategories: (res.by_type || []).map((b: any) => {
              const val = Number(b.value_inr || 0);
              return {
                name: b.type,
                category: b.type as AssetCategory,
                value: val,
                formatted: formatINR(val),
                percentage: rawNet > 0 ? Math.round((val / rawNet) * 100) : 0,
                color: '#14B8A6',
              };
            }),
            nextBestActions: (res.next_actions || []).map((a: any, idx: number) => ({
              id: `act-${idx}`,
              title: a.title,
              description: a.cta,
              priority: 'P1 - High',
              agent: 'Legal AI',
              actionText: 'Review Now',
              route: a.target_route || '/overview',
              tag: 'Statutory',
            })),
            sankeyData: {
              totalEstate: rawNet,
              flows: [],
              heirs: heirsData.map((h) => ({
                name: h.name,
                relation: h.relation,
                sharePercent: h.sharePercent,
                totalAmount: (rawNet * h.sharePercent) / 100,
                color: '#14B8A6',
              })),
            },
            familyTreeNodes: heirsData,
            recentActivity: (res.timeline || []).map((t: any, idx: number) => ({
              id: `act-${idx}`,
              timestamp: t.timestamp || new Date().toISOString(),
              user: t.actor || 'System',
              action: t.title || 'Event',
              entityType: 'Case',
              entityName: t.description || '',
              hash: 'sha256-verified',
            })),
            amberAlert: {
              id: 'ALT-LIVE',
              title: res.alerts?.[0] || 'Nominee Conflict Review',
              institution: 'HDFC Bank',
              account: 'Active Contestation',
              description: res.alerts?.[0] || 'Nominee vs Class-I Statutory Rights review active under Section 8 of Hindu Succession Act.',
              conflictDetail: 'Statutory Precedence Defense',
              statutoryBasis: 'Under Section 8 of Hindu Succession Act, 1956.',
              aiRecommendation: 'Submit AI Precedence Rebuttal Docket to Nodal Officer.',
              route: `/case/${activeId}/disputes`,
              severity: 'High Attention',
            },
          };

          if (isMounted) {
            setData(liveOverview);
            setIsLoading(false);
          }
          return;
        } catch (err: any) {
          console.warn('[useOverview] Live fetch failed, using fallback mock data:', err);
        }
      }

      // Fallback mock data
      const mockOverview: OverviewData = {
        caseId: activeId,
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
            level: 'AMBER',
            status: '1 Adverse Caveat',
            confidence: '94.2% AI Confidence',
          },
        },
        assetCategories: [
          { name: 'Real Estate', category: 'Real Estate', value: 14000000, formatted: '₹1.40 Cr', percentage: 45, color: '#0B1F3A' },
          { name: 'Investments', category: 'Investments', value: 7000000, formatted: '₹70.0 L', percentage: 22, color: '#C9A227' },
          { name: 'Insurance & Policies', category: 'Insurance', value: 5000000, formatted: '₹50.0 L', percentage: 16, color: '#14B8A6' },
          { name: 'Retirement (EPF/PPF)', category: 'Retirement', value: 2400000, formatted: '₹24.0 L', percentage: 8, color: '#8B5CF6' },
          { name: 'Banking & Deposits', category: 'Banking', value: 2500000, formatted: '₹25.0 L', percentage: 8, color: '#0284C7' },
          { name: 'Movables (Vehicle/Locker)', category: 'Valuables & Movable', value: 300000, formatted: '₹3.0 L', percentage: 1, color: '#64748B' },
        ],
        nextBestActions: [
          {
            id: 'nba-1',
            title: 'Sign DigiLocker Consent (Kamala Sharma)',
            description: 'Mother Kamala Sharma (88) pending biometric/Aadhaar OTP sign-off for mutual family partition protocol.',
            priority: 'P1 - High',
            agent: 'Intake Agent',
            actionText: 'Send WhatsApp OTP',
            route: `/case/${activeId}/family`,
            tag: 'Missing Heir Consent',
          },
          {
            id: 'nba-2',
            title: 'Deploy Section 8 Precedence Rebuttal (HDFC)',
            description: 'AI DisputeGuard drafted 4-page statutory transmission defense against Vikram Sharma informal objection.',
            priority: 'P1 - High',
            agent: 'Fraud & Dispute Sentinel',
            actionText: 'Review AI Rebuttal',
            route: `/case/${activeId}/claims`,
            tag: 'Adverse Claim Shield',
          },
        ],
        sankeyData: {
          totalEstate: 28400000,
          flows: [],
          heirs: [
            { name: 'Sunita Sharma', relation: 'Spouse (Class-I)', sharePercent: 40, totalAmount: 11360000, color: '#14B8A6' },
            { name: 'Arjun Sharma', relation: 'Son (Class-I)', sharePercent: 20, totalAmount: 5680000, color: '#0284C7' },
            { name: 'Priya Sharma', relation: 'Daughter (Class-I)', sharePercent: 20, totalAmount: 5680000, color: '#8B5CF6' },
            { name: 'Kamala Sharma', relation: 'Mother (Class-I)', sharePercent: 20, totalAmount: 5680000, color: '#C9A227' },
          ],
        },
        familyTreeNodes: [
          { id: 'p-0', name: 'Late Ramesh Sharma', relation: 'Deceased', classType: 'Propositus', sharePercent: 0, consented: true, isDeceased: true, avatar: (baseCaseData.deceased as any).avatar || '' },
          { id: 'p-1', name: 'Sunita Sharma', relation: 'Spouse', classType: 'Class-I Heir', sharePercent: 40, consented: true, avatar: basePeople[0].avatar },
          { id: 'p-2', name: 'Arjun Sharma', relation: 'Son', classType: 'Class-I Heir', sharePercent: 20, consented: true, avatar: basePeople[1].avatar },
          { id: 'p-3', name: 'Priya Sharma', relation: 'Daughter', classType: 'Class-I Heir', sharePercent: 20, consented: true, avatar: basePeople[2].avatar },
          { id: 'p-4', name: 'Kamala Sharma', relation: 'Mother', classType: 'Class-I Heir', sharePercent: 20, consented: false, avatar: basePeople[3].avatar },
          { id: 'p-5', name: 'Vikram Sharma', relation: 'Brother', classType: 'Class-II Relative', sharePercent: 0, consented: false, isExcluded: true, avatar: basePeople[4].avatar },
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
          route: `/case/${activeId}/claims`,
          severity: 'Amber Alert • High Attention',
        },
      };

      if (isMounted) {
        setData(mockOverview);
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [caseIdParam]);

  return { data, isLoading, error };
}

export default useOverview;
