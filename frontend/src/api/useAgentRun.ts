import { useState, useEffect, useRef, useCallback } from 'react';

export type AgentId = 'intake' | 'discovery' | 'legal' | 'packager' | 'dispute' | 'orchestrator';
export type AgentStatus = 'queued' | 'working' | 'done';

export interface AgentState {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  activity: string;
  progress: number; // 0 to 100
  color: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  agentId: AgentId;
  agentName: string;
  message: string;
  citation?: string;
  isMilestone?: boolean;
}

export interface AgentRunEvent {
  type: 'agent_started' | 'agent_message' | 'agent_done' | 'progress' | 'run_done';
  agentId?: AgentId;
  message?: string;
  activity?: string;
  citation?: string;
  progress?: number;
  assetsLocated?: number;
  totalAssets?: number;
  percent?: number;
  timestamp?: string;
}

const INITIAL_AGENTS: AgentState[] = [
  {
    id: 'intake',
    name: 'Intake Agent',
    role: 'Document Ingestion & Municipal Audit',
    status: 'queued',
    activity: 'Waiting for certificate ingest...',
    progress: 0,
    color: '#14B8A6', // Teal
  },
  {
    id: 'discovery',
    name: 'Asset Discovery Agent',
    role: 'Multi-Gateway Folio Scanner',
    status: 'queued',
    activity: 'Standing by for PAN & Aadhaar query...',
    progress: 0,
    color: '#C9A227', // Gold
  },
  {
    id: 'legal',
    name: 'Legal Eligibility Agent',
    role: 'Kinship & Succession Graph Engine',
    status: 'queued',
    activity: 'Waiting for family tree graph...',
    progress: 0,
    color: '#8B5CF6', // Purple
  },
  {
    id: 'packager',
    name: 'Claims Packager Agent',
    role: 'Docket & Transmission Generator',
    status: 'queued',
    activity: 'Waiting for asset folios...',
    progress: 0,
    color: '#0284C7', // Sky Blue
  },
  {
    id: 'dispute',
    name: 'Fraud & Dispute Sentinel',
    role: 'AI DisputeGuard & Caveat Scanner',
    status: 'queued',
    activity: 'Monitoring adverse claims...',
    progress: 0,
    color: '#DC2626', // Red
  },
  {
    id: 'orchestrator',
    name: 'Settlement Orchestrator',
    role: 'Autonomous Mesh Coordinator',
    status: 'queued',
    activity: 'Initializing autonomous mesh...',
    progress: 0,
    color: '#0B1F3A', // Navy
  },
];

// 20-second simulated event script
interface ScriptedEvent {
  timeMs: number;
  event: AgentRunEvent;
}

