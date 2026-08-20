import { apiRequest } from './http';
import type {
  CreateFeedbackRequest,
  FeedbackResponseDto,
  ServiceDocumentDto,
  SettingsResponseDto,
} from './types';

/** GET /settings — 설정 메뉴 + 문서 현재 버전(비인증) */
export function getSettings(): Promise<SettingsResponseDto> {
  return apiRequest<SettingsResponseDto>('/settings');
}

/** GET /settings/documents/{documentType} — 문서 활성 버전 단건(비인증) */
export function getSettingsDocument(documentType: string): Promise<ServiceDocumentDto> {
  return apiRequest<ServiceDocumentDto>(
    `/settings/documents/${encodeURIComponent(documentType)}`,
  );
}

/** POST /settings/feedback — 피드백 등록 */
export function submitFeedback(
  accessToken: string,
  body: CreateFeedbackRequest,
): Promise<FeedbackResponseDto> {
  return apiRequest<FeedbackResponseDto>('/settings/feedback', {
    method: 'POST',
    accessToken,
    body,
  });
}
