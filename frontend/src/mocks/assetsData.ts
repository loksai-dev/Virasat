export type AssetCategory = 
  | 'Banking'
  | 'Investments'
  | 'Insurance'
  | 'Retirement'
  | 'Real Estate'
  | 'Valuables & Movable'
  | 'Liabilities';

export interface EstateAsset {
  id: string;
  name: string;
  category: AssetCategory;
  institutionId: string;
  institutionName: string;
  accountOrFolioNumber: string;
  grossValue: number;
  isLiability: boolean;
  status: 'Settled' | 'Processing' | 'Action Needed' | 'Awaiting Documents' | 'Under Dispute';
  nomineeName?: string;
  nomineeStatus: 'Registered Nominee' | 'No Nominee' | 'Multiple Nominees' | 'Disputed Nominee';
  settlementProgress: number; // 0 to 100
  estimatedTATDays: number;
  notes: string;
  documentationRequired: string[];
}

export const baseAssets: EstateAsset[] = [
  {
    id: 'asset-1',
    name: 'SBI Savings Account',
    category: 'Banking',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India',
    accountOrFolioNumber: 'SB-0921-3912',
    grossValue: 650000, // ₹6.5 Lakhs
    isLiability: false,
    status: 'Settled',
    nomineeName: 'Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 100,
    estimatedTATDays: 3,
    notes: 'Primary pension credit account. Settled via SBI survivor mandate with death cert.',
    documentationRequired: ['Death Certificate', 'KYC of Nominee', 'Annexure-A Form'],
  },
  {
    id: 'asset-2',
    name: 'HDFC Savings Account',
    category: 'Banking',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank',
    accountOrFolioNumber: 'SB-4810-7721',
    grossValue: 450000, // ₹4.5 Lakhs
    isLiability: false,
    status: 'Processing',
    nomineeName: 'None registered',
    nomineeStatus: 'No Nominee',
    settlementProgress: 60,
    estimatedTATDays: 14,
    notes: 'No nominee registered on record. Class-I heirs NOC submitted; indemnity bond generated.',
    documentationRequired: ['Legal Heir Certificate', 'NOC from all Class-I heirs', 'Indemnity Bond'],
  },
  {
    id: 'asset-3',
    name: 'ICICI Fixed Deposit',
    category: 'Banking',
    institutionId: 'inst-icici',
    institutionName: 'ICICI Bank',
    accountOrFolioNumber: 'FD-7701-8840',
    grossValue: 1400000, // ₹14.0 Lakhs
    isLiability: false,
    status: 'Settled',
    nomineeName: 'Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 100,
    estimatedTATDays: 5,
    notes: 'Matured cumulative deposit. Principal + accrued interest paid to registered nominee.',
    documentationRequired: ['FD Receipt Original / Loss Affidavit', 'Death Certificate', 'Nominee Cancelled Cheque'],
  },
  {
    id: 'asset-4',
    name: 'Zerodha Demat Account',
    category: 'Investments',
    institutionId: 'inst-zerodha',
    institutionName: 'Zerodha Broking Ltd',
    accountOrFolioNumber: 'DP-12081600-4491',
    grossValue: 4500000, // ₹45.0 Lakhs
    isLiability: false,
    status: 'Processing',
    nomineeName: 'Arjun Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 75,
    estimatedTATDays: 7,
    notes: 'Includes Bluechip Nifty 50 shares and Sovereign Gold Bonds. Transmission form submitted.',
    documentationRequired: ['Transmission Request Form (Annexure 7)', 'Client Master Report (CMR)', 'Client Death Certificate'],
  },
  {
    id: 'asset-5',
    name: 'SBI Mutual Fund Folio',
    category: 'Investments',
    institutionId: 'inst-sbi',
    institutionName: 'SBI Mutual Fund (CAMS)',
    accountOrFolioNumber: 'MF-88319014/9',
    grossValue: 2500000, // ₹25.0 Lakhs
    isLiability: false,
    status: 'Settled',
    nomineeName: 'Priya Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 100,
    estimatedTATDays: 6,
    notes: 'SBI Bluechip Fund & Small Cap Fund. Units transmitted to daughter’s demat folio.',
    documentationRequired: ['Form T3 Transmission', 'CAMS e-KYC', 'Attested Death Certificate'],
  },
  {
    id: 'asset-6',
    name: 'LIC Jeevan Anand Policy',
    category: 'Insurance',
    institutionId: 'inst-lic',
    institutionName: 'Life Insurance Corporation of India',
    accountOrFolioNumber: 'POL-682914129',
    grossValue: 3000000, // ₹30.0 Lakhs
    isLiability: false,
    status: 'Action Needed',
    nomineeName: 'Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 40,
    estimatedTATDays: 21,
    notes: 'Sum assured ₹20L + vested reversionary bonuses ₹10L. Requires original discharge voucher Form 3783.',
    documentationRequired: ['Form 3783 (Discharge Voucher)', 'Original Policy Bond', 'Hospital Medical Attendant Report'],
  },
  {
    id: 'asset-7',
    name: 'Employees Provident Fund (EPF)',
    category: 'Retirement',
    institutionId: 'inst-epfo',
    institutionName: 'Employees Provident Fund Organisation',
    accountOrFolioNumber: 'UAN-100488921892',
    grossValue: 2800000, // ₹28.0 Lakhs
    isLiability: false,
    status: 'Processing',
    nomineeName: 'Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 50,
    estimatedTATDays: 20,
    notes: 'Composite Claim Form (Death) submitted via EPFO Portal Hyderabad Regional Office.',
    documentationRequired: ['EPFO Form 20 & 10D', 'Employer Attestation Certificate', 'Cancelled Cheque of Claimant'],
  },
  {
    id: 'asset-8',
    name: 'Public Provident Fund (PPF)',
    category: 'Retirement',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India (PPF Branch)',
    accountOrFolioNumber: 'PPF-0019283-HYD',
    grossValue: 1600000, // ₹16.0 Lakhs
    isLiability: false,
    status: 'Settled',
    nomineeName: 'Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 100,
    estimatedTATDays: 10,
    notes: 'Matured PPF account closed. Proceed credits transferred to Sunita Sharma savings account.',
    documentationRequired: ['Form G (Death Claim)', 'Original PPF Passbook', 'Death Certificate'],
  },
  {
    id: 'asset-9',
    name: 'Bank Safe Deposit Locker',
    category: 'Valuables & Movable',
    institutionId: 'inst-sbi',
    institutionName: 'State Bank of India (Banjara Hills)',
    accountOrFolioNumber: 'LOCKER-B142',
    grossValue: 200000, // ₹2.0 Lakhs (Gold coins & heirlooms appraised value)
    isLiability: false,
    status: 'Awaiting Documents',
    nomineeName: 'Sunita Sharma (Joint with deceased)',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 30,
    estimatedTATDays: 15,
    notes: 'Locker inventory inspection scheduled with bank manager and approved valuer.',
    documentationRequired: ['Locker Key', 'Inventory Form with 2 Independent Witnesses', 'Death Certificate'],
  },
  {
    id: 'asset-10',
    name: 'HDFC Home Loan Liability',
    category: 'Liabilities',
    institutionId: 'inst-hdfc',
    institutionName: 'HDFC Bank (Mortgages)',
    accountOrFolioNumber: 'HL-6812-5512',
    grossValue: -2800000, // -₹28.0 Lakhs (liability)
    isLiability: true,
    status: 'Processing',
    nomineeName: 'Co-borrower: Sunita Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 45,
    estimatedTATDays: 25,
    notes: 'Outstanding home loan balance on Jubilee Hills flat. Life insurance credit-cover claim initiated.',
    documentationRequired: ['Loan Account Statement', 'Credit Protect Insurance Claim Form', 'Death Certificate'],
  },
  {
    id: 'asset-11',
    name: 'Jubilee Hills Residential Flat',
    category: 'Real Estate',
    institutionId: 'inst-registrar',
    institutionName: 'Registration & Stamps Dept, Telangana',
    accountOrFolioNumber: 'DOC-HYD-2014-8821',
    grossValue: 14000000, // ₹1.40 Cr
    isLiability: false,
    status: 'Action Needed',
    nomineeName: 'No Nominee on Title Deed',
    nomineeStatus: 'No Nominee',
    settlementProgress: 20,
    estimatedTATDays: 45,
    notes: '3BHK apartment in Jubilee Hills. Requires GHMC Property Tax name mutation & Sub-Registrar transfer.',
    documentationRequired: ['Registered Sale Deed', 'Family Member Certificate (Tahsildar)', 'GHMC Mutation Application'],
  },
  {
    id: 'asset-12',
    name: 'Hyundai Creta (Car)',
    category: 'Valuables & Movable',
    institutionId: 'inst-registrar',
    institutionName: 'RTA Hyderabad (Transport Dept)',
    accountOrFolioNumber: 'RC-TS09EA4492',
    grossValue: 700000, // ₹7.0 Lakhs
    isLiability: false,
    status: 'Settled',
    nomineeName: 'Arjun Sharma',
    nomineeStatus: 'Registered Nominee',
    settlementProgress: 100,
    estimatedTATDays: 12,
    notes: 'Vehicle RC transfer completed in favor of Arjun Sharma under Motor Vehicles Rule 56.',
    documentationRequired: ['Form 31 (Transfer on Death)', 'Original RC Book', 'PUC & Insurance Endorsement'],
  },
];
