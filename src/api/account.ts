import { apiRequest } from './http';
import { AccountDeletionPreviewDto, DeleteAccountResponseDto } from './types';

/** 탈퇴 미리보기 — 실제 삭제 없음 */
export function getAccountDeletionPreview(
  accessToken: string,
): Promise<AccountDeletionPreviewDto> {
  return apiRequest<AccountDeletionPreviewDto>('/account/deletion/preview', {
    accessToken,
  });
}

/**
 * 회원탈퇴 확정.
 * Swagger: DELETE /account 와 DELETE /users/me 동일 — MP 트랙은 /account 사용.
 */
export function deleteAccount(accessToken: string): Promise<DeleteAccountResponseDto> {
  return apiRequest<DeleteAccountResponseDto>('/account', {
    method: 'DELETE',
    accessToken,
  });
}
