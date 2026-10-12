/**
 * Case-level Server-Sent Events (SSE) Stream Hook
 * 
 * Subscribes to /api/cases/{caseId}/events with fetch streaming:
 * - Emits 'case_stale' event: sets isStale = true (displays "Data changed, updating in background..." bar)
 * - Emits 'case_fresh' event: sets isStale = false and invalidates all React Query queries
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from './config';
import { getFirebaseIdToken } from '@/lib/firebase';
import { useVirasatStore } from '@/store/useVirasatStore';

export function useCaseStream(caseId?: string) {
  const queryClient = useQueryClient();
  const [isStale, setIsStale] = useState(false);
  const { setDataVersion } = useVirasatStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCaseRefresh = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ['case', caseId] });
        queryClient.invalidateQueries({ queryKey: ['caseOverview', caseId] });
        queryClient.invalidateQueries({ queryKey: ['assets', caseId] });
        queryClient.invalidateQueries({ queryKey: ['people', caseId] });
        queryClient.invalidateQueries({ queryKey: ['shares', caseId] });
        queryClient.invalidateQueries({ queryKey: ['claims', caseId] });
      } else {
        queryClient.invalidateQueries();
      }
    }, 300);
  };

  useEffect(() => {
    if (!caseId || API_CONFIG.USE_MOCKS) return;

    // Abort previous stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function startStream() {
      try {
        const token = await getFirebaseIdToken();
        const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
        const url = `${base}/cases/${encodeURIComponent(caseId!)}/events`;

        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const chunk of parts) {
            const lines = chunk.split('\n');
            let eventType = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.replace('data:', '').trim();
              }
            }

            if (eventType === 'case_stale') {
              setIsStale(true);
            } else if (eventType === 'case_fresh') {
              setIsStale(false);
              // Parse version if present
              try {
                if (dataStr) {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.version) {
                    setDataVersion(parsed.version);
                  }
                }
              } catch {}
              // Scoped and debounced invalidation so UI refreshes smoothly
              triggerCaseRefresh();
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Stream error, fallback gracefully
        }
      }
    }

    startStream();

    // Also listen for concurrency conflict events from client.ts
    const handleConflict = () => {
      setIsStale(true);
      setTimeout(() => {
        setIsStale(false);
        triggerCaseRefresh();
      }, 1500);
    };
    window.addEventListener('virasat:concurrency_conflict', handleConflict);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortController.abort();
      window.removeEventListener('virasat:concurrency_conflict', handleConflict);
    };
  }, [caseId, queryClient, setDataVersion]);

  return { isStale };
}

export default useCaseStream;
