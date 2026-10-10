export interface Person {
  id: string;
  name: string;
  relationship: 'Spouse' | 'Son' | 'Daughter' | 'Mother' | 'Brother' | 'Legal Representative';
  legalHeirClass: 'Class-I Heir' | 'Class-II Heir' | 'Non-Heir Nominee';
  age: number;
  city: string;
  panLastFour: string;
  kycStatus: 'Verified' | 'Pending Verification' | 'Document Required' | 'Disputed Flag';
  isNominee: boolean;
  assignedSharePercentage: number;
  avatar: string;
  phone: string;
  email: string;
  notes?: string;
}

export const basePeople: Person[] = [
  {
    id: 'person-1',
    name: 'Sunita Sharma',
    relationship: 'Spouse',
    legalHeirClass: 'Class-I Heir',
    age: 64,
    city: 'Hyderabad',
    panLastFour: '9120',
    kycStatus: 'Verified',
    isNominee: true,
    assignedSharePercentage: 40,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    phone: '+91 98490 23145',
    email: 'sunita.sharma@example.com',
    notes: 'Primary legal claimant; registered nominee on SBI savings and LIC policy.',
  },
  {
    id: 'person-2',
    name: 'Arjun Sharma',
    relationship: 'Son',
    legalHeirClass: 'Class-I Heir',
    age: 36,
    city: 'Bengaluru',
    panLastFour: '4481',
    kycStatus: 'Verified',
    isNominee: true,
    assignedSharePercentage: 20,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '+91 99012 88471',
    email: 'arjun.sharma@techcorp.in',
    notes: 'Software VP in Bengaluru; appointed family executor. Nominee for Zerodha Demat.',
  },
  {
    id: 'person-3',
    name: 'Priya Sharma',
    relationship: 'Daughter',
    legalHeirClass: 'Class-I Heir',
    age: 32,
    city: 'Hyderabad',
    panLastFour: '7103',
    kycStatus: 'Verified',
    isNominee: true,
    assignedSharePercentage: 20,
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    phone: '+91 98491 55291',
    email: 'priya.sharma@designstudio.org',
    notes: 'Architect living in Hyderabad. Registered nominee for SBI Mutual Funds.',
  },
  {
    id: 'person-4',
    name: 'Kamala Sharma',
    relationship: 'Mother',
    legalHeirClass: 'Class-I Heir',
    age: 88,
    city: 'Hyderabad',
    panLastFour: '1192',
    kycStatus: 'Verified',
    isNominee: false,
    assignedSharePercentage: 20,
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    phone: '+91 98490 23145',
    email: 'c/o sunita.sharma@example.com',
    notes: 'Surviving mother of the deceased. Class-I heir entitled to equal statutory share under Hindu Succession Act.',
  },
  {
    id: 'person-5',
    name: 'Vikram Sharma',
    relationship: 'Brother',
    legalHeirClass: 'Class-II Heir',
    age: 61,
    city: 'Nagpur',
    panLastFour: '6618',
    kycStatus: 'Disputed Flag',
    isNominee: false,
    assignedSharePercentage: 0,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '+91 94221 00923',
    email: 'vikram.sharma.trade@gmail.com',
    notes: 'Surviving younger brother. Class-II relative; claimed right to ancestral apartment under an unverified family deed.',
  },
];
