import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollToTop } from './components';
import { PublicLayout } from './layouts/PublicLayout';
import { CaseLayout } from './layouts/CaseLayout';
import { InstitutionLayout } from './layouts/InstitutionLayout';

import {
  LandingPage,
  DemoExperiencePage,
  StartCaseWizardPage,
  AgentsLaunchPage,
  OverviewPage,
  EstateAssetsPage,
  FamilyHeirsPage,
  ClaimsPage,
  DocumentsPage,
  AskVirasatPage,
  InstitutionDashboardPage,
  HeirSharesPage,
  DisputesPage,
  ImpactPage,
  UnderTheHoodPage,
  ConsentAuditPage,
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Website / Landing Route & Demo Experience Selector */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demo" element={<DemoExperiencePage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/how-it-works" element={<UnderTheHoodPage />} />
            <Route path="/under-the-hood" element={<UnderTheHoodPage />} />
            <Route path="/architecture" element={<UnderTheHoodPage />} />
          </Route>

          {/* Family Case Settlement Workspace by Case ID (e.g. /case/:caseId/start) */}
          <Route path="/case/:caseId" element={<CaseLayout />}>
            <Route index element={<Navigate to="start" replace />} />
            <Route path="start" element={<StartCaseWizardPage />} />
            <Route path="agents" element={<AgentsLaunchPage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="assets" element={<EstateAssetsPage />} />
            <Route path="assets/:assetId" element={<EstateAssetsPage />} />
            <Route path="family" element={<FamilyHeirsPage />} />
            <Route path="family/shares" element={<HeirSharesPage />} />
            <Route path="heirs" element={<FamilyHeirsPage />} />
            <Route path="heirs/shares" element={<HeirSharesPage />} />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="claims/:claimId" element={<ClaimsPage />} />
            <Route path="disputes" element={<DisputesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:docId" element={<DocumentsPage />} />
            <Route path="audit" element={<ConsentAuditPage />} />
            <Route path="consent" element={<ConsentAuditPage />} />
            <Route path="ask-virasat" element={<AskVirasatPage />} />
            <Route path="ask" element={<AskVirasatPage />} />
          </Route>

          {/* Direct /case Routes */}
          <Route path="/case" element={<CaseLayout />}>
            <Route index element={<Navigate to="/case/VR-2026-0142/start" replace />} />
            <Route path="start" element={<StartCaseWizardPage />} />
            <Route path="agents" element={<AgentsLaunchPage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="assets" element={<EstateAssetsPage />} />
            <Route path="assets/:assetId" element={<EstateAssetsPage />} />
            <Route path="family" element={<FamilyHeirsPage />} />
            <Route path="family/shares" element={<HeirSharesPage />} />
            <Route path="heirs" element={<FamilyHeirsPage />} />
            <Route path="heirs/shares" element={<HeirSharesPage />} />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="claims/:claimId" element={<ClaimsPage />} />
            <Route path="disputes" element={<DisputesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:docId" element={<DocumentsPage />} />
            <Route path="audit" element={<ConsentAuditPage />} />
            <Route path="consent" element={<ConsentAuditPage />} />
            <Route path="ask-virasat" element={<AskVirasatPage />} />
            <Route path="ask" element={<AskVirasatPage />} />
          </Route>

          {/* Route aliases for standalone paths */}
          <Route element={<CaseLayout />}>
            <Route path="/assets" element={<EstateAssetsPage />} />
            <Route path="/assets/:assetId" element={<EstateAssetsPage />} />
            <Route path="/heirs" element={<FamilyHeirsPage />} />
            <Route path="/heirs/shares" element={<HeirSharesPage />} />
            <Route path="/family" element={<FamilyHeirsPage />} />
            <Route path="/family/shares" element={<HeirSharesPage />} />
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/claims/:claimId" element={<ClaimsPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/:docId" element={<DocumentsPage />} />
            <Route path="/audit" element={<ConsentAuditPage />} />
            <Route path="/consent" element={<ConsentAuditPage />} />
            <Route path="/ask" element={<AskVirasatPage />} />
          </Route>

          {/* Bank & Insurer Institutional Console */}
          <Route path="/institution" element={<InstitutionLayout />}>
            <Route index element={<InstitutionDashboardPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
