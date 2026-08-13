import { apiRequest } from './http';
import { AreaMetaResponse } from './types';

export function getAreas(): Promise<AreaMetaResponse> {
  return apiRequest<AreaMetaResponse>('/meta/areas');
}
