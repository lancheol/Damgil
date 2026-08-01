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

type AuthContextValue = {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const signIn = useCallback(async (_username: string, _password: string) => {
    // TODO: 실제 인증 API 연동
    setIsAuthenticated(true);
  }, []);

  const signUp = useCallback(async (_payload: SignUpPayload) => {
    // TODO: 실제 회원가입 API 연동
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      signIn,
      signUp,
      signOut,
    }),
    [isAuthenticated, signIn, signUp, signOut],
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
