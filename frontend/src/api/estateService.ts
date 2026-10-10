import { API_CONFIG } from './config';
import { getMockData, VirasatMockDatabase } from '@/mocks';
import { CaseScenario } from '@/store/useVirasatStore';

// Helper for simulated latency in mock mode
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const estateService = {
  /**
   * Fetch full case metadata
   */
  async getCase(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).caseDetails;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/cases/active`);
    if (!res.ok) throw new Error('Failed to fetch case details');
    return res.json();
  },

  /**
   * Fetch all 12 estate assets (banking, demat, property, loans)
   */
  async getAssets(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).assets;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/assets`);
    if (!res.ok) throw new Error('Failed to fetch estate assets');
    return res.json();
  },

  /**
   * Fetch legal heirs and nominees
   */
  async getPeople(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).people;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/people`);
    if (!res.ok) throw new Error('Failed to fetch heirs & family data');
    return res.json();
  },

  /**
   * Fetch claim dockets
   */
  async getClaims(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).claims;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/claims`);
    if (!res.ok) throw new Error('Failed to fetch claims');
    return res.json();
  },

  /**
   * Fetch integrated financial institutions
   */
  async getInstitutions() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').institutions;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/institutions`);
    if (!res.ok) throw new Error('Failed to fetch institutions');
    return res.json();
  },

  /**
   * Fetch active disputes and AI fraud alerts
   */
  async getDisputes(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).disputes;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/disputes`);
    if (!res.ok) throw new Error('Failed to fetch disputes');
    return res.json();
  },

  /**
   * Fetch vault documents
   */
  async getDocuments(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).documents;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  /**
   * Fetch audit trail
   */
  async getAuditTrail(scenario: CaseScenario = 'complex') {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario).auditTrail;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  /**
   * Fetch institution operations dashboard metrics
   */
  async getInstitutionDashboard() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').institutionDashboard;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/operations/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch institution dashboard');
    return res.json();
  },

  /**
   * Fetch impact & time savings metrics
   */
  async getImpactMetrics() {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData('complex').impactMetrics;
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}/impact`);
    if (!res.ok) throw new Error('Failed to fetch impact metrics');
    return res.json();
  },

  /**
   * Complete mock bundle for preloading or synchronized views
   */
  async getAll(scenario: CaseScenario = 'complex'): Promise<VirasatMockDatabase> {
    if (API_CONFIG.USE_MOCKS) {
      await delay(API_CONFIG.SIMULATED_DELAY_MS);
      return getMockData(scenario);
    }
    throw new Error('Bulk API endpoint not configured');
  },
};
