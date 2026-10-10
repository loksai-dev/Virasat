export interface Institution {
  id: string;
  name: string;
  code: string;
  type: 'Public Bank' | 'Private Bank' | 'Broker' | 'Life Insurer' | 'Govt Pension' | 'Land Registry';
  integrationStatus: 'API Direct' | 'DigiLocker Linked' | 'Semi-Automated' | 'Manual Officer Queue';
  avgTurnaroundDays: number;
  nodalContact: {
    officer: string;
    designation: string;
    email: string;
    phone: string;
  };
  totalAssetsAssigned: number;
  totalValueAssigned: number;
  pendingClaimsCount: number;
  slaHealth: 'Excellent' | 'On Track' | 'At Risk' | 'Delayed';
  icon: string;
}

export const baseInstitutions: Institution[] = [
  {
    id: 'inst-sbi',
    name: 'State Bank of India',
    code: 'SBI',
    type: 'Public Bank',
    integrationStatus: 'API Direct',
    avgTurnaroundDays: 4,
    nodalContact: {
      officer: 'Mr. Venkat Rao',
      designation: 'Assistant General Manager (Settlements)',
      email: 'nodal.settlements@sbi.co.in',
      phone: '+91 40 2345 1100',
    },
    totalAssetsAssigned: 4, // Savings, PPF, Locker, SBI MF
    totalValueAssigned: 4950000, // ₹49.5 Lakhs
    pendingClaimsCount: 1,
    slaHealth: 'Excellent',
    icon: 'Landmark',
  },
  {
    id: 'inst-hdfc',
    name: 'HDFC Bank Ltd.',
    code: 'HDFC',
    type: 'Private Bank',
    integrationStatus: 'API Direct',
    avgTurnaroundDays: 8,
    nodalContact: {
      officer: 'Ms. Shalini Iyer',
      designation: 'VP, Operations & Deceased Claims',
      email: 'estate.claims@hdfcbank.com',
      phone: '+91 22 6652 1000',
    },
    totalAssetsAssigned: 2, // Savings, Home loan
    totalValueAssigned: -2350000, // ₹4.5L asset - 28L loan
    pendingClaimsCount: 2,
    slaHealth: 'On Track',
    icon: 'Building2',
  },
  {
    id: 'inst-icici',
    name: 'ICICI Bank Ltd.',
    code: 'ICICI',
    type: 'Private Bank',
    integrationStatus: 'API Direct',
    avgTurnaroundDays: 5,
    nodalContact: {
      officer: 'Mr. Rohan Mehta',
      designation: 'Head of Branch Service & Transmission',
      email: 'transmission.desk@icicibank.com',
      phone: '+91 22 3366 7777',
    },
    totalAssetsAssigned: 1, // Fixed Deposit
    totalValueAssigned: 1400000, // ₹14 Lakhs
    pendingClaimsCount: 0,
    slaHealth: 'Excellent',
    icon: 'CreditCard',
  },
  {
    id: 'inst-lic',
    name: 'Life Insurance Corporation of India',
    code: 'LIC',
    type: 'Life Insurer',
    integrationStatus: 'Semi-Automated',
    avgTurnaroundDays: 21,
    nodalContact: {
      officer: 'S. Ramakrishna',
      designation: 'Senior Divisional Claims Manager',
      email: 'claims.divhyd@licindia.com',
      phone: '+91 40 2322 8841',
    },
    totalAssetsAssigned: 1, // LIC Policy
    totalValueAssigned: 3000000, // ₹30 Lakhs
    pendingClaimsCount: 1,
    slaHealth: 'At Risk',
    icon: 'ShieldCheck',
  },
  {
    id: 'inst-epfo',
    name: 'Employees Provident Fund Organisation',
    code: 'EPFO',
    type: 'Govt Pension',
    integrationStatus: 'DigiLocker Linked',
    avgTurnaroundDays: 20,
    nodalContact: {
      officer: 'Deepa Krishnan, IOFS',
      designation: 'Regional P.F. Commissioner-I, Hyderabad',
      email: 'ro.hyderabad1@epfindia.gov.in',
      phone: '+91 40 2756 1225',
    },
    totalAssetsAssigned: 1, // EPF
    totalValueAssigned: 2800000, // ₹28 Lakhs
    pendingClaimsCount: 1,
    slaHealth: 'On Track',
    icon: 'Award',
  },
  {
    id: 'inst-zerodha',
    name: 'Zerodha Broking Ltd.',
    code: 'ZERODHA',
    type: 'Broker',
    integrationStatus: 'API Direct',
    avgTurnaroundDays: 7,
    nodalContact: {
      officer: 'Kavita Nair',
      designation: 'Manager, Depository Participant Operations',
      email: 'transmission@zerodha.com',
      phone: '+91 80 4718 1888',
    },
    totalAssetsAssigned: 1, // Demat
    totalValueAssigned: 4500000, // ₹45 Lakhs
    pendingClaimsCount: 1,
    slaHealth: 'On Track',
    icon: 'TrendingUp',
  },
  {
    id: 'inst-registrar',
    name: 'Registration & Stamps Dept / RTA Telangana',
    code: 'REGISTRAR',
    type: 'Land Registry',
    integrationStatus: 'Manual Officer Queue',
    avgTurnaroundDays: 35,
    nodalContact: {
      officer: 'M. Prabhakar Rao',
      designation: 'Sub-Registrar, Banjara Hills Zone',
      email: 'subreg.banjara@igrs.telangana.gov.in',
      phone: '+91 40 2339 9901',
    },
    totalAssetsAssigned: 2, // Apartment, Creta Car
    totalValueAssigned: 14700000, // ₹1.47 Cr
    pendingClaimsCount: 1,
    slaHealth: 'At Risk',
    icon: 'Home',
  },
];