const SCRIPTED_TIMELINE: ScriptedEvent[] = [
  {
    timeMs: 500,
    event: {
      type: 'agent_started',
      agentId: 'orchestrator',
      activity: 'Deploying autonomous worker nodes across secure VPC...',
      message: 'Orchestrator initialized autonomous mesh for Case VR-2026-0142.',
      citation: 'Virasat Core Engine v2.6',
    },
  },
  {
    timeMs: 1200,
    event: {
      type: 'agent_started',
      agentId: 'intake',
      activity: 'Verifying GHMC death certificate cryptographic seal...',
      message: 'Ingested death certificate GHMC/2026/004812 for Late Ramesh Sharma.',
      citation: 'DigiLocker National Gateway',
    },
  },
  {
    timeMs: 2200,
    event: {
      type: 'agent_message',
      agentId: 'intake',
      activity: 'SHA-256 seal verified against Telangana municipal registry...',
      message: 'Certificate authenticity confirmed (100% hash match). Extracted PAN: ABCPS4819M.',
      citation: 'Telangana MeeSeva Registry',
      progress: 60,
    },
  },
  {
    timeMs: 3400,
    event: {
      type: 'progress',
      assetsLocated: 1,
      totalAssets: 12,
      percent: 10,
    },
  },
  {
    timeMs: 3800,
    event: {
      type: 'agent_done',
      agentId: 'intake',
      message: 'Intake verification completed. Metadata dispatched to Asset Discovery.',
    },
  },
  {
    timeMs: 4200,
    event: {
      type: 'agent_started',
      agentId: 'discovery',
      activity: 'Querying CDSL & NSDL depository databases for demat folios...',
      message: 'Initiated multi-gateway asset scan with PAN ABCPS4819M.',
      citation: 'CDSL / NSDL Gateway',
    },
  },
  {
    timeMs: 5200,
    event: {
      type: 'agent_message',
      agentId: 'discovery',
      activity: 'Found Zerodha Demat account (DP-12081600-4491)...',
      message: 'Located ₹45,00,000 equity portfolio & Sovereign Gold Bonds (Zerodha Broking).',
      citation: 'CDSL Depository API',
      progress: 30,
    },
  },
  {
    timeMs: 6200,
    event: {
      type: 'progress',
      assetsLocated: 3,
      totalAssets: 12,
      percent: 25,
    },
  },
  {
    timeMs: 7000,
    event: {
      type: 'agent_message',
      agentId: 'discovery',
      activity: 'Querying CAMS & KFintech for mutual fund folios...',
      message: 'Discovered SBI Mutual Fund Folio MF-88319014 (Valuation ₹25,00,000).',
      citation: 'CAMS MF Central',
      progress: 55,
    },
  },
  {
    timeMs: 8000,
    event: {
      type: 'progress',
      assetsLocated: 6,
      totalAssets: 12,
      percent: 50,
    },
  },
  {
    timeMs: 8800,
    event: {
      type: 'agent_message',
      agentId: 'discovery',
      activity: 'Querying EPFO Regional Office & SBI PPF branch...',
      message: 'Retrieved EPF balance ₹28,00,000 (UAN 100488921892) & SBI PPF ₹16,00,000.',
      citation: 'EPFO Member Portal',
      progress: 80,
    },
  },
  {
    timeMs: 9800,
    event: {
      type: 'agent_started',
      agentId: 'legal',
      activity: 'Reading Section 8 of the Hindu Succession Act, 1956...',
      message: 'Building kinship graph for Late Ramesh Sharma (Intestate succession).',
      citation: 'Hindu Succession Act §8',
    },
  },
  {
    timeMs: 10800,
    event: {
      type: 'progress',
      assetsLocated: 9,
      totalAssets: 12,
      percent: 75,
    },
  },
  {
    timeMs: 11600,
    event: {
      type: 'agent_message',
      agentId: 'discovery',
      activity: 'Cataloging Banking FDs, Locker, and HDFC Home Loan...',
      message: 'All 12 asset holdings cataloged. Total Gross: ₹3.12 Cr; Liability: -₹28 Lakhs; Net: ₹2.84 Cr.',
      citation: 'Core Banking CBS Gateways',
      progress: 100,
    },
  },
  {
    timeMs: 12400,
    event: {
      type: 'agent_done',
      agentId: 'discovery',
      message: 'Asset Discovery Agent finished. 12 of 12 folios cataloged.',
    },
  },
  {
    timeMs: 13000,
    event: {
      type: 'progress',
      assetsLocated: 12,
      totalAssets: 12,
      percent: 90,
    },
  },
  {
    timeMs: 13600,
    event: {
      type: 'agent_message',
      agentId: 'legal',
      activity: 'Resolving statutory shares: Sunita (40%), Arjun (20%), Priya (20%), Kamala (20%)...',
      message: 'Identified 4 Class-I heirs with statutory entitlement. Kinship graph resolved.',
      citation: 'Spanner Graph Kinship Model',
      progress: 100,
    },
  },
  {
    timeMs: 14400,
    event: {
      type: 'agent_done',
      agentId: 'legal',
      message: 'Legal Eligibility Agent verified 4 Class-I heirs.',
    },
  },
  {
    timeMs: 14800,
    event: {
      type: 'agent_started',
      agentId: 'dispute',
      activity: 'Auditing caveat registry and informal brother memorandum...',
      message: 'Scanning for conflicting testamentary claims and kinship objections.',
      citation: 'Telangana High Court Caveat Registry',
    },
  },
  {
    timeMs: 15600,
    event: {
      type: 'agent_message',
      agentId: 'dispute',
      activity: 'Generating Section 8 Statutory Precedence Rebuttal Docket...',
      message: 'Adverse claim by brother Vikram analyzed: Excluded by living Class-I heirs under Section 8.',
      citation: 'Indian Registration Act §17',
      progress: 100,
    },
  },
  {
    timeMs: 16400,
    event: {
      type: 'agent_done',
      agentId: 'dispute',
      message: 'Fraud & Dispute Sentinel completed. Precedence protection active.',
    },
  },
  {
    timeMs: 16800,
    event: {
      type: 'agent_started',
      agentId: 'packager',
      activity: 'Auto-filling Annexure-A, Form 3783, Form T3 & indemnity bonds...',
      message: 'Generating transmission packets across SBI, HDFC, ICICI, LIC, Zerodha.',
      citation: 'RBI Deceased Depositors Master Circular',
    },
  },
  {
    timeMs: 18000,
    event: {
      type: 'agent_message',
      agentId: 'packager',
      activity: 'Franked indemnity bond and digital dockets compiled...',
      message: '12 institutional claim dockets compiled and ready for one-click submission.',
      citation: 'IRDAI & SEBI Standardized Formats',
      progress: 100,
    },
  },
  {
    timeMs: 18800,
    event: {
      type: 'agent_done',
      agentId: 'packager',
      message: 'Claims Packager generated all 12 transmission dockets.',
    },
  },
  {
    timeMs: 19400,
    event: {
      type: 'agent_done',
      agentId: 'orchestrator',
      activity: 'Mesh completed successfully • Net ₹2.84 Cr estate prepared',
      message: 'All 6 agents completed tasks. Master dossier sealed with SHA-256 hash.',
      progress: 100,
    },
  },
  {
    timeMs: 20000,
    event: {
      type: 'run_done',
      message: 'Estate discovery and transmission setup completed in 20.0s.',
      assetsLocated: 12,
      totalAssets: 12,
      percent: 100,
    },
  },
];

