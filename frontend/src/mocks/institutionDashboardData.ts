export interface InstitutionKPIs {
  totalActiveCases: number;
  pendingClaimsQueue: number;
  slaComplianceRate: number; // percentage, e.g., 94.2%
  avgTurnaroundDays: number; // e.g. 5.8 days vs industry 42 days
  straightThroughProcessingRate: number; // 78% AI automated
  totalDisbursedMonth: number; // in INR
  fraudPreventedAmount: number; // in INR
}

export interface MonthlyTrendPoint {
  month: string;
  submitted: number;
  settled: number;
  slaBreached: number;
}

export interface CategoryVolume {
  name: string;
  claimsCount: number;
  totalValueLakhs: number;
  color: string;
}

export interface OperationsQueueItem {
  id: string;
  caseId: string;
  deceasedName: string;
  institutionName: string;
  assetType: string;
  amount: number;
  claimantName: string;
  slaDaysRemaining: number;
  riskScore: 'Low' | 'Medium' | 'High';
  priority: 'Urgent' | 'Standard' | 'Elevated';
  status: 'Awaiting Signoff' | 'Document Review' | 'Fraud Check' | 'Ready to Disburse';
}

export const baseInstitutionDashboard = {
  kpis: {
    totalActiveCases: 148,
    pendingClaimsQueue: 32,
    slaComplianceRate: 95.8,
    avgTurnaroundDays: 5.4,
    straightThroughProcessingRate: 82.5,
    totalDisbursedMonth: 48200000, // ₹4.82 Cr
    fraudPreventedAmount: 18500000, // ₹1.85 Cr
  },
  monthlyTrends: [
    { month: 'Sep', submitted: 42, settled: 38, slaBreached: 2 },
    { month: 'Oct', submitted: 56, settled: 52, slaBreached: 1 },
    { month: 'Nov', submitted: 68, settled: 64, slaBreached: 3 },
    { month: 'Dec', submitted: 84, settled: 81, slaBreached: 2 },
    { month: 'Jan', submitted: 110, settled: 104, slaBreached: 2 },
    { month: 'Feb', submitted: 94, settled: 90, slaBreached: 1 },
  ] as MonthlyTrendPoint[],
  categoryVolumes: [
    { name: 'Bank Accounts & FDs', claimsCount: 142, totalValueLakhs: 410, color: '#0B1F3A' },
    { name: 'Mutual Funds & Demat', claimsCount: 88, totalValueLakhs: 690, color: '#14B8A6' },
    { name: 'Life Insurance', claimsCount: 64, totalValueLakhs: 580, color: '#C9A227' },
    { name: 'Retirement (EPF/PPF)', claimsCount: 52, totalValueLakhs: 440, color: '#3B82F6' },
    { name: 'Real Estate Mutations', claimsCount: 31, totalValueLakhs: 1420, color: '#64748B' },
  ] as CategoryVolume[],
  queue: [
    {
      id: 'OPS-901',
      caseId: 'VR-2026-0142',
      deceasedName: 'Ramesh Sharma',
      institutionName: 'HDFC Bank',
      assetType: 'Savings Account (No Nominee)',
      amount: 450000,
      claimantName: 'Sunita Sharma (Spouse)',
      slaDaysRemaining: 4,
      riskScore: 'Low',
      priority: 'Standard',
      status: 'Awaiting Signoff',
    },
    {
      id: 'OPS-902',
      caseId: 'VR-2026-0142',
      deceasedName: 'Ramesh Sharma',
      institutionName: 'LIC Hyderabad',
      assetType: 'Jeevan Anand (Form 3783)',
      amount: 3000000,
      claimantName: 'Sunita Sharma',
      slaDaysRemaining: 8,
      riskScore: 'Medium',
      priority: 'Elevated',
      status: 'Document Review',
    },
    {
      id: 'OPS-903',
      caseId: 'VR-2026-0142',
      deceasedName: 'Ramesh Sharma',
      institutionName: 'Zerodha Broking',
      assetType: 'Demat Equity Transmission',
      amount: 4500000,
      claimantName: 'Arjun Sharma (Son)',
      slaDaysRemaining: 2,
      riskScore: 'Low',
      priority: 'Urgent',
      status: 'Ready to Disburse',
    },
    {
      id: 'OPS-904',
      caseId: 'VR-2026-0089',
      deceasedName: 'Anand Kulkarni',
      institutionName: 'SBI General',
      assetType: 'Term Life Settlement',
      amount: 5000000,
      claimantName: 'Radha Kulkarni',
      slaDaysRemaining: 6,
      riskScore: 'Low',
      priority: 'Standard',
      status: 'Ready to Disburse',
    },
    {
      id: 'OPS-905',
      caseId: 'VR-2026-0142',
      deceasedName: 'Ramesh Sharma',
      institutionName: 'Registration & Stamps',
      assetType: 'Jubilee Hills Title Mutation',
      amount: 14000000,
      claimantName: 'Legal Heirs Joint',
      slaDaysRemaining: 18,
      riskScore: 'High',
      priority: 'Elevated',
      status: 'Fraud Check',
    },
  ] as OperationsQueueItem[],
};
