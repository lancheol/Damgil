import { apiRequest } from './http';
import type {
  BlockedUserDto,
  CreateBlockRequest,
  CreateReportRequest,
  DeletedResponseDto,
} from './types';

/** POST /blocks */
export function blockUser(
  accessToken: string,
  body: CreateBlockRequest,
): Promise<unknown> {
  return apiRequest<unknown>('/blocks', {
    method: 'POST',
    accessToken,
    body,
  });
}

/** GET /blocks */
export function listBlockedUsers(accessToken: string): Promise<BlockedUserDto[]> {
  return apiRequest<unknown>('/blocks', { accessToken }).then(normalizeBlockedList);
}

/** DELETE /blocks/{userId} */
export function unblockUser(
  accessToken: string,
  userId: string | number,
): Promise<DeletedResponseDto | unknown> {
  return apiRequest(`/blocks/${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
    accessToken,
  });
}

/** POST /reports */
export function createReport(
  accessToken: string,
  body: CreateReportRequest,
): Promise<unknown> {
  return apiRequest<unknown>('/reports', {
    method: 'POST',
    accessToken,
    body,
  });
}

function normalizeBlockedList(raw: unknown): BlockedUserDto[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
      ? ((raw as { items: unknown[] }).items)
      : [];

  const out: BlockedUserDto[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const userId = item.userId ?? item.blockedUserId ?? item.id;
    if (userId == null || userId === '') continue;
    const nickname =
      (typeof item.nickname === 'string' && item.nickname) ||
      (typeof item.blockedNickname === 'string' && item.blockedNickname) ||
      (typeof item.username === 'string' && item.username) ||
      null;
    out.push({
      userId: String(userId),
      nickname,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
    });
  }
  return out;
}
