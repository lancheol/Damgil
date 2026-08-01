import { TermsType } from '../navigation/types';

export type SignupTermsState = {
  hasReadService: boolean;
  hasReadPrivacy: boolean;
  agreedService: boolean;
  agreedPrivacy: boolean;
};

const INITIAL_STATE: SignupTermsState = {
  hasReadService: false,
  hasReadPrivacy: false,
  agreedService: false,
  agreedPrivacy: false,
};

let signupTermsState: SignupTermsState = { ...INITIAL_STATE };

export function getSignupTermsState(): SignupTermsState {
  return { ...signupTermsState };
}

export function resetSignupTermsState(): void {
  signupTermsState = { ...INITIAL_STATE };
}

export function markTermsReadAndAgreed(type: TermsType): void {
  if (type === 'service') {
    signupTermsState = {
      ...signupTermsState,
      hasReadService: true,
      agreedService: true,
    };
    return;
  }

  signupTermsState = {
    ...signupTermsState,
    hasReadPrivacy: true,
    agreedPrivacy: true,
  };
}

export function setTermsAgreed(type: TermsType, agreed: boolean): void {
  if (type === 'service') {
    signupTermsState = {
      ...signupTermsState,
      agreedService: agreed,
    };
    return;
  }

  signupTermsState = {
    ...signupTermsState,
    agreedPrivacy: agreed,
  };
}
