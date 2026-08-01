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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
