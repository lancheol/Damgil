import { apiRequest } from './http';
import type {
  DeletedResponseDto,
  SavePlaceRequest,
  SavePlaceResponseDto,
  SavedPlaceItemDto,
} from './types';

/** POST /saves — 장소 찜 추가(멱등) */
export function savePlace(
  accessToken: string,
  body: SavePlaceRequest,
): Promise<SavePlaceResponseDto> {
  return apiRequest<SavePlaceResponseDto>('/saves', {
    method: 'POST',
    accessToken,
    body,
  });
}

/** DELETE /saves/{contentId} — 장소 찜 해제 */
export function unsavePlace(
  accessToken: string,
  contentId: string,
): Promise<DeletedResponseDto> {
  return apiRequest<DeletedResponseDto>(`/saves/${encodeURIComponent(contentId)}`, {
    method: 'DELETE',
    accessToken,
  });
}

/** GET /saves — 내 찜 목록 */
export function listSavedPlaces(accessToken: string): Promise<SavedPlaceItemDto[]> {
  return apiRequest<SavedPlaceItemDto[]>('/saves', {
    accessToken,
  });
}
