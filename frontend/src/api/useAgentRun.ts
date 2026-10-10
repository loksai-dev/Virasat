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

export function useAgentRun(runId: string = 'run-default') {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [assetsLocated, setAssetsLocated] = useState<number>(1);
  const totalAssets = 12;
  const [overallPercent, setOverallPercent] = useState<number>(8);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const processEvent = useCallback((event: AgentRunEvent) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (event.type === 'agent_started' && event.agentId) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? { ...a, status: 'working', activity: event.activity || a.activity, progress: Math.max(a.progress, 15) }
            : a
        )
      );
      if (event.message) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeStr,
            agentId: event.agentId!,
            agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
            message: event.message!,
            citation: event.citation,
          },
        ]);
      }
    } else if (event.type === 'agent_message' && event.agentId) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? {
                ...a,
                activity: event.activity || a.activity,
                progress: event.progress !== undefined ? event.progress : Math.min(a.progress + 25, 95),
              }
            : a
        )
      );
      if (event.message) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeStr,
            agentId: event.agentId!,
            agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
            message: event.message!,
            citation: event.citation,
          },
        ]);
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
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeStr,
            agentId: event.agentId!,
            agentName: INITIAL_AGENTS.find((a) => a.id === event.agentId)?.name || 'Agent',
            message: event.message!,
            citation: event.citation,
            isMilestone: true,
          },
        ]);
      }
    } else if (event.type === 'progress') {
      if (event.assetsLocated !== undefined) setAssetsLocated(event.assetsLocated);
      if (event.percent !== undefined) setOverallPercent(event.percent);
    } else if (event.type === 'run_done') {
      setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100 })));
      setAssetsLocated(12);
      setOverallPercent(100);
      setIsRunning(false);
      setIsCompleted(true);
      if (event.message) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeStr,
            agentId: 'orchestrator',
            agentName: 'Settlement Orchestrator',
            message: event.message!,
            citation: 'Master Estate Dossier Ready',
            isMilestone: true,
          },
        ]);
      }
    }
  }, []);

  // Run the scripted event stream
  useEffect(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setIsCompleted(false);

    // Elapsed timer
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);

    // Schedule all timeline events
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    SCRIPTED_TIMELINE.forEach(({ timeMs, event }) => {
      const t = setTimeout(() => {
        processEvent(event);
      }, timeMs);
      timeouts.push(t);
    });

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      timeouts.forEach(clearTimeout);
    };
  }, [runId, processEvent]);

  // Fast-forward option to instantly finish
  const fastForward = useCallback(() => {
    SCRIPTED_TIMELINE.forEach(({ event }) => processEvent(event));
    setAgents((prev) => prev.map((a) => ({ ...a, status: 'done', progress: 100, activity: 'Completed successfully ✓' })));
    setAssetsLocated(12);
    setOverallPercent(100);
    setIsRunning(false);
    setIsCompleted(true);
    setElapsedSeconds(20);
  }, [processEvent]);

  return {
    agents,
    logs,
    assetsLocated,
    totalAssets,
    overallPercent,
    isRunning,
    isCompleted,
    elapsedSeconds,
    fastForward,
  };
}
