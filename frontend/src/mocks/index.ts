import { baseCaseData, CaseDetails } from './caseData';
import { basePeople, Person } from './peopleData';
import { baseAssets, EstateAsset } from './assetsData';
import { baseInstitutions, Institution } from './institutionsData';
import { baseClaims, Claim } from './claimsData';
import { baseDisputes, Dispute } from './disputesData';
import { baseDocuments, CaseDocument } from './documentsData';
import { baseAuditTrail, AuditEntry } from './auditData';
import { baseInstitutionDashboard } from './institutionDashboardData';
import { baseImpactMetrics, ImpactMetric } from './impactData';
import { CaseScenario } from '@/store/useVirasatStore';

export interface VirasatMockDatabase {
  caseDetails: CaseDetails;
  people: Person[];
  assets: EstateAsset[];
  institutions: Institution[];
  claims: Claim[];
  disputes: Dispute[];
  documents: CaseDocument[];
  auditTrail: AuditEntry[];
  institutionDashboard: typeof baseInstitutionDashboard;
  impactMetrics: ImpactMetric[];
}

/**
 * Returns mock data customized for the selected scenario
 */
export function getMockData(scenario: CaseScenario = 'complex'): VirasatMockDatabase {
  // Deep copy base data to allow scenario mutations
  const caseDetails: CaseDetails = JSON.parse(JSON.stringify(baseCaseData));
  const people: Person[] = JSON.parse(JSON.stringify(basePeople));
  const assets: EstateAsset[] = JSON.parse(JSON.stringify(baseAssets));
  const institutions: Institution[] = JSON.parse(JSON.stringify(baseInstitutions));
  const claims: Claim[] = JSON.parse(JSON.stringify(baseClaims));
  let disputes: Dispute[] = [];
  const documents: CaseDocument[] = JSON.parse(JSON.stringify(baseDocuments));
  const auditTrail: AuditEntry[] = JSON.parse(JSON.stringify(baseAuditTrail));
  const institutionDashboard = JSON.parse(JSON.stringify(baseInstitutionDashboard));
  const impactMetrics: ImpactMetric[] = JSON.parse(JSON.stringify(baseImpactMetrics));

  if (scenario === 'simple') {
    // Scenario 1: Clear Nominee everywhere, registered will, expedited settlement
    caseDetails.status = 'In Progress';
    caseDetails.progressPercentage = 85;
    caseDetails.openClaimsCount = 2;
    caseDetails.settledClaimsCount = 9;
    caseDetails.activeDisputesCount = 0;
    
    // Mark brother as non-disputed or removed
    const vikram = people.find(p => p.name.includes('Vikram'));
    if (vikram) {
      vikram.kycStatus = 'Verified';
      vikram.notes = 'Signed comprehensive family waiver and acknowledgment.';
    }

    // Almost all claims settled
    claims.forEach((c) => {
      if (c.id !== 'CLM-11' && c.id !== 'CLM-09') {
        c.status = 'Settled';
        c.currentStep = 4;
      }
    });

    assets.forEach((a) => {
      if (a.id !== 'asset-11' && a.id !== 'asset-9') {
        a.status = 'Settled';
        a.settlementProgress = 100;
      }
    });
  } else if (scenario === 'disputed') {
    // Scenario 3: Fraud/Adverse claim flagged
    caseDetails.status = 'Dispute Review';
    caseDetails.progressPercentage = 42;
    caseDetails.activeDisputesCount = 2;
    disputes = JSON.parse(JSON.stringify(baseDisputes));

    // Put apartment and LIC claims on hold
    const aptClaim = claims.find(c => c.assetId === 'asset-11');
    if (aptClaim) {
      aptClaim.status = 'Dispute Hold';
      aptClaim.stageTitle = 'Title Transfer Frozen: Conflicting Claim Flagged';
      aptClaim.stageDescription = 'Adverse claim notice by Vikram Sharma flagged by AI DisputeGuard. Verification in progress.';
    }

    const licClaim = claims.find(c => c.assetId === 'asset-6');
    if (licClaim) {
      licClaim.status = 'Dispute Hold';
      licClaim.stageTitle = 'Beneficiary Objection under Review';
    }

    const aptAsset = assets.find(a => a.id === 'asset-11');
    if (aptAsset) {
      aptAsset.status = 'Under Dispute';
      aptAsset.settlementProgress = 15;
    }
    const licAsset = assets.find(a => a.id === 'asset-6');
    if (licAsset) {
      licAsset.status = 'Under Dispute';
      licAsset.settlementProgress = 25;
    }
  } else {
    // Scenario 2: Complex (default: no will, 4 Class-I heirs, NOCs needed)
    caseDetails.status = 'In Progress';
    caseDetails.progressPercentage = 58;
    caseDetails.activeDisputesCount = 0;
    disputes = [];
  }

  return {
    caseDetails,
    people,
    assets,
    institutions,
    claims,
    disputes,
    documents,
    auditTrail,
    institutionDashboard,
    impactMetrics,
  };
}

export * from './caseData';
export * from './peopleData';
export * from './assetsData';
export * from './institutionsData';
export * from './claimsData';
export * from './disputesData';
export * from './documentsData';
export * from './auditData';
export * from './institutionDashboardData';
export * from './impactData';
