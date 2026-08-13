import { API_BASE_URL, API_PREFIX } from './config';
import { ApiError, ApiErrorBody } from './types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
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
