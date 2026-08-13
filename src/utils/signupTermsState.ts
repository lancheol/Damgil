import { TERMS_ITEMS, TermsType } from '../constants/terms';

export type TermConsent = {
  hasRead: boolean;
  agreed: boolean;
};

export type SignupTermsState = Record<TermsType, TermConsent>;

const emptyConsent = (): TermConsent => ({ hasRead: false, agreed: false });

function createInitialState(): SignupTermsState {
  return TERMS_ITEMS.reduce((state, item) => {
    state[item.type] = emptyConsent();
    return state;
  }, {} as SignupTermsState);
}

let signupTermsState: SignupTermsState = createInitialState();

export function getSignupTermsState(): SignupTermsState {
  return {
    privacy: { ...signupTermsState.privacy },
    service: { ...signupTermsState.service },
    location: { ...signupTermsState.location },
    marketing: { ...signupTermsState.marketing },
  };
}

export function resetSignupTermsState(): void {
  signupTermsState = createInitialState();
}

export function markTermsReadAndAgreed(type: TermsType): void {
  const required = TERMS_ITEMS.some((item) => item.type === type && item.required);
  signupTermsState = {
    ...signupTermsState,
    [type]: {
      hasRead: true,
      agreed: required ? true : signupTermsState[type].agreed,
    },
  };
}

export function setTermsAgreed(type: TermsType, agreed: boolean): void {
  signupTermsState = {
    ...signupTermsState,
    [type]: {
      ...signupTermsState[type],
      agreed,
    },
  };
}
