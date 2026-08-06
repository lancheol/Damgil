export type TermsType = 'service' | 'privacy';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  TermsDetail: { type: TermsType };
};

export type MainTabParamList = {
  Home: undefined;
  AI: undefined;
  Search: undefined;
  Map: undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Settings: undefined;
  ProfileEdit: undefined;
  CreateDiary: undefined;
  DiaryCamera: { diaryId: string };
  DiaryPhotoEntry: { diaryId: string; photoUri: string; mediaType?: 'photo' | 'video' };
  DiaryPhotoGallery: { diaryId: string };
  DiaryEdit: { diaryId: string; placeId?: string };
  DiaryPlacePick: { diaryId: string };
  DiaryCoverEdit: { diaryId: string; fromTripEnd?: boolean };
  DiaryRecordDetail: { diaryId: string; photoId: string };
  DiaryRecordDecorate: {
    diaryId: string;
    photoId: string;
    /** 이전/다음 이동 시 슬라이드 방향 */
    transition?: 'prev' | 'next';
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
