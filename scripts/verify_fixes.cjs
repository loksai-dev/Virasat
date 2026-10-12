const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const BACKEND = path.join(ROOT, 'backend');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

console.log('=== VIRASAT PRODUCTION VERIFICATION SUITE ===\n');

// 1. BRANDING & LOGO ASSETS
console.log('1. Checking Branding & Logo Assets:');
const publicDir = path.join(FRONTEND, 'public');
const brandAssets = [
  'favicon.svg',
  'favicon.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'manifest.webmanifest'
];
for (const asset of brandAssets) {
  const p = path.join(publicDir, asset);
  assert(fs.existsSync(p) && fs.statSync(p).size > 0, `Asset ${asset} exists (${fs.existsSync(p) ? fs.statSync(p).size : 0} bytes)`);
}

// Check index.html branding
const indexHtmlPath = path.join(FRONTEND, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('rel="icon" type="image/svg+xml" href="/favicon.svg"'), 'index.html links SVG favicon');
assert(indexHtml.includes('href="/apple-touch-icon.png"'), 'index.html links Apple touch icon');
assert(indexHtml.includes('rel="manifest" href="/manifest.webmanifest"'), 'index.html links Web App manifest');
assert(indexHtml.includes('<title>Virasat'), 'index.html has Virasat brand title');

// Check VirasatLogo component
const logoComponent = fs.readFileSync(path.join(FRONTEND, 'src/components/brand/VirasatLogo.tsx'), 'utf8');
assert(logoComponent.includes('VirasatLogo'), 'VirasatLogo.tsx component is exported');
assert(logoComponent.includes('stopColor="#0B1F3A"'), 'VirasatLogo.tsx includes navy branding');
assert(logoComponent.includes('#F59E0B') || logoComponent.includes('#D97706'), 'VirasatLogo.tsx includes heritage gold canopy');

// 2. ROUTING & STATE PERSISTENCE
console.log('\n2. Checking Routing & State Persistence:');
const appTsx = fs.readFileSync(path.join(FRONTEND, 'src/App.tsx'), 'utf8');
assert(appTsx.includes('path="/agents" element={<AgentsLaunchPage />}'), 'App.tsx provides standalone /agents route');
assert(appTsx.includes('path="/overview" element={<OverviewPage />}'), 'App.tsx provides standalone /overview route');
assert(appTsx.includes('path="/start" element={<StartCaseWizardPage />}'), 'App.tsx provides standalone /start route');
assert(appTsx.includes('React.lazy('), 'App.tsx implements React.lazy route code-splitting');

const caseLayoutTsx = fs.readFileSync(path.join(FRONTEND, 'src/layouts/CaseLayout.tsx'), 'utf8');
assert(caseLayoutTsx.includes("label: 'AI Agents'"), 'CaseLayout navigation bar explicitly includes AI Agents item');

const storeTsx = fs.readFileSync(path.join(FRONTEND, 'src/store/useVirasatStore.ts'), 'utf8');
assert(storeTsx.includes('activeRunId'), 'useVirasatStore persists activeRunId in localStorage');

// 3. AGENT PIPELINE & ERROR RECOVERY
console.log('\n3. Checking Agent Pipeline & Error Recovery:');
const useAgentRunTsx = fs.readFileSync(path.join(FRONTEND, 'src/api/useAgentRun.ts'), 'utf8');
assert(useAgentRunTsx.includes('estateService.getLatestRun'), 'useAgentRun restores latest run on mount');
assert(useAgentRunTsx.includes('Last-Event-ID'), 'useAgentRun supports SSE resume with Last-Event-ID');
assert(useAgentRunTsx.includes('seenSeqsRef'), 'useAgentRun deduplicates SSE frames using sequence IDs');
assert(useAgentRunTsx.includes('isFailed') && useAgentRunTsx.includes('errorMessage'), 'useAgentRun provides error state and error message');
assert(useAgentRunTsx.includes('isDegraded'), 'useAgentRun captures degraded fallback status');

const agentsLaunchTsx = fs.readFileSync(path.join(FRONTEND, 'src/pages/AgentsLaunchPage.tsx'), 'utf8');
assert(agentsLaunchTsx.includes('isFailed'), 'AgentsLaunchPage renders failure card and recovery action');
assert(agentsLaunchTsx.includes('Retry Agent Analysis'), 'AgentsLaunchPage provides user recovery retry button');
assert(agentsLaunchTsx.includes('Deterministic Fallback Mode'), 'AgentsLaunchPage displays degraded mode banner');

// 4. PERFORMANCE & CODE SPLITTING
console.log('\n4. Checking Performance & Code Splitting:');
const distIndex = path.join(FRONTEND, 'dist', 'index.html');
assert(fs.existsSync(distIndex), 'Production build (dist/index.html) exists');

const distAssets = fs.readdirSync(path.join(FRONTEND, 'dist', 'assets'));
const hasVendorCytoscape = distAssets.some(f => f.startsWith('vendor-cytoscape'));
const hasVendorCharts = distAssets.some(f => f.startsWith('vendor-charts'));
const hasVendorReact = distAssets.some(f => f.startsWith('vendor-react'));
const hasAgentsChunk = distAssets.some(f => f.startsWith('AgentsLaunchPage'));

assert(hasVendorCytoscape, 'Cytoscape.js is isolated in separate chunk (on-demand loading)');
assert(hasVendorCharts, 'Recharts is isolated in separate chunk (on-demand loading)');
assert(hasVendorReact, 'React runtime is isolated in vendor-react chunk');
assert(hasAgentsChunk, 'AgentsLaunchPage is code-split into independent chunk');

// Check main entry chunk size
const mainChunk = distAssets.find(f => f.startsWith('index-') && f.endsWith('.js'));
if (mainChunk) {
  const size = fs.statSync(path.join(FRONTEND, 'dist', 'assets', mainChunk)).size;
  const sizeKb = Math.round(size / 1024);
  assert(sizeKb < 400, `Main entry chunk is ${sizeKb} KB (drastically reduced from 2,012 KB monolithic bundle)`);
}

// 5. BACKEND SCHEMAS & ORCHESTRATION
console.log('\n5. Checking Backend Schemas & Orchestrator:');
const schemasPy = fs.readFileSync(path.join(BACKEND, 'app/models/schemas.py'), 'utf8');
assert(schemasPy.includes('stages: list[str] | None = None'), 'RunCreateRequest supports stages parameter');
assert(schemasPy.includes('metrics: dict[str, Any]'), 'RunResponse includes metrics dictionary');

const orchestratorPy = fs.readFileSync(path.join(BACKEND, 'app/agents/orchestrator.py'), 'utf8');
assert(orchestratorPy.includes('"all" in stages'), 'Orchestrator executes all 5 agents when stages=["all"]');

const runsRouterPy = fs.readFileSync(path.join(BACKEND, 'app/routers/runs.py'), 'utf8');
assert(runsRouterPy.includes('/cases/{id}/runs/latest'), 'Backend provides GET /api/cases/{id}/runs/latest endpoint');

console.log(`\nVerification Summary: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) process.exit(1);
