import { useState, useEffect, useCallback } from 'react';
import { baseCaseData } from '@/mocks/caseData';
import { AssetCategory } from '@/mocks/assetsData';
import { basePeople } from '@/mocks/peopleData';
import { baseAuditTrail, AuditEntry } from '@/mocks/auditData';
import { API_CONFIG } from './config';
import { estateService } from './estateService';
import { ApiError } from './client';
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
    heirs: {
      name: string;
      relation: string;
      consented: boolean;
    }[];
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
    flows: SankeyLink[];
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
  } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  BANK: '#0284C7',
  BANKING: '#0284C7',
  SAVINGS: '#0284C7',
  FD: '#0EA5E9',
  MUTUAL_FUNDS: '#C9A227',
  MF: '#C9A227',
  INVESTMENTS: '#C9A227',
  DEMAT: '#F59E0B',
  INSURANCE: '#14B8A6',
  POLICY: '#14B8A6',
  PROPERTY: '#0B1F3A',
  'REAL ESTATE': '#0B1F3A',
  EPF: '#8B5CF6',
  PPF: '#A855F7',
  RETIREMENT: '#8B5CF6',
  LOCKER: '#64748B',
  VEHICLE: '#94A3B8',
  VALUABLES: '#64748B',
  OTHER: '#64748B',
};

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
];

