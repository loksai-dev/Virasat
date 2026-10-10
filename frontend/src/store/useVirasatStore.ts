import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'family' | 'institution' | 'judge' | null;
export type CaseScenario = 'simple' | 'complex' | 'disputed';
export type SupportedLanguage = 'en' | 'hi' | 'te';

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
  language: SupportedLanguage;
  tourActive: boolean;
  toasts: ToastMessage[];
  
  // Actions
  setRole: (role: UserRole) => void;
  setCaseId: (caseId: string) => void;
  setScenario: (scenario: CaseScenario) => void;
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
      scenario: 'complex', // Default scenario: Complex
      language: 'en',
      tourActive: false,
      toasts: [],

      setRole: (role) => set({ role }),
      setCaseId: (caseId) => set({ caseId }),
      setScenario: (scenario) => set({ scenario }),
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
        scenario: state.scenario,
        language: state.language,
        tourActive: state.tourActive,
      }),
    }
  )
);
