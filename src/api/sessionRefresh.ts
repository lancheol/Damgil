import { API_BASE_URL, API_PREFIX } from './config';
import { clearTokens, loadTokens, saveTokens } from './tokenStorage';
import { ApiError, TokenPair } from './types';

let refreshPromise: Promise<TokenPair> | null = null;

function isTokenPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== 'object') return false;
  const pair = value as Partial<TokenPair>;
  return (
    typeof pair.access === 'string' &&
    pair.access.length > 0 &&
    typeof pair.refresh === 'string' &&
    pair.refresh.length > 0
  );
}

function readError(payload: unknown): {
  code: string;
  message: string;
  detail: unknown;
} {
  const error =
    payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error?: unknown }).error
      : null;
  if (error && typeof error === 'object') {
    const body = error as {
      code?: unknown;
      message?: unknown;
      detail?: unknown;
    };
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return {
        code: body.code,
        message: body.message,
        detail: body.detail ?? null,
      };
    }
  }
  return {
    code: 'INVALID_TOKEN',
    message: '로그인 세션이 만료되었습니다.',
    detail: null,
  };
}

async function requestTokenRefresh(): Promise<TokenPair> {
  const source = await loadTokens();
  if (!source?.refresh) {
    throw new ApiError(401, 'INVALID_TOKEN', '로그인 세션이 없습니다.');
  }

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: source.refresh }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = readError(payload);
    if (response.status === 401) {
      await clearTokens();
    }
    throw new ApiError(
      response.status,
      parsed.code,
      parsed.message,
      parsed.detail,
    );
  }

  if (!isTokenPair(payload)) {
    throw new ApiError(
      500,
      'INVALID_REFRESH_RESPONSE',
      '로그인 갱신 응답이 올바르지 않습니다.',
    );
  }

  // 로그아웃 또는 새 로그인이 갱신 도중 발생했다면 이전 세션으로 덮어쓰지 않는다.
  const current = await loadTokens();
  if (!current) {
    throw new ApiError(401, 'SESSION_CHANGED', '로그인 세션이 변경되었습니다.');
  }
  if (current.refresh !== source.refresh) {
    return current;
  }

  await saveTokens(payload);
  return payload;
}

export function refreshStoredTokens(): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
