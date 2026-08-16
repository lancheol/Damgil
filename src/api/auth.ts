import { apiRequest } from './http';
import { LoginRequest, LogoutRequest, LogoutResponseDto, SignupRequest, TokenPair } from './types';

export function signup(body: SignupRequest): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/signup', {
    method: 'POST',
    body,
  });
}

export function login(body: LoginRequest): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/login', {
    method: 'POST',
    body,
  });
}

/** POST /auth/logout — scope 생략 시 all_devices. current_device는 refreshToken 필요 */
export function logout(
  accessToken: string,
  body: LogoutRequest = {},
): Promise<LogoutResponseDto | null> {
  return apiRequest<LogoutResponseDto | null>('/auth/logout', {
    method: 'POST',
    accessToken,
    body,
  });
}
