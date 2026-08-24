import { API_BASE_URL, API_PREFIX } from './config';
import { refreshStoredTokens } from './sessionRefresh';
import { loadTokens } from './tokenStorage';
import { ApiError, ApiErrorBody } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  headers?: Record<string, string>;
  /** @internal 429 재시도 1회 제한 */
  _retried429?: boolean;
};

const MAX_CONCURRENT_REQUESTS = 4;
let activeRequests = 0;
const requestWaiters: Array<() => void> = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function acquireRequestSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    requestWaiters.push(() => {
      activeRequests += 1;
      resolve();
    });
  });
}

function releaseRequestSlot(): void {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = requestWaiters.shift();
  if (next) next();
}

function resolveUrl(path: string): string {
  if (path === '/health' || path.startsWith('/health?')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}${API_PREFIX}${path}`;
}

function parseErrorBody(payload: unknown): ApiErrorBody | null {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== 'object') {
    return null;
  }
  const body = error as Partial<ApiErrorBody>;
  if (typeof body.code !== 'string' || typeof body.message !== 'string') {
    return null;
  }
  return {
    code: body.code,
    message: body.message,
    detail: body.detail ?? null,
  };
}

function readRetryAfterSec(
  response: Response,
  parsed: ApiErrorBody | null,
): number {
  const header = response.headers.get('Retry-After');
  if (header) {
    const parsedHeader = Number(header);
    if (Number.isFinite(parsedHeader) && parsedHeader > 0) {
      return parsedHeader;
    }
  }

  const detail = parsed?.detail;
  if (detail && typeof detail === 'object' && detail !== null && 'retryAfterSec' in detail) {
    const retryAfterSec = Number((detail as { retryAfterSec?: unknown }).retryAfterSec);
    if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
      return retryAfterSec;
    }
  }

  return 1;
}

async function performRequest<T>(
  path: string,
  options: RequestOptions,
  allowRefresh: boolean,
): Promise<T> {
  await acquireRequestSlot();

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers ?? {}),
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const response = await fetch(resolveUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && options.accessToken && allowRefresh) {
        const stored = await loadTokens();
        const nextTokens =
          stored?.access && stored.access !== options.accessToken
            ? stored
            : await refreshStoredTokens();
        const retryBody =
          path === '/auth/logout' &&
          options.body &&
          typeof options.body === 'object' &&
          'refreshToken' in options.body
            ? {
                ...(options.body as Record<string, unknown>),
                refreshToken: nextTokens.refresh,
              }
            : options.body;
        return performRequest<T>(
          path,
          {
            ...options,
            accessToken: nextTokens.access,
            body: retryBody,
          },
          false,
        );
      }

      if (response.status === 429 && !options._retried429) {
        const parsed = parseErrorBody(payload);
        const waitSec = readRetryAfterSec(response, parsed);
        await sleep(Math.min(waitSec * 1000, 10_000));
        return performRequest<T>(
          path,
          { ...options, _retried429: true },
          allowRefresh,
        );
      }

      const parsed = parseErrorBody(payload);
      const retryAfter = response.headers.get('Retry-After');
      const detail =
        parsed?.detail ??
        (response.status === 429 && retryAfter ? { retryAfterSec: Number(retryAfter) } : null);

      throw new ApiError(
        response.status,
        parsed?.code ?? (response.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN'),
        parsed?.message ?? '요청에 실패했습니다.',
        detail,
      );
    }

    return payload as T;
  } finally {
    releaseRequestSlot();
  }
}

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return performRequest<T>(path, options, true);
}
