import { apiRequest } from './http';
import {
  AddTripItemRequest,
  AddTripItemResponseDto,
  ChangeTripStatusRequest,
  CreateTripRequest,
  DeletedResponseDto,
  SetItemDecorationRequest,
  SetTripCoverRequest,
  TripDto,
  TripDailyCourseResponse,
  TripItemDecorationDto,
  TripItemDto,
  TripTimelineResponseDto,
  UpdateTripRequest,
} from './types';

export function createTrip(accessToken: string, body: CreateTripRequest): Promise<TripDto> {
  return apiRequest<TripDto>('/trips', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function listTrips(accessToken: string): Promise<TripDto[]> {
  return apiRequest<TripDto[]>('/trips', {
    accessToken,
  });
}

export function getTripTimeline(
  accessToken: string,
  tripId: string,
): Promise<TripTimelineResponseDto> {
  return apiRequest<TripTimelineResponseDto>(`/trips/${tripId}`, {
    accessToken,
  });
}

export function updateTrip(
  accessToken: string,
  tripId: string,
  body: UpdateTripRequest,
): Promise<TripDto> {
  return apiRequest<TripDto>(`/trips/${tripId}`, {
    method: 'PUT',
    accessToken,
    body,
  });
}

export function deleteTrip(
  accessToken: string,
  tripId: string,
): Promise<DeletedResponseDto> {
  return apiRequest<DeletedResponseDto>(`/trips/${tripId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function endTrip(accessToken: string, tripId: string): Promise<TripDto> {
  return apiRequest<TripDto>(`/trips/${tripId}/end`, {
    method: 'PATCH',
    accessToken,
  });
}

export function changeTripStatus(
  accessToken: string,
  tripId: string,
  body: ChangeTripStatusRequest,
): Promise<TripDto> {
  return apiRequest<TripDto>(`/trips/${tripId}/status`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export function addTripItem(
  accessToken: string,
  tripId: string,
  body: AddTripItemRequest,
  idempotencyKey?: string,
): Promise<AddTripItemResponseDto> {
  return apiRequest<AddTripItemResponseDto>(`/trips/${tripId}/items`, {
    method: 'POST',
    accessToken,
    body,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
}

export function confirmTripItemLocation(
  accessToken: string,
  tripId: string,
  itemId: string,
  placeContentId: string,
): Promise<TripItemDto> {
  return apiRequest<TripItemDto>(`/trips/${tripId}/items/${itemId}/location`, {
    method: 'PATCH',
    accessToken,
    body: { placeContentId },
  });
}

export function deleteTripItem(
  accessToken: string,
  tripId: string,
  itemId: string,
): Promise<DeletedResponseDto> {
  return apiRequest<DeletedResponseDto>(`/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function setTripCover(
  accessToken: string,
  tripId: string,
  body: SetTripCoverRequest,
): Promise<TripDto> {
  return apiRequest<TripDto>(`/trips/${tripId}/cover`, {
    method: 'PUT',
    accessToken,
    body,
  });
}

export function setTripItemDecoration(
  accessToken: string,
  tripId: string,
  itemId: string,
  body: SetItemDecorationRequest,
): Promise<TripItemDecorationDto> {
  return apiRequest<TripItemDecorationDto>(`/trips/${tripId}/items/${itemId}/decoration`, {
    method: 'PUT',
    accessToken,
    body,
  });
}

export function getTripItemDecoration(
  accessToken: string,
  tripId: string,
  itemId: string,
): Promise<TripItemDecorationDto | null> {
  return apiRequest<TripItemDecorationDto | null>(`/trips/${tripId}/items/${itemId}/decoration`, {
    accessToken,
  });
}

export function getTripDailyCourse(
  accessToken: string,
  tripId: string,
  day?: number,
): Promise<TripDailyCourseResponse> {
  const query = typeof day === 'number' && day >= 1 ? `?day=${day}` : '';
  return apiRequest<TripDailyCourseResponse>(`/trips/${tripId}/daily-course${query}`, {
    accessToken,
  });
}
