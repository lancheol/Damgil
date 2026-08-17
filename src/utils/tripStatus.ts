import { TripStatus } from '../api/types';
import type { Diary } from '../types/diary';

export function toDiaryStatus(status: string | null | undefined): TripStatus {
  if (status === 'editing' || status === 'completed' || status === 'recording') {
    return status;
  }
  return 'recording';
}

/** 게시(완료)된 다이어리 — 인스타 게시물과 같이 보기 전용 */
export function isDiaryPublished(diary: Diary | null | undefined): boolean {
  if (!diary) return false;
  return (
    diary.editStatus === 'COMPLETED' || toDiaryStatus(diary.status) === 'completed'
  );
}
