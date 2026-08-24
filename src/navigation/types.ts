import { NavigatorScreenParams } from '@react-navigation/native';

import { TermsType } from '../constants/terms';
import { AiCourse, CreateAiCourseInput } from '../types/aiCourse';

export type { TermsType };

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  TermsDetail: { type: TermsType };
};

export type MainTabParamList = {
  Home: undefined;
  /** 탭에서 제외됨 — AIScreen 타입용으로만 유지 */
  AI: undefined;
  Search: undefined;
  Map:
    | {
        focusPlace?: {
          contentId: string;
          title?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
      }
    | undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  Feedback: undefined;
  ProfileEdit: undefined;
  CreateDiary: undefined;
  FestivalList: undefined;
  FestivalDetail: { contentId: string; titleHint?: string };
  TravelSubsidy: undefined;
  /** 스택에서 제외됨 — MapRouteScreen 복구용으로만 유지 */
  MapRoute: { placeId: string };
  AICourseCreate: undefined;
  AICourseLoading: { input: CreateAiCourseInput };
  AICourseResult: { course: AiCourse };
  AICourseMap: { course: AiCourse };
  DiaryCamera: { diaryId: string };
  DiaryPhotoEntry: {
    diaryId: string;
    photoUri: string;
    mediaType?: 'photo' | 'video';
    mediaWidth?: number;
    mediaHeight?: number;
    captureLandscape?: boolean;
  };
  DiaryPhotoGallery: { diaryId: string };
  DiaryEdit: {
    diaryId: string;
    placeId?: string;
    mode?: 'edit' | 'view';
    /** 게시 후 소유자 재편집 → 완료 시 재게시 */
    republish?: boolean;
    liked?: boolean;
    likeCount?: number;
    commentCount?: number;
  };
  DiaryPlacePick: { diaryId: string };
  DiaryCoverEdit: { diaryId: string; fromTripEnd?: boolean };
  DiaryDailyCourseMap: { diaryId: string; dayNumber?: number };
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
