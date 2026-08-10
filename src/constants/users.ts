export type SearchUser = {
  id: string;
  username: string;
  diaryCount: number;
  avatarUri?: string;
};

/** 사용자 검색 API 연동 전까지 사용하는 임시 목록 */
export const SEARCH_USERS: SearchUser[] = [
  { id: 'user-01', username: 'traveler_kim', diaryCount: 12 },
  { id: 'user-02', username: 'jeju_lover', diaryCount: 24 },
  { id: 'user-03', username: 'seoul_walker', diaryCount: 8 },
  { id: 'user-04', username: '바다보러가자', diaryCount: 36 },
  { id: 'user-05', username: '산책하는여행자', diaryCount: 5 },
  { id: 'user-06', username: 'damgil_official', diaryCount: 48 },
];
