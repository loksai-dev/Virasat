/**
 * Virasat API Client
 * 
 * Centralized fetch wrapper implementing:
 * 1. Automatic Firebase ID token authentication (Bearer header)
 * 2. Automatic If-Match header with case data_version on mutations
 * 3. Standardized error envelope parsing: { error: { code, message, request_id } }
 * 4. 401 recovery (re-authenticates anonymously and retries once)
 * 5. 409 concurrency conflict handling (notifies store and emits refresh event)
 * 6. 429 rate limit handling with user-friendly toast messages
 */

import { API_CONFIG } from './config';
import { getFirebaseIdToken, ensureAnonymousSession } from '@/lib/firebase';
import { useVirasatStore } from '@/store/useVirasatStore';

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  requestId?: string;

  constructor(message: string, statusCode: number, code: string = 'API_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  dataVersion?: number;
  skipAuth?: boolean;
  retries?: number;
}

/**
 * Normalizes endpoint path against API_CONFIG.BASE_URL
 */
function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  const path = endpoint.replace(/^\/+/, '');
  return `${base}/${path}`;
}

/**
 * Core fetch wrapper with auth, If-Match, error handling, and 401 retry
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = resolveUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // 1. Resolve Authorization token
  let token = options.skipAuth ? null : await getFirebaseIdToken();

  // 2. Resolve headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type for JSON payloads unless already specified (e.g. FormData)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // 3. Attach If-Match header on mutations for optimistic concurrency control
  if (isMutation && !headers.has('If-Match')) {
    const storeVersion = useVirasatStore.getState().dataVersion;
    const versionToUse = options.dataVersion ?? storeVersion;
    if (versionToUse !== undefined && versionToUse !== null) {
      headers.set('If-Match', `"${versionToUse}"`);
    }
  }

  // 4. Format body
  let bodyPayload = options.body;
  if (!isFormData && options.body && typeof options.body === 'object') {
    bodyPayload = JSON.stringify(options.body);
  }

  const fetchOptions: RequestInit = {
    ...options,
    method,
    headers,
    body: bodyPayload,
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr: any) {
    throw new ApiError(netErr.message || 'Network request failed', 0, 'NETWORK_ERROR');
  }

  // 5. Handle 401 Unauthorized -> Attempt re-auth anonymously and retry once
  if (response.status === 401 && (options.retries ?? 0) === 0) {
    try {
      console.warn('[Virasat API] 401 received. Attempting anonymous re-auth token refresh...');
      await ensureAnonymousSession();
      const freshToken = await getFirebaseIdToken();
      if (freshToken) {
        return await apiRequest<T>(endpoint, {
          ...options,
          retries: (options.retries ?? 0) + 1,
        });
      }
    } catch (authErr) {
      console.error('[Virasat API] Re-auth recovery failed:', authErr);
    }
  }

  // 6. Handle 409 Conflict (Concurrent update)
  if (response.status === 409) {
    const store = useVirasatStore.getState();
    store.addToast({
      type: 'warning',
      title: 'Data Changed Concurrently',
      message: 'The case was updated by another process. Refetching latest version...',
    });
    // Dispatch global event so TanStack React Query invalidates active case queries
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('virasat:concurrency_conflict', { detail: { endpoint } }));
    }
  }

  // 7. Handle 429 Rate Limit
  if (response.status === 429) {
    const store = useVirasatStore.getState();
    store.addToast({
      type: 'risk',
      title: 'Rate Limit Reached',
      message: 'You have reached the temporary request limit. Please wait a moment before trying again.',
    });
  }

  // 8. Process JSON or Error Envelope
  if (!response.ok) {
    let errorCode = `HTTP_${response.status}`;
    let errorMessage = `Request failed with status ${response.status}`;
    let reqId: string | undefined;

    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object') {
        if (errJson.error) {
          errorCode = errJson.error.code || errorCode;
          errorMessage = errJson.error.message || errorMessage;
          reqId = errJson.error.request_id;
        } else if (errJson.detail) {
          errorMessage = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      }
    } catch {
      // Body not JSON
    }

    throw new ApiError(errorMessage, response.status, errorCode, reqId);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  resolveUrl,
};

export default api;