import { API_CONFIG } from './config';
import { estateService } from './estateService';
import { getFirebaseIdToken } from '@/lib/firebase';
import { useVirasatStore, RunExecutionStatus } from '@/store/useVirasatStore';

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'closed' | 'error';

export function normalizeCaseId(rawId?: string): string {
  if (!rawId) return 'VR-2026-0142';
  const s = rawId.trim();
  if (s.toUpperCase() === 'VR-2026-MEHTA' || s.toLowerCase() === 'mehta') {
    return 'VR-2026-0187';
  }
  if (s.toUpperCase() === 'VR-2026-SHARMA' || s.toLowerCase() === 'sharma') {
    return 'VR-2026-0142';
  }
  return s;
}

export function useAgentRun(caseIdProp?: string, runIdProp?: string) {
  const { 
    caseId: storeCaseId, 
    activeRunId: storeRunId, 
    setActiveRunId,
    setActiveRunState
  } = useVirasatStore();

  const rawCaseId = caseIdProp && !caseIdProp.startsWith('run-') 
    ? caseIdProp 
    : storeCaseId || 'VR-2026-0142';

  const canonicalCaseId = normalizeCaseId(rawCaseId);
  const isMehtaCase = canonicalCaseId.includes('0187') || rawCaseId.toLowerCase().includes('mehta');
  const defaultTotalAssets = isMehtaCase ? 8 : 12;

  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [assetsLocated, setAssetsLocated] = useState<number>(isMehtaCase ? 8 : 12);
  const [totalAssets] = useState<number>(defaultTotalAssets);
  const [overallPercent, setOverallPercent] = useState<number>(100);
  
  // Normalized single-source execution status
  const [runStatus, setRunStatus] = useState<RunExecutionStatus>('DONE');
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(true);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(20);
  const [sseConnection, setSseConnection] = useState<SSEConnectionStatus>('closed');
  
  const [activeRunId, setLocalRunId] = useState<string | null>(
    runIdProp && !runIdProp.startsWith('run-VR-') ? runIdProp : storeRunId
  );

  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastEventIdRef = useRef<number | null>(null);
  const seenSeqsRef = useRef<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isInitializingRef = useRef<boolean>(false);

  // Stop elapsed timer cleanly
  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  // Start elapsed timer
  const startElapsedTimer = useCallback((initialSecs: number = 0) => {
    stopElapsedTimer();
    startTimeRef.current = Date.now() - initialSecs * 1000;
    elapsedTimerRef.current = setInterval(() => {
      if (startTimeRef.current > 0) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 500);
  }, [stopElapsedTimer]);

  // Append log item with deduplication and cap at 200 items
  const addLogItem = useCallback((item: ActivityLogItem) => {
    setLogs((prev) => {
      if (prev.some((p) => p.id === item.id || (p.agentId === item.agentId && p.message === item.message))) {
        return prev;
      }
      const next = [...prev, item];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const mapAgentName = useCallback((raw?: string): AgentId => {
    const s = (raw || '').toLowerCase();
    if (s.includes('extract') || s.includes('intake')) return 'intake';
    if (s.includes('discov') || s.includes('asset')) return 'discovery';
    if (s.includes('share') || s.includes('legal') || s.includes('heir') || s.includes('kinship')) return 'legal';
    if (s.includes('claim') || s.includes('packag')) return 'packager';
    if (s.includes('fraud') || s.includes('dispute') || s.includes('sentinel')) return 'dispute';
    return 'orchestrator';
  }, []);

  const processEvent = useCallback((event: AgentRunEvent) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (event.type === 'agent_started' && event.agentId) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? { ...a, status: 'working', activity: event.activity || a.activity, progress: Math.max(a.progress, 25) }
            : a
        )
      );
      if (event.message) {
        addLogItem({
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: timeStr,
          agentId: event.agentId!,
          agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
          message: event.message!,
          citation: event.citation,
        });
      }
    } else if (event.type === 'agent_message' && event.agentId) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? {
                ...a,
                status: 'working',
                activity: event.activity || a.activity,
                progress: event.progress !== undefined ? event.progress : Math.min(a.progress + 25, 95),
              }
            : a
        )
      );
      if (event.message) {
        addLogItem({
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: timeStr,
          agentId: event.agentId!,
          agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
          message: event.message!,
          citation: event.citation,
        });
      }
    } else if (event.type === 'agent_done' && event.agentId) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? { ...a, status: 'done', activity: 'Completed successfully ✓', progress: 100 }
            : a
        )
      );
      if (event.message) {
        addLogItem({
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: timeStr,
          agentId: event.agentId!,
          agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
          message: event.message!,
          citation: event.citation,
          isMilestone: true,
        });
      }
    } else if (event.type === 'progress') {
      if (event.assetsLocated !== undefined) setAssetsLocated(event.assetsLocated);
      if (event.percent !== undefined) setOverallPercent(event.percent);
      if (event.message) {
        addLogItem({
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: timeStr,
          agentId: event.agentId || 'orchestrator',
          agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Orchestrator',
          message: event.message!,
          citation: event.citation,
        });
      }
    } else if (event.type === 'run_done') {
      stopElapsedTimer();
      setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' })));
      setAssetsLocated((prev) => Math.max(prev, defaultTotalAssets));
      setOverallPercent(100);
      setRunStatus('DONE');
      setIsRunning(false);
      setIsCompleted(true);
      setIsFailed(false);
      setSseConnection('closed');
      setActiveRunState('DONE', 0);
      if (event.message) {
        addLogItem({
          id: `evt-done-${Date.now()}`,
          timestamp: timeStr,
          agentId: 'orchestrator',
          agentName: 'Settlement Orchestrator',
          message: event.message!,
          citation: 'Master Estate Dossier Ready',
          isMilestone: true,
        });
      }
    }
  }, [addLogItem, defaultTotalAssets, setActiveRunState, stopElapsedTimer]);

  const populateSynthesizedLogs = useCallback((metrics: Record<string, any> = {}, degraded = false) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const assetsFound = metrics.assets_located ?? defaultTotalAssets;
    const heirsFound = metrics.heirs_verified ?? (isMehtaCase ? 2 : 4);
    const claimsFound = metrics.claims_prepared ?? defaultTotalAssets;
    const disputesFound = metrics.disputes_found ?? (isMehtaCase ? 0 : 1);

    setLogs([
      {
        id: 'synth-1',
        timestamp: timeStr,
        agentId: 'orchestrator',
        agentName: 'Settlement Orchestrator',
        message: `Restored verified run session for Case ${rawCaseId}.`,
        citation: degraded ? 'Deterministic Rules Engine (Degraded Mode)' : 'Virasat Core Engine v2.6',
        isMilestone: true,
      },
      {
        id: 'synth-2',
        timestamp: timeStr,
        agentId: 'intake',
        agentName: 'Intake Agent',
        message: 'Municipal death certificate authenticated and identity credentials verified against DigiLocker registry.',
        citation: 'Telangana MeeSeva & DigiLocker Gateway',
      },
      {
        id: 'synth-3',
        timestamp: timeStr,
        agentId: 'discovery',
        agentName: 'Asset Discovery Agent',
        message: `Cataloged ${assetsFound} financial asset holdings across Banking CBS, CDSL, NSDL, CAMS, and EPFO gateways.`,
        citation: 'Depository & MF Central APIs',
      },
      {
        id: 'synth-4',
        timestamp: timeStr,
        agentId: 'legal',
        agentName: 'Legal Eligibility Agent',
        message: `Kinship tree graph validated: ${heirsFound} Class-I legal heirs entitled under Section 8 of the Hindu Succession Act.`,
        citation: 'Spanner Property Graph Kinship Engine',
      },
      {
        id: 'synth-5',
        timestamp: timeStr,
        agentId: 'dispute',
        agentName: 'Fraud & Dispute Sentinel',
        message: `${disputesFound} potential conflict/caveat evaluated. Statutory Class-I precedence protection confirmed.`,
        citation: 'Telangana High Court Caveat Registry',
      },
      {
        id: 'synth-6',
        timestamp: timeStr,
        agentId: 'packager',
        agentName: 'Claims Packager Agent',
        message: `Generated ${claimsFound} institutional transmission claim packets with indemnity bonds and statutory affidavits.`,
        citation: 'RBI, SEBI & IRDAI Master Standard Formats',
        isMilestone: true,
      },
      {
        id: 'synth-7',
        timestamp: timeStr,
        agentId: 'orchestrator',
        agentName: 'Settlement Orchestrator',
        message: 'Autonomous pipeline finished: Master dossier sealed with SHA-256 hash.',
        citation: 'Estate Settlement Dossier Sealed',
        isMilestone: true,
      },
    ]);
  }, [defaultTotalAssets, isMehtaCase, rawCaseId]);

  const streamLiveRun = useCallback(async (targetRunId: string, fromSeq: number = 0) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setSseConnection('connecting');

    try {
      const token = await getFirebaseIdToken();
      const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
      const sseUrl = `${base}/runs/${targetRunId}/events`;

      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      if (fromSeq > 0) {
        headers['Last-Event-ID'] = String(fromSeq);
      }

      const response = await fetch(sseUrl, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream connection failed: HTTP ${response.status}`);
      }

      setSseConnection('connected');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (isMountedRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const lines = frame.split('\n');
          let seqId: number | null = null;
          let eventType = '';
          let dataRaw = '';

          for (const line of lines) {
            if (line.startsWith('id:')) {
              seqId = parseInt(line.replace('id:', '').trim(), 10);
            } else if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataRaw = line.replace('data:', '').trim();
            }
          }

          if (seqId !== null && !isNaN(seqId)) {
            if (seenSeqsRef.current.has(seqId)) continue;
            seenSeqsRef.current.add(seqId);
            lastEventIdRef.current = seqId;
          }

          if (dataRaw) {
            try {
              const parsed = JSON.parse(dataRaw);
              const agentId = mapAgentName(parsed.agent);
              const citations = Array.isArray(parsed.citations)
                ? parsed.citations.join('; ')
                : parsed.citation || '';

              if (parsed.degraded) {
                setIsDegraded(true);
              }

              if (eventType === 'run_done' || parsed.type === 'run_done') {
                processEvent({
                  type: 'run_done',
                  message: parsed.message || 'Pipeline successfully settled all assets.',
                });
                if (parsed.payload?.assets_located) {
                  setAssetsLocated(parsed.payload.assets_located);
                }
                return;
              } else if (eventType === 'run_failed' || parsed.type === 'run_failed') {
                stopElapsedTimer();
                setRunStatus('FAILED');
                setIsRunning(false);
                setIsCompleted(false);
                setIsFailed(true);
                setSseConnection('closed');
                setActiveRunState('FAILED', 0);
                setErrorMessage(parsed.message || 'Agent execution encountered an unrecoverable failure.');
                return;
              } else if (eventType === 'agent_started' || parsed.type === 'agent_started') {
                processEvent({
                  type: 'agent_started',
                  agentId,
                  activity: parsed.message || 'Starting stage...',
                  message: parsed.message,
                  citation: citations,
                });
              } else if (eventType === 'agent_done' || parsed.type === 'agent_done') {
                processEvent({
                  type: 'agent_done',
                  agentId,
                  message: parsed.message || 'Completed stage.',
                });
              } else if (eventType === 'progress' || parsed.type === 'progress') {
                const pct = parsed.progress ? Math.round(parsed.progress * 100) : undefined;
                processEvent({
                  type: 'progress',
                  agentId,
                  message: parsed.message,
                  percent: pct,
                  assetsLocated: parsed.payload?.assets_located,
                });
              } else {
                processEvent({
                  type: 'agent_message',
                  agentId,
                  activity: parsed.message || 'Analyzing...',
                  message: parsed.message,
                  citation: citations,
                  progress: parsed.progress ? Math.round(parsed.progress * 100) : undefined,
                });
              }
            } catch {
              // Ignore malformed frames
            }
          }
        }
      }

      // Stream terminated normally
      setSseConnection('closed');
      try {
        const runStatusRes = await estateService.getRun(targetRunId);
        if (runStatusRes.status === 'DONE') {
          stopElapsedTimer();
          setRunStatus('DONE');
          setIsRunning(false);
          setIsCompleted(true);
          setIsFailed(false);
          setOverallPercent(100);
          setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' })));
          setActiveRunState('DONE', 0);
          if (runStatusRes.metrics?.assets_located) {
            setAssetsLocated(runStatusRes.metrics.assets_located);
          }
        } else if (runStatusRes.status === 'FAILED') {
          stopElapsedTimer();
          setRunStatus('FAILED');
          setIsRunning(false);
          setIsCompleted(false);
          setIsFailed(true);
          setErrorMessage(runStatusRes.error_message || 'Agent run failed.');
          setActiveRunState('FAILED', 0);
        }
      } catch {
        // Keep state
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[useAgentRun] SSE stream finished or disconnected:', err.message);
        setSseConnection('disconnected');
        // Verify current run status via REST
        try {
          const runStatusRes = await estateService.getRun(targetRunId);
          if (runStatusRes.status === 'DONE') {
            stopElapsedTimer();
            setRunStatus('DONE');
            setIsRunning(false);
            setIsCompleted(true);
            setIsFailed(false);
            setOverallPercent(100);
            setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' })));
            setActiveRunState('DONE', 0);
          } else if (runStatusRes.status === 'FAILED') {
            stopElapsedTimer();
            setRunStatus('FAILED');
            setIsRunning(false);
            setIsCompleted(false);
            setIsFailed(true);
            setErrorMessage(runStatusRes.error_message || 'Agent run failed.');
            setActiveRunState('FAILED', 0);
          }
        } catch {
          // Keep current state
        }
      }
    }
  }, [mapAgentName, processEvent, setActiveRunState, stopElapsedTimer]);

  const startRun = useCallback(async (_force = false) => {
    setIsLoadingInitial(false);
    setRunStatus('RUNNING');
    setIsRunning(true);
    setIsCompleted(false);
    setIsFailed(false);
    setIsDegraded(false);
    setErrorMessage(null);
    setOverallPercent(5);
    setAgents(INITIAL_AGENTS);
    setLogs([]);
    seenSeqsRef.current.clear();
    lastEventIdRef.current = null;
    startElapsedTimer(0);
    setActiveRunState('RUNNING', 1);

    if (API_CONFIG.USE_MOCKS) {
      const timeouts: Array<ReturnType<typeof setTimeout>> = [];
      SCRIPTED_TIMELINE.forEach(({ timeMs, event }) => {
        const t = setTimeout(() => {
          if (isMountedRef.current) processEvent(event);
        }, timeMs);
        timeouts.push(t);
      });
      return;
    }

    try {
      const res = await estateService.startRun(canonicalCaseId, ['all']);
      if (res?.run_id) {
        setLocalRunId(res.run_id);
        setActiveRunId(res.run_id);
        if (res.degraded) setIsDegraded(true);
        await streamLiveRun(res.run_id, 0);
      }
    } catch (err: any) {
      console.error('[useAgentRun] startRun failed:', err);
      stopElapsedTimer();
      setRunStatus('FAILED');
      setIsRunning(false);
      setIsCompleted(false);
      setIsFailed(true);
      setErrorMessage(err.message || 'Failed to start agent run.');
      setActiveRunState('FAILED', 0);
    }
  }, [canonicalCaseId, processEvent, setActiveRunId, setActiveRunState, startElapsedTimer, stopElapsedTimer, streamLiveRun]);

  useEffect(() => {
    isMountedRef.current = true;

    async function initializeOrRestore() {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;
      setIsLoadingInitial(true);

      if (API_CONFIG.USE_MOCKS) {
        startRun(false);
        return;
      }

      try {
        let latestRun: any = null;
        try {
          latestRun = await estateService.getLatestRun(canonicalCaseId);
        } catch {
          // 404 means no run exists for this case yet
        }

        if (latestRun && latestRun.run_id) {
          const rid = latestRun.run_id;
          setLocalRunId(rid);
          setActiveRunId(rid);
          if (latestRun.degraded) setIsDegraded(true);

          if (latestRun.status === 'DONE') {
            stopElapsedTimer();
            setRunStatus('DONE');
            setIsRunning(false);
            setIsCompleted(true);
            setIsFailed(false);
            setOverallPercent(100);
            setAssetsLocated(latestRun.metrics?.assets_located ?? defaultTotalAssets);
            setAgents((prev) =>
              prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' }))
            );
            // Derive duration from run timestamps or metrics
            if (latestRun.created_at && latestRun.finished_at) {
              const dur = Math.max(1, Math.round((new Date(latestRun.finished_at).getTime() - new Date(latestRun.created_at).getTime()) / 1000));
              setElapsedSeconds(dur);
            } else if (latestRun.metrics?.duration_seconds) {
              setElapsedSeconds(latestRun.metrics.duration_seconds);
            } else {
              setElapsedSeconds(20);
            }
            populateSynthesizedLogs(latestRun.metrics, !!latestRun.degraded);
            setIsLoadingInitial(false);
            setSseConnection('closed');
            setActiveRunState('DONE', 0);
            return;
          }

          if (latestRun.status === 'RUNNING' || latestRun.status === 'QUEUED') {
            setRunStatus(latestRun.status);
            setIsRunning(true);
            setIsCompleted(false);
            setIsFailed(false);
            setOverallPercent(40);
            setIsLoadingInitial(false);
            startElapsedTimer(0);
            setActiveRunState('RUNNING', 2);
            await streamLiveRun(rid, lastEventIdRef.current || 0);
            return;
          }

          if (latestRun.status === 'FAILED') {
            stopElapsedTimer();
            setRunStatus('FAILED');
            setIsRunning(false);
            setIsCompleted(false);
            setIsFailed(true);
            setErrorMessage(latestRun.error_message || 'Agent pipeline execution failed.');
            setIsLoadingInitial(false);
            setSseConnection('closed');
            setActiveRunState('FAILED', 0);
            return;
          }
        }

        // If no prior run found, initiate real run cleanly
        await startRun(false);
      } catch (err: any) {
        console.error('[useAgentRun] init failed:', err);
        stopElapsedTimer();
        setRunStatus('FAILED');
        setIsRunning(false);
        setIsFailed(true);
        setIsLoadingInitial(false);
        setErrorMessage(err.message || 'Could not initialize agent run.');
        setActiveRunState('FAILED', 0);
      }
    }

    initializeOrRestore();

    return () => {
      isMountedRef.current = false;
      stopElapsedTimer();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [canonicalCaseId, defaultTotalAssets, populateSynthesizedLogs, setActiveRunId, setActiveRunState, startElapsedTimer, startRun, stopElapsedTimer, streamLiveRun]);

  const fastForward = useCallback(() => {
    SCRIPTED_TIMELINE.forEach(({ event }) => processEvent(event));
    stopElapsedTimer();
    setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' })));
    setAssetsLocated(defaultTotalAssets);
    setOverallPercent(100);
    setRunStatus('DONE');
    setIsRunning(false);
    setIsCompleted(true);
    setIsFailed(false);
    setElapsedSeconds(20);
    setSseConnection('closed');
    setActiveRunState('DONE', 0);
  }, [defaultTotalAssets, processEvent, setActiveRunState, stopElapsedTimer]);

  const activeAgentCount = agents.filter((a) => a.status === 'working').length;

  return {
    agents,
    logs,
    assetsLocated,
    totalAssets,
    overallPercent,
    runStatus,
    isLoadingInitial,
    isRunning,
    isCompleted,
    isFailed,
    isDegraded,
    errorMessage,
    activeRunId,
    elapsedSeconds,
    activeAgentCount,
    sseConnection,
    startRun,
    fastForward,
  };
}
