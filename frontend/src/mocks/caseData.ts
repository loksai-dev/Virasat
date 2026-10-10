export interface DeceasedProfile {
  name: string;
  birthYear: number;
  deathYear: number;
  dateOfDeath: string;
  city: string;
  state: string;
  panNumber: string;
  aadhaarLastFour: string;
  occupation: string;
  maritalStatus: string;
  deathCertificateNo: string;
}

export interface CaseDetails {
  id: string;
  title: string;
  status: 'In Progress' | 'Action Required' | 'Settled' | 'Dispute Review';
  progressPercentage: number;
  deceased: DeceasedProfile;
  totalGrossAssets: number;
  totalLiabilities: number;
  netEstateValue: number;
  totalAssetsCount: number;
  openClaimsCount: number;
  settledClaimsCount: number;
  activeDisputesCount: number;
  createdAt: string;
  lastUpdated: string;
  estimatedCompletion: string;
  leadCoordinator: {
    name: string;
    role: string;
    avatar: string;
    phone: string;
  };
  activeAgents: {
    id: string;
    name: string;
    task: string;
    status: 'working' | 'idle' | 'awaiting_signature';
    lastActivity: string;
  }[];
}

export const baseCaseData: CaseDetails = {
  id: 'VR-2026-0142',
  title: 'Estate Settlement of Late Ramesh Sharma',
  status: 'In Progress',
  progressPercentage: 58,
  deceased: {
    name: 'Ramesh Sharma',
    birthYear: 1958,
    deathYear: 2026,
    dateOfDeath: '2026-01-14',
    city: 'Hyderabad',
    state: 'Telangana',
    panNumber: 'ABCPS4819M',
    aadhaarLastFour: '7412',
    occupation: 'Retired Chief Engineer, Irrigation Dept.',
    maritalStatus: 'Married',
    deathCertificateNo: 'GHMC/2026/004812',
  },
  totalGrossAssets: 31200000, // ₹3.12 Cr
  totalLiabilities: 2800000,  // ₹28 Lakhs
  netEstateValue: 28400000,    // ₹2.84 Cr
  totalAssetsCount: 12,
  openClaimsCount: 5,
  settledClaimsCount: 6,
  activeDisputesCount: 0,
  createdAt: '2026-01-20',
  lastUpdated: '2026-02-18',
  estimatedCompletion: '2026-03-15',
  leadCoordinator: {
    name: 'Aditi Varma',
    role: 'Virasat Care Specialist & Legal Concierge',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '+91 40 6821 9000',
  },
  activeAgents: [
    {
      id: 'agent-1',
      name: 'AssetDiscoveryAgent',
      task: 'Reconciling EPFO UAN interest & CAMS mutual fund folios',
      status: 'working',
      lastActivity: '12 mins ago',
    },
    {
      id: 'agent-2',
      name: 'DocuVerifyAgent',
      task: 'Validating GHMC Digitally Signed Death Certificate with DigiLocker',
      status: 'working',
      lastActivity: '4 mins ago',
    },
    {
      id: 'agent-3',
      name: 'DisputeGuardAI',
      task: 'Scanning kinship registry for conflicting claims',
      status: 'idle',
      lastActivity: 'Just now',
    },
  ],
};
