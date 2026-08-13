import { ApiError } from '../api/types';

export function mapCreateTripError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return '여행을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.status === 401) {
    return '로그인이 필요합니다. 다시 로그인해 주세요.';
  }
  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  }
  return error.message || '여행을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
