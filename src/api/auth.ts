import { apiRequest } from './http';
import { LoginRequest, SignupRequest, TokenPair } from './types';

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
