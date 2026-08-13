const USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^01[016789]\d{7,8}$/;

export const NICKNAME_MAX_LENGTH = 30;
export const NICKNAME_RULE_HINT = '영문 소문자, 숫자, _, . 만 사용 (최대 30자)';

export function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeNickname(username));
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return PHONE_PATTERN.test(digits);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function validateLoginForm(input: {
  email: string;
  password: string;
}): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};

  if (!input.email.trim()) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }

  if (!input.password) {
    errors.password = '비밀번호를 입력해 주세요.';
  }

  return errors;
}

export type SignUpFormErrors = {
  email?: string;
  nickname?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export function validateSignUpForm(input: {
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
  agreedPrivacy: boolean;
  agreedService: boolean;
  agreedLocation: boolean;
  agreedAge14: boolean;
}): SignUpFormErrors {
  const errors: SignUpFormErrors = {};

  if (!input.email.trim()) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }

  if (!input.nickname.trim()) {
    errors.nickname = '닉네임을 입력해 주세요.';
  } else if (!isValidUsername(input.nickname)) {
    errors.nickname = NICKNAME_RULE_HINT;
  }

  if (!input.password) {
    errors.password = '비밀번호를 입력해 주세요.';
  } else if (input.password.length < 8) {
    errors.password = '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = '비밀번호를 다시 입력해 주세요.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }

  if (
    !input.agreedPrivacy ||
    !input.agreedService ||
    !input.agreedLocation ||
    !input.agreedAge14
  ) {
    errors.terms = '필수 약관에 모두 동의해 주세요.';
  }

  return errors;
}
