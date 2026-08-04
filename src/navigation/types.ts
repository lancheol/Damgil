export type TermsType = 'service' | 'privacy';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  TermsDetail: { type: TermsType };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Settings: undefined;
  CreateDiary: undefined;
  DiaryCamera: { diaryId: string };
  DiaryPhotoEntry: { diaryId: string; photoUri: string; mediaType?: 'photo' | 'video' };
  DiaryPhotoGallery: { diaryId: string };
  DiaryEdit: { diaryId: string };
  DiaryCoverEdit: { diaryId: string };
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
