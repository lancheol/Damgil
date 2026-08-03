import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { VisibilityRange } from '../utils/authValidation';

export type SignUpPayload = {
  username: string;
  password: string;
  phone: string;
  visibility: VisibilityRange;
};

type AuthUser = {
  username: string;
  bio: string;
  followerCount: number;
  followingCount: number;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => void;
};

const DEFAULT_BIO = '매주 새로운 곳을 기록하는 다이어리 ✈️';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const signIn = useCallback(async (username: string, _password: string) => {
    // TODO: 실제 인증 API 연동
    setUser({
      username: username.trim() || 'traveler',
      bio: DEFAULT_BIO,
      followerCount: 1200,
      followingCount: 128,
    });
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    // TODO: 실제 회원가입 API 연동
    setUser({
      username: payload.username.trim() || 'traveler',
      bio: DEFAULT_BIO,
      followerCount: 0,
      followingCount: 0,
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: user !== null,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
