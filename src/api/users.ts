import { apiRequest } from './http';
import { MeResponse } from './types';

export function getMe(accessToken: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/users/me', {
    accessToken,
  });
}
