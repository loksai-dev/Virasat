export interface CaseDocument {
  id: string;
  title: string;
  category: 'Identity & Death' | 'Legal Heir & Succession' | 'Bank & Transmission' | 'Insurance' | 'Property Title';
  status: 'Verified' | 'Pending Review' | 'Action Required' | 'Missing';
  verifiedSource?: 'DigiLocker' | 'GHMC Portal' | 'MeeSeva' | 'Bank KRA' | 'Manual Upload';
  fileSize: string;
  uploadedAt: string;
  associatedAsset?: string;
  docNumber?: string;
  requiredFor: string[];
  downloadUrl?: string;
}

export const baseDocuments: CaseDocument[] = [
  {
    id: 'DOC-01',
    title: 'GHMC Certified Death Certificate',
    category: 'Identity & Death',
    status: 'Verified',
    verifiedSource: 'DigiLocker',
    fileSize: '1.4 MB',
    uploadedAt: '2026-01-20',
    docNumber: 'GHMC/2026/004812',
    requiredFor: ['All 12 Estate Claims'],
  },
  {
    id: 'DOC-02',
    title: 'Family Member Certificate (Tahsildar)',
    category: 'Legal Heir & Succession',
    status: 'Verified',
    verifiedSource: 'MeeSeva',
    fileSize: '2.1 MB',
    uploadedAt: '2026-01-24',
    docNumber: 'TG-REV-FMC-981291',
    requiredFor: ['HDFC Savings', 'Jubilee Hills Flat', 'LIC Policy'],
  },
  {
    id: 'DOC-03',
    title: 'Legal Heir Certificate (Pending Issuance)',
    category: 'Legal Heir & Succession',
    status: 'Pending Review',
    verifiedSource: 'MeeSeva',
    fileSize: '840 KB',
    uploadedAt: '2026-02-06',
    docNumber: 'TG-LHC-APP-2026-44',
    requiredFor: ['Jubilee Hills Flat', 'HDFC Bank Account'],
  },
  {
    id: 'DOC-04',
    title: 'Deceased PAN & Aadhaar (Deactivation Dossier)',
    category: 'Identity & Death',
    status: 'Verified',
    verifiedSource: 'DigiLocker',
    fileSize: '950 KB',
    uploadedAt: '2026-01-21',
    docNumber: 'ABCPS4819M',
    requiredFor: ['Banking', 'Tax Return Closure', 'EPFO'],
  },
  {
    id: 'DOC-05',
    title: 'Zerodha Demat Transmission Form (Annexure 7)',
    category: 'Bank & Transmission',
    status: 'Verified',
    verifiedSource: 'Bank KRA',
    fileSize: '3.2 MB',
    uploadedAt: '2026-02-05',
    associatedAsset: 'Zerodha Demat Account',
    requiredFor: ['Zerodha Demat Account'],
  },
  {
    id: 'DOC-06',
    title: 'CAMS Mutual Fund Form T3 Transmission Request',
    category: 'Bank & Transmission',
    status: 'Verified',
    verifiedSource: 'Bank KRA',
    fileSize: '1.8 MB',
    uploadedAt: '2026-01-25',
    associatedAsset: 'SBI Mutual Fund Folio',
    requiredFor: ['SBI Mutual Fund Folio'],
  },
  {
    id: 'DOC-07',
    title: 'LIC Form 3783 (Discharge Voucher with Revenue Stamp)',
    category: 'Insurance',
    status: 'Action Required',
    fileSize: '—',
    uploadedAt: 'Pending',
    associatedAsset: 'LIC Jeevan Anand Policy',
    requiredFor: ['LIC Jeevan Anand Policy'],
  },
  {
    id: 'DOC-08',
    title: 'HDFC Multi-Heir Indemnity Bond & Stamp Franking',
    category: 'Bank & Transmission',
    status: 'Verified',
    verifiedSource: 'Manual Upload',
    fileSize: '4.5 MB',
    uploadedAt: '2026-02-02',
    associatedAsset: 'HDFC Savings Account',
    requiredFor: ['HDFC Savings Account'],
  },
  {
    id: 'DOC-09',
    title: 'Registered Sale Deed (Jubilee Hills Apartment)',
    category: 'Property Title',
    status: 'Verified',
    verifiedSource: 'Manual Upload',
    fileSize: '6.8 MB',
    uploadedAt: '2026-01-26',
    docNumber: 'DOC-HYD-2014-8821',
    associatedAsset: 'Jubilee Hills Residential Flat',
    requiredFor: ['GHMC Property Mutation', 'Title Transfer'],
  },
  {
    id: 'DOC-10',
    title: 'EPFO Composite Death Claim Form 20 & 10D',
    category: 'Bank & Transmission',
    status: 'Pending Review',
    verifiedSource: 'Manual Upload',
    fileSize: '2.4 MB',
    uploadedAt: '2026-02-08',
    associatedAsset: 'Employees Provident Fund (EPF)',
    requiredFor: ['Employees Provident Fund'],
  },
];
