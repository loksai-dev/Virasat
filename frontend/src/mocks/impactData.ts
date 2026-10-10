export interface ImpactMetric {
  title: string;
  traditionalValue: string;
  virasatValue: string;
  benefitStatement: string;
  iconName: string;
}

export const baseImpactMetrics: ImpactMetric[] = [
  {
    title: 'Settlement Timeline',
    traditionalValue: '14 - 18 Months',
    virasatValue: '28 Days',
    benefitStatement: '94% reduction in emotional delay and legal limbo',
    iconName: 'Clock',
  },
  {
    title: 'Intermediary Costs Saved',
    traditionalValue: '₹2,10,000 avg fees',
    virasatValue: '₹24,999 platform fee',
    benefitStatement: 'Direct savings of ₹1,85,000 per family in touts & agents',
    iconName: 'IndianRupee',
  },
  {
    title: 'Physical Branch Visits',
    traditionalValue: '24+ Visits across cities',
    virasatValue: '1 Visit (Locker only)',
    benefitStatement: 'Eliminates repetitive queues for elderly survivors',
    iconName: 'Building',
  },
  {
    title: 'Digitally Verified Rate',
    traditionalValue: '15% (Paper copies)',
    virasatValue: '96% (DigiLocker / KRA)',
    benefitStatement: 'Zero paper forgery risks with cryptographic validation',
    iconName: 'ShieldCheck',
  },
];
