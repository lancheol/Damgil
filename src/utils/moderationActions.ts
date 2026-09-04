import { Alert } from 'react-native';

import { blockUser } from '../api/moderation';
import { loadTokens } from '../api/tokenStorage';
import { ApiError, ReportReason, ReportTargetType } from '../api/types';

export const REPORT_REASON_OPTIONS: { reason: ReportReason; label: string }[] = [
  { reason: 'inappropriate', label: '부적절한 내용' },
  { reason: 'privacy', label: '개인정보 노출' },
  { reason: 'copyright', label: '저작권 침해' },
  { reason: 'abuse', label: '욕설·혐오' },
  { reason: 'false_place', label: '잘못된 장소 정보' },
  { reason: 'spam', label: '스팸·광고' },
  { reason: 'etc', label: '기타' },
];

/** Swagger targetId/userId는 number — 숫자 문자열만 허용 */
export function toApiNumericId(id: string | number | null | undefined): number | null {
  if (id == null || id === '') return null;
  const n = typeof id === 'number' ? id : Number(String(id).trim());
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

export function confirmBlockUser(userId: string, onBlocked?: () => void): void {
  Alert.alert(
    '이 사용자를 차단할까요?',
    '차단하면 서로의 다이어리와 댓글이 보이지 않아요. 설정에서 언제든 해제할 수 있어요.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const numericId = toApiNumericId(userId);
            if (numericId == null) {
              Alert.alert('차단', '차단할 사용자를 확인할 수 없어요.');
              return;
            }
            const tokens = await loadTokens();
            if (!tokens?.access) {
              Alert.alert('차단', '로그인이 필요합니다.');
              return;
            }
            try {
              await blockUser(tokens.access, { userId: numericId });
              Alert.alert('차단', '차단했어요.');
              onBlocked?.();
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : '차단하지 못했어요.';
              Alert.alert('차단', message);
            }
          })();
        },
      },
    ],
  );
}

export type ReportTarget = {
  targetType: ReportTargetType;
  targetId: string;
};