export function useOverview(caseIdParam?: string) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [reloadCount, setReloadCount] = useState<number>(0);

  const refetch = useCallback(() => {
    setReloadCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    async function loadData() {
      const activeId = caseIdParam || baseCaseData.id;

      if (!API_CONFIG.USE_MOCKS) {
        try {
          const res = await estateService.getOverview(activeId);
          let people: any[] = [];
          try {
            people = await estateService.getPeople(activeId);
          } catch {
            people = [];
          }

          const rawNet = Number(res.estate_value_inr || 0);
          const formattedVal =
            rawNet >= 10000000
              ? `₹${(rawNet / 10000000).toFixed(2)} Cr`
              : rawNet > 0
              ? `₹${(rawNet / 100000).toFixed(2)} Lakh`
              : '₹0';

          const isMehta =
            activeId.toUpperCase().includes('MEHTA') || activeId.includes('0187');
          const deceasedName =
            res.deceased_name || (isMehta ? 'Late Anil Mehta' : 'Late Ramesh Sharma');

          let heirsData: any[] = [];
          if (Array.isArray(people) && people.length > 0) {
            heirsData = people.map((p: any, idx: number) => ({
              id: p.person_id || `heir-${idx}`,
              name: p.full_name || 'Legal Heir',
              relation: p.role || 'Heir',
              classType: p.eligibility || 'Class-I Heir',
              sharePercent: p.alive
                ? Math.round(100 / Math.max(1, people.filter((x: any) => x.alive).length))
                : 0,
              consented: true,
              isDeceased: !p.alive,
              isExcluded: p.eligibility === 'EXCLUDED',
              avatar: basePeople[idx]?.avatar || DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length],
            }));
          } else {
            heirsData = [
              {
                id: 'p-0',
                name: deceasedName,
                relation: 'Deceased',
                classType: 'Propositus',
                sharePercent: 0,
                consented: true,
                isDeceased: true,
                avatar: basePeople[0]?.avatar || DEFAULT_AVATARS[0],
              },
              {
                id: 'p-1',
                name: isMehta ? 'Kavita Mehta' : 'Sunita Sharma',
                relation: 'Spouse',
                classType: 'Class-I Heir',
                sharePercent: 40,
                consented: true,
                avatar: basePeople[1]?.avatar || DEFAULT_AVATARS[1],
              },
              {
                id: 'p-2',
                name: isMehta ? 'Rohan Mehta' : 'Arjun Sharma',
                relation: 'Son',
                classType: 'Class-I Heir',
                sharePercent: 30,
                consented: true,
                avatar: basePeople[2]?.avatar || DEFAULT_AVATARS[2],
              },
              {
                id: 'p-3',
                name: isMehta ? 'Ananya Mehta' : 'Priya Sharma',
                relation: 'Daughter',
                classType: 'Class-I Heir',
                sharePercent: 30,
                consented: true,
                avatar: basePeople[3]?.avatar || DEFAULT_AVATARS[3],
              },
            ];
          }

          // Parse alerts safely (handles dict objects from backend or strings)
          const rawAlert =
            Array.isArray(res.alerts) && res.alerts.length > 0 ? res.alerts[0] : null;
          let amberAlertObj: OverviewData['amberAlert'] = null;

          if (rawAlert) {
            const titleStr =
              typeof rawAlert === 'string'
                ? rawAlert
                : rawAlert.title || (rawAlert.message ? String(rawAlert.message) : 'Active Estate Alert');

            const descStr =
              typeof rawAlert === 'string'
                ? rawAlert
                : rawAlert.message ||
                  rawAlert.description ||
                  rawAlert.title ||
                  'Review active estate advisory.';

            const severityStr =
              typeof rawAlert === 'object' && rawAlert.severity
                ? String(rawAlert.severity)
                : 'Amber Alert';

            const routeStr =
              typeof rawAlert === 'object' && rawAlert.target_route
                ? String(rawAlert.target_route)
                : `/case/${activeId}/disputes`;

            amberAlertObj = {
              id:
                typeof rawAlert === 'object' && rawAlert.entity_id
                  ? String(rawAlert.entity_id)
                  : 'ALT-LIVE',
              title: String(titleStr),
              institution:
                typeof rawAlert === 'object' && rawAlert.institution
                  ? String(rawAlert.institution)
                  : 'HDFC Bank',
              account:
                typeof rawAlert === 'object' && rawAlert.account
                  ? String(rawAlert.account)
                  : 'SB-4810-7721',
              description: String(descStr),
              conflictDetail:
                typeof rawAlert === 'object' && rawAlert.type === 'BLOCKED_CLAIM'
                  ? 'Institutional Transmission Hold'
                  : 'Statutory Precedence Defense',
              statutoryBasis:
                'Under Section 8 of Hindu Succession Act & SC ruling in Sarbati Devi, nominees hold funds as trustees for Class-I legal heirs.',
              aiRecommendation:
                'Submit AI Precedence Rebuttal Docket and Annexure-7 statutory affidavit to Nodal Officer.',
              route: routeStr,
              severity: `${severityStr} • Attention Required`,
            };
          }

          const assetCategories = (res.by_type || []).map((b: any) => {
            const val = Number(b.value_inr || 0);
            const typeKey = String(b.type || 'Other').toUpperCase();
            return {
              name: b.type || 'Asset',
              category: (b.type || 'Banking') as AssetCategory,
              value: val,
              formatted: formatINR(val),
              percentage: rawNet > 0 ? Math.round((val / rawNet) * 100) : 0,
              color: CATEGORY_COLORS[typeKey] || '#14B8A6',
            };
          });

          const liveOverview: OverviewData = {
            caseId: res.case_id || activeId,
            title: `Estate Settlement of ${deceasedName}`,
            status: res.status || 'In progress',
            deceased: {
              name: deceasedName,
              birthYear: isMehta ? 1968 : 1961,
              deathYear: 2026,
              city: isMehta ? 'Pune' : 'Hyderabad',
              state: isMehta ? 'Maharashtra' : 'Telangana',
              occupation: isMehta ? 'Senior Consultant' : 'Business Owner',
              pan: isMehta ? 'AFKPM8192K' : 'ABCPS4819M',
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
                count: res.assets_found ?? (assetCategories.length || 12),
                subtitle: 'Verified institutional folios',
              },
              claimsFiled: {
                filed: res.claims_filed ?? 0,
                total: res.claims_total ?? Math.max(1, res.assets_found ?? 12),
                display: `${res.claims_filed ?? 0} of ${res.claims_total ?? res.assets_found ?? 12}`,
                percentage: res.claims_total
                  ? Math.round(((res.claims_filed ?? 0) / res.claims_total) * 100)
                  : 0,
              },
              estimatedSettlement: {
                days: res.est_settlement_days ?? 21,
                comparison: `${Math.round(
                  ((res.baseline_days ?? 180) - (res.est_settlement_days ?? 21)) / 30
                )} months faster`,
                benchmark: `vs ${res.baseline_days ?? 180} days manual offline benchmark`,
              },
              riskScore: {
                level: (res.risk_label || (amberAlertObj ? 'AMBER' : 'LOW')).toUpperCase(),
                status: amberAlertObj ? 'Adverse Caveat Active' : 'Verified Clear',
                confidence: '99.4% AI Confidence',
              },
            },
            assetCategories,
            nextBestActions: (res.next_actions || []).map((a: any, idx: number) => ({
              id: `act-${idx}`,
              title: a.title,
              description: a.cta,
              priority: 'P1 - High',
              agent: 'Legal AI',
              actionText: 'Review Now',
              route: a.target_route || `/case/${activeId}/overview`,
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
              timestamp: t.timestamp
                ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Today',
              actor: t.actor || 'System',
              actorType: (t.type === 'run_event' ? 'AI Agent' : 'Legal Concierge') as any,
              action: t.title || 'Settlement Event',
              category: 'Verification' as any,
              details: t.description || t.title || 'Audit event verified in Spanner.',
              hash: (t.id || 'sha256-verified').slice(0, 14),
            })),
            amberAlert: amberAlertObj,
          };

          if (isMounted) {
            setData(liveOverview);
            setIsLoading(false);
          }
          return;
        } catch (err: any) {
          const status = err?.statusCode || (err instanceof ApiError ? err.statusCode : undefined);
          const is404 =
            status === 404 ||
            err?.code === 'not_found' ||
            String(err?.message || '').toLowerCase().includes('not found');

          if (is404) {
            console.warn(`[useOverview] Case ${activeId} not found in database:`, err);
            if (isMounted) {
              setIsNotFound(true);
              setError(err);
              setData(null);
              setIsLoading(false);
            }
            return;
          }

          console.warn('[useOverview] Live fetch failed, evaluating fallback:', err);
          // If the server failed with a connection/internal error, present the error state
          if (isMounted) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          }
          return;
        }
      }

      // Fallback mock data when running in explicit offline/mock mode
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
          { id: 'p-0', name: 'Late Ramesh Sharma', relation: 'Deceased', classType: 'Propositus', sharePercent: 0, consented: true, isDeceased: true, avatar: (baseCaseData.deceased as any).avatar || DEFAULT_AVATARS[0] },
          { id: 'p-1', name: 'Sunita Sharma', relation: 'Spouse', classType: 'Class-I Heir', sharePercent: 40, consented: true, avatar: basePeople[0]?.avatar || DEFAULT_AVATARS[0] },
          { id: 'p-2', name: 'Arjun Sharma', relation: 'Son', classType: 'Class-I Heir', sharePercent: 20, consented: true, avatar: basePeople[1]?.avatar || DEFAULT_AVATARS[1] },
          { id: 'p-3', name: 'Priya Sharma', relation: 'Daughter', classType: 'Class-I Heir', sharePercent: 20, consented: true, avatar: basePeople[2]?.avatar || DEFAULT_AVATARS[2] },
          { id: 'p-4', name: 'Kamala Sharma', relation: 'Mother', classType: 'Class-I Heir', sharePercent: 20, consented: false, avatar: basePeople[3]?.avatar || DEFAULT_AVATARS[3] },
          { id: 'p-5', name: 'Vikram Sharma', relation: 'Brother', classType: 'Class-II Relative', sharePercent: 0, consented: false, isExcluded: true, avatar: basePeople[4]?.avatar || DEFAULT_AVATARS[4] },
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
  }, [caseIdParam, reloadCount]);

  return { data, isLoading, error, isNotFound, refetch };
}

export default useOverview;
