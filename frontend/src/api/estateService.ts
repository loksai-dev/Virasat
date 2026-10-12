/**
 * Virasat Estate Service
 * 
 * Provides unified access to all estate settlement API endpoints.
 * Automatically switches between live Cloud Run API and local mock fixtures
 * based on API_CONFIG.USE_MOCKS.
 */

import { API_CONFIG } from './config';
import { api } from './client';
import { getMockData, VirasatMockDatabase } from '@/mocks';
import { CaseScenario } from '@/store/useVirasatStore';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const estateService = {
  // --------------------------------------------------------------------------
  // Cases & Overview
  // --------------------------------------------------------------------------
  async getCase(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').caseDetails;
    }
    return api.get(`/cases/${caseId}`);
  },

  async getOverview(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex');
    }
    return api.get(`/cases/${caseId}/overview`);
  },

  async resetCase(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { case_id: caseId, status: 'reset' };
    }
    return api.post(`/cases/${caseId}/reset`);
  },

  // --------------------------------------------------------------------------
  // Assets & Nominees
  // --------------------------------------------------------------------------
  async getAssets(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).assets;
    }
    return api.get(`/cases/${caseId}/assets`);
  },

  async createAsset(caseId: string, data: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { ...data, asset_id: `asset-${Date.now()}` };
    }
    return api.post(`/cases/${caseId}/assets`, data);
  },

  async updateAsset(assetId: string, updates: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { asset_id: assetId, ...updates };
    }
    return api.patch(`/assets/${assetId}`, updates);
  },

  async deleteAsset(assetId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { status: 'deleted', asset_id: assetId };
    }
    return api.delete(`/assets/${assetId}`);
  },

  async updateNominees(assetId: string, nominees: Array<{ person_id: string; share_pct: number }>) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { asset_id: assetId, nominees };
    }
    return api.put(`/assets/${assetId}/nominees`, { nominees });
  },

  // --------------------------------------------------------------------------
  // Family Heirs & Relationships
  // --------------------------------------------------------------------------
  async getPeople(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).people;
    }
    return api.get(`/cases/${caseId}/people`);
  },

  async createPerson(caseId: string, data: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { ...data, person_id: `p-${Date.now()}` };
    }
    return api.post(`/cases/${caseId}/people`, data);
  },

  async updatePerson(personId: string, updates: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { person_id: personId, ...updates };
    }
    return api.patch(`/people/${personId}`, updates);
  },

  async deletePerson(personId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { status: 'deleted', person_id: personId };
    }
    return api.delete(`/people/${personId}`);
  },

  async createRelationship(caseId: string, data: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { ...data, rel_id: `rel-${Date.now()}` };
    }
    return api.post(`/cases/${caseId}/relationships`, data);
  },

  async deleteRelationship(relId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { status: 'deleted', rel_id: relId };
    }
    return api.delete(`/relationships/${relId}`);
  },

  // --------------------------------------------------------------------------
  // Property Graph (Time-Travel with valid_at & known_at)
  // --------------------------------------------------------------------------
  async getGraph(caseId: string, validAt?: string, knownAt?: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return (getMockData('complex') as any).graphNodes || [];
    }
    const params = new URLSearchParams();
    if (validAt) params.set('valid_at', validAt);
    if (knownAt) params.set('known_at', knownAt);
    const qs = params.toString();
    return api.get(`/cases/${caseId}/graph${qs ? `?${qs}` : ''}`);
  },

  // --------------------------------------------------------------------------
  // Legal Shares, Will & What-If Simulator
  // --------------------------------------------------------------------------
  async getShares(caseId: string, scenario: 'current' | 'with_will' | 'no_will' = 'current') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return (getMockData('complex') as any).shares || [];
    }
    return api.get(`/cases/${caseId}/shares?scenario=${scenario}`);
  },

  async getWill(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return (getMockData('complex') as any).willDetails || {};
    }
    return api.get(`/cases/${caseId}/will`);
  },

  async updateWill(caseId: string, willData: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return willData;
    }
    return api.put(`/cases/${caseId}/will`, willData);
  },

  async runWhatIf(caseId: string, payload: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { ...payload, simulation_id: 'whatif-sim-1' };
    }
    return api.post(`/cases/${caseId}/whatif`, payload);
  },

  // --------------------------------------------------------------------------
  // Claims & Institution Packets
  // --------------------------------------------------------------------------
  async getClaims(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).claims;
    }
    return api.get(`/cases/${caseId}/claims`);
  },

  async getClaimPacket(claimId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { claim_id: claimId, checklist: [], packet_pdf_url: '#' };
    }
    return api.get(`/claims/${claimId}/packet`);
  },

  async approveClaim(claimId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { claim_id: claimId, approved: true, status: 'SUBMITTED' };
    }
    return api.post(`/claims/${claimId}/approve`);
  },

  async advanceClaim(claimId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { claim_id: claimId, old_status: 'SUBMITTED', new_status: 'IN_REVIEW', simulated: true };
    }
    return api.post(`/claims/${claimId}/advance`);
  },

  // --------------------------------------------------------------------------
  // Disputes & Caveat Sentinel
  // --------------------------------------------------------------------------
  async getDisputes(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).disputes;
    }
    return api.get(`/cases/${caseId}/disputes`);
  },

  async resolveDispute(disputeId: string, resolution: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { dispute_id: disputeId, status: 'RESOLVED', ...resolution };
    }
    return api.post(`/disputes/${disputeId}/resolve`, resolution);
  },

  // --------------------------------------------------------------------------
  // Documents & Vault
  // --------------------------------------------------------------------------
  async getDocuments(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).documents;
    }
    return api.get(`/cases/${caseId}/documents`);
  },

  async uploadDocument(caseId: string, file: File, docType: string = 'OTHER') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { doc_id: `doc-${Date.now()}`, original_name: file.name, status: 'EXTRACTED' };
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    return api.post(`/cases/${caseId}/documents`, formData);
  },

  async updateDocument(docId: string, updates: any) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { doc_id: docId, ...updates };
    }
    return api.patch(`/documents/${docId}`, updates);
  },

  async deleteDocument(docId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { status: 'deleted', doc_id: docId };
    }
    return api.delete(`/documents/${docId}`);
  },

  // --------------------------------------------------------------------------
  // Audit Trail & Cryptographic Verification
  // --------------------------------------------------------------------------
  async getAuditTrail(caseId: string, scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).auditTrail;
    }
    return api.get(`/cases/${caseId}/audit`);
  },

  async verifyAuditTrail(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { verified: true, chain_length: 24, head_hash: 'a7f9c2...b31e' };
    }
    return api.get(`/cases/${caseId}/audit/verify`);
  },

  // --------------------------------------------------------------------------
  // Consent Registry (DPDP Act Compliance)
  // --------------------------------------------------------------------------
  async getConsent(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return (getMockData('complex') as any).consentSummary || {};
    }
    return api.get(`/cases/${caseId}/consent`);
  },

  async updateConsent(caseId: string, personId: string, status: 'GIVEN' | 'REVOKED' | 'PENDING') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { case_id: caseId, person_id: personId, status };
    }
    return api.put(`/cases/${caseId}/consent`, { person_id: personId, status });
  },

  // --------------------------------------------------------------------------
  // Institution Console
  // --------------------------------------------------------------------------
  async getInstitutionDashboard() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').institutionDashboard;
    }
    return api.get('/institution/dashboard');
  },

  async getInstitutionClaims() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').claims;
    }
    return api.get('/institution/claims');
  },

  async getInstitutionSavings(claimsPerYear: number = 50000) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { claims_per_year: claimsPerYear, annual_savings_crores: 14.8 };
    }
    return api.get(`/institution/savings?claims_per_year=${claimsPerYear}`);
  },

  // --------------------------------------------------------------------------
  // Impact Metrics
  // --------------------------------------------------------------------------
  async getImpactMetrics() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').impactMetrics;
    }
    return api.get('/impact');
  },

  // --------------------------------------------------------------------------
  // Health & Readiness (for /dev/api-status)
  // --------------------------------------------------------------------------
  async getHealth() {
    const rootUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    const res = await fetch(`${rootUrl}/health`);
    return { ok: res.ok, status: res.status, data: await res.json() };
  },

  async getReady() {
    const rootUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    const res = await fetch(`${rootUrl}/ready`);
    return { ok: res.ok, status: res.status, data: await res.text() };
  },

  // --------------------------------------------------------------------------
  // Agent Runs & Orchestration
  // --------------------------------------------------------------------------
  async startRun(caseId: string, stages: string[] = ['all']) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { run_id: `run-${caseId}-${Date.now()}`, status: 'RUNNING', degraded: false };
    }
    return api.post<{ run_id: string; status: string; degraded: boolean }>(`/cases/${caseId}/run`, { stages });
  },

  async getLatestRun(caseId: string) {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return null;
    }
    return api.get<{
      run_id: string;
      case_id: string;
      status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
      started_at?: string;
      completed_at?: string;
      error_message?: string;
      degraded?: boolean;
      metrics?: Record<string, any>;
    }>(`/cases/${caseId}/runs/latest`);
  },

  async getRun(runId: string): Promise<{
    run_id: string;
    case_id?: string;
    status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    degraded?: boolean;
    metrics?: Record<string, any>;
  }> {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return { run_id: runId, status: 'DONE' };
    }
    return api.get(`/runs/${runId}`);
  },

  // --------------------------------------------------------------------------
  // Legacy / Bulk Access
  // --------------------------------------------------------------------------
  async getAll(scenario: CaseScenario = 'complex'): Promise<VirasatMockDatabase> {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario);
    }
    throw new Error('Bulk API endpoint not configured');
  },
};

export default estateService;
