import { apiRequest } from './http';
import { MeResponse, UpdateMeRequest } from './types';

export function getMe(accessToken: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/users/me', {
    accessToken,
  });
}

export function updateMe(
  accessToken: string,
  body: UpdateMeRequest,
): Promise<MeResponse> {
  return apiRequest<MeResponse>('/users/me', {
    method: 'PATCH',
    accessToken,
    body,
  });
}
