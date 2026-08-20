import { apiRequest } from './http';
import type {
  CommentDto,
  CommentsListQuery,
  CommentsListResponseDto,
  CreateCommentRequest,
  DeletedResponseDto,
  ToggleLikeResponseDto,
} from './types';

function toQuery(params: CommentsListQuery = {}): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** POST /trips/{id}/likes — 좋아요 토글 */
export function toggleTripLike(
  accessToken: string,
  tripId: string,
): Promise<ToggleLikeResponseDto> {
  return apiRequest<ToggleLikeResponseDto>(`/trips/${tripId}/likes`, {
    method: 'POST',
    accessToken,
  });
}

/** GET /trips/{id}/comments */
export function listTripComments(
  accessToken: string,
  tripId: string,
  query: CommentsListQuery = {},
): Promise<CommentsListResponseDto> {
  return apiRequest<CommentsListResponseDto>(`/trips/${tripId}/comments${toQuery(query)}`, {
    accessToken,
  });
}

/** POST /trips/{id}/comments */
export function addTripComment(
  accessToken: string,
  tripId: string,
  body: CreateCommentRequest,
): Promise<CommentDto> {
  return apiRequest<CommentDto>(`/trips/${tripId}/comments`, {
    method: 'POST',
    accessToken,
    body,
  });
}

/** DELETE /comments/{id} */
export function deleteComment(
  accessToken: string,
  commentId: string,
): Promise<DeletedResponseDto> {
  return apiRequest<DeletedResponseDto>(`/comments/${commentId}`, {
    method: 'DELETE',
    accessToken,
  });
}

/**
 * 댓글 수정 — 백엔드 API 확정 후 경로·메서드 맞출 것.
 * 회의 예정: PATCH /comments/{id} body `{ body }` 가정.
 */
export function updateComment(
  accessToken: string,
  commentId: string,
  body: CreateCommentRequest,
): Promise<CommentDto> {
  return apiRequest<CommentDto>(`/comments/${commentId}`, {
    method: 'PATCH',
    accessToken,
    body,
  });
}
