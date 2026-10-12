import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'family' | 'institution' | 'judge' | null;
export type CaseScenario = 'simple' | 'complex' | 'disputed';
export type CaseMode = 'prefilled' | 'from_documents';
export type SupportedLanguage = 'en' | 'hi' | 'te';
export type RunExecutionStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'risk' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface VirasatState {
  role: UserRole;
  caseId: string;
  scenario: CaseScenario;
  mode: CaseMode;
  dataVersion: number;
  language: SupportedLanguage;
  tourActive: boolean;
  activeRunId: string | null;
  activeRunStatus: RunExecutionStatus;
  activeAgentCount: number;
  toasts: ToastMessage[];
  
  // Actions
  setRole: (role: UserRole) => void;
  setCaseId: (caseId: string) => void;
  setActiveRunId: (activeRunId: string | null) => void;
  setActiveRunState: (status: RunExecutionStatus, activeCount?: number) => void;
  setScenario: (scenario: CaseScenario) => void;
  setMode: (mode: CaseMode) => void;
  setDataVersion: (dataVersion: number) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setTourActive: (active: boolean) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useVirasatStore = create<VirasatState>()(
  persist(
    (set) => ({
      role: null, // Disabled until a role is chosen
      caseId: 'VR-2026-0142',
      activeRunId: null,
      activeRunStatus: 'DONE',
      activeAgentCount: 0,
      scenario: 'complex', // Default scenario: Complex (Sharma)
      mode: 'prefilled',
      dataVersion: 1,
      language: 'en',
      tourActive: false,
      toasts: [],

      setRole: (role) => set({ role }),
      setCaseId: (caseId) => set({ caseId }),
      setActiveRunId: (activeRunId) => set({ activeRunId }),
      setActiveRunState: (activeRunStatus, activeAgentCount) =>
        set((state) => ({
          activeRunStatus,
          activeAgentCount: activeAgentCount !== undefined ? activeAgentCount : state.activeAgentCount,
        })),
      setScenario: (scenario) => set({ scenario }),
      setMode: (mode) => set({ mode }),
      setDataVersion: (dataVersion) => set({ dataVersion }),
      setLanguage: (language) => set({ language }),
      setTourActive: (tourActive) => set({ tourActive }),
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        
        // Auto dismiss
        const duration = toast.duration ?? 4500;
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, duration);
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'virasat-storage',
      partialize: (state) => ({
        role: state.role,
        caseId: state.caseId,
        activeRunId: state.activeRunId,
        activeRunStatus: state.activeRunStatus,
        activeAgentCount: state.activeAgentCount,
        scenario: state.scenario,
        mode: state.mode,
        dataVersion: state.dataVersion,
        language: state.language,
        tourActive: state.tourActive,
      }),
    }
  )
);
