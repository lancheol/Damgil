import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { login as loginRequest, signup as signupRequest } from '../api/auth';
import { clearTokens, loadTokens, saveTokens } from '../api/tokenStorage';
import { ApiError, AgreementsPayload, MeResponse } from '../api/types';
import { getMe } from '../api/users';
import { loadAvatarUri, saveAvatarUri } from '../utils/profileStorage';

export type SignUpPayload = {
  email: string;
  password: string;
  nickname: string;
  agreements: AgreementsPayload;
};

export type UpdateProfileInput = {
  username: string;
  bio: string;
  avatarUri: string | null;
};

type AuthUser = {
  id: string;
  email: string;
  username: string;
  bio: string;
  avatarUri: string | null;
  followerCount: number;
  followingCount: number;
};

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => boolean;
  signOut: () => void;
};

const DEFAULT_BIO = '매주 새로운 곳을 기록하는 다이어리 ✈️';

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(me: MeResponse, avatarUri: string | null = null): AuthUser {
  return {
    id: me.id,
    email: me.email,
    username: me.nickname,
    bio: DEFAULT_BIO,
    avatarUri,
    followerCount: 0,
    followingCount: 0,
  };
}

async function withStoredAvatar(user: AuthUser): Promise<AuthUser> {
  const avatarUri = await loadAvatarUri(user.id);
  return { ...user, avatarUri };
}

export function mapLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'ACCOUNT_DELETED') {
    return '삭제된 계정입니다.';
  }
  if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  }
  return error.message || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

export function mapSignupError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'EMAIL_TAKEN' || error.status === 409) {
    return '이미 가입된 이메일입니다.';
  }
  if (error.code === 'AGREEMENT_REQUIRED') {
    return '필수 약관에 모두 동의해 주세요.';
  }
  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  }
  return error.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const tokens = await loadTokens();
        if (!tokens) {
          return;
        }
        const me = await getMe(tokens.access);
        if (!cancelled) {
          setUser(await withStoredAvatar(toAuthUser(me)));
        }
      } catch {
        await clearTokens();
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest({
      email: email.trim(),
      password,
    });
    await saveTokens(tokens);

    try {
      const me = await getMe(tokens.access);
      setUser(await withStoredAvatar(toAuthUser(me)));
    } catch {
      await clearTokens();
      throw new Error('로그인 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    await signupRequest({
      email: payload.email,
      password: payload.password,
      nickname: payload.nickname,
      agreements: payload.agreements,
    });
  }, []);

  const updateProfile = useCallback((input: UpdateProfileInput) => {
    const nextUsername = input.username.trim();
    if (!nextUsername) {
      return false;
    }

    setUser((prev) => {
      if (!prev) {
        return prev;
      }
      void saveAvatarUri(prev.id, input.avatarUri);
      return {
        ...prev,
        username: nextUsername,
        bio: input.bio.trim(),
        avatarUri: input.avatarUri,
      };
    });
    return true;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    void clearTokens();
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated: user !== null,
      user,
      signIn,
      signUp,
      updateProfile,
      signOut,
    }),
    [isReady, user, signIn, signUp, updateProfile, signOut],
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
