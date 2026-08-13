import { TripStatus } from '../api/types';

export function toDiaryStatus(status: string | null | undefined): TripStatus {
  if (status === 'editing' || status === 'completed' || status === 'recording') {
    return status;
  }
  return 'recording';
}
