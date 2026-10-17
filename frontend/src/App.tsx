import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { PublicLayout } from './layouts/PublicLayout';
import { CaseLayout } from './layouts/CaseLayout';
import { InstitutionLayout } from './layouts/InstitutionLayout';
import { ensureAnonymousSession } from './lib/firebase';

// Lazy-loaded page chunks for maximum performance and sub-second route rendering
const LandingPage = React.lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const DemoExperiencePage = React.lazy(() => import('./pages/DemoExperiencePage').then((m) => ({ default: m.DemoExperiencePage })));
const StartCaseWizardPage = React.lazy(() => import('./pages/StartCaseWizardPage').then((m) => ({ default: m.StartCaseWizardPage })));
const AgentsLaunchPage = React.lazy(() => import('./pages/AgentsLaunchPage').then((m) => ({ default: m.AgentsLaunchPage })));
const OverviewPage = React.lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const EstateAssetsPage = React.lazy(() => import('./pages/EstateAssetsPage').then((m) => ({ default: m.EstateAssetsPage })));
const FamilyHeirsPage = React.lazy(() => import('./pages/FamilyHeirsPage').then((m) => ({ default: m.FamilyHeirsPage })));
const ClaimsPage = React.lazy(() => import('./pages/ClaimsPage').then((m) => ({ default: m.ClaimsPage })));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const AskVirasatPage = React.lazy(() => import('./pages/AskVirasatPage').then((m) => ({ default: m.AskVirasatPage })));
const InstitutionDashboardPage = React.lazy(() => import('./pages/InstitutionDashboardPage').then((m) => ({ default: m.InstitutionDashboardPage })));
const HeirSharesPage = React.lazy(() => import('./pages/HeirSharesPage').then((m) => ({ default: m.HeirSharesPage })));
const DisputesPage = React.lazy(() => import('./pages/DisputesPage').then((m) => ({ default: m.DisputesPage })));
const ImpactPage = React.lazy(() => import('./pages/ImpactPage').then((m) => ({ default: m.ImpactPage })));
const UnderTheHoodPage = React.lazy(() => import('./pages/UnderTheHoodPage').then((m) => ({ default: m.UnderTheHoodPage })));
const ConsentAuditPage = React.lazy(() => import('./pages/ConsentAuditPage').then((m) => ({ default: m.ConsentAuditPage })));
const DevApiStatusPage = React.lazy(() => import('./pages/DevApiStatusPage').then((m) => ({ default: m.DevApiStatusPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-3">
    <div className="w-10 h-10 rounded-full border-2 border-teal-500/20 border-t-teal-600 animate-spin" />
    <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">
      Loading Virasat Workspace...
    </span>
  </div>
);

export function App() {
  useEffect(() => {
    // Attempt anonymous sign-in in the background
    ensureAnonymousSession().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Website / Landing Route & Demo Experience Selector */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/demo" element={<DemoExperiencePage />} />
              <Route path="/impact" element={<ImpactPage />} />
              <Route path="/how-it-works" element={<UnderTheHoodPage />} />
              <Route path="/under-the-hood" element={<UnderTheHoodPage />} />
              <Route path="/architecture" element={<UnderTheHoodPage />} />
              <Route path="/dev/api-status" element={<DevApiStatusPage />} />
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
              <Route path="/start" element={<StartCaseWizardPage />} />
              <Route path="/agents" element={<AgentsLaunchPage />} />
              <Route path="/overview" element={<OverviewPage />} />
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
              <Route path="/ask-virasat" element={<AskVirasatPage />} />
              <Route path="/ask" element={<AskVirasatPage />} />
            </Route>

            {/* Bank & Insurer Institutional Console */}
            <Route path="/institution" element={<InstitutionLayout />}>
              <Route index element={<InstitutionDashboardPage />} />
            </Route>

            {/* Fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
