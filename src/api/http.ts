import { API_BASE_URL, API_PREFIX } from './config';
import { refreshStoredTokens } from './sessionRefresh';
import { loadTokens } from './tokenStorage';
import { ApiError, ApiErrorBody } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  headers?: Record<string, string>;
};

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

async function performRequest<T>(
  path: string,
  options: RequestOptions,
  allowRefresh: boolean,
): Promise<T> {
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
}

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return performRequest<T>(path, options, true);
}
