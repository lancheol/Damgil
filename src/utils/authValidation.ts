const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/;
const PHONE_PATTERN = /^01[016789]\d{7,8}$/;

export type VisibilityRange = 'public' | 'private';

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return PHONE_PATTERN.test(digits);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function validateLoginForm(input: {
  username: string;
  password: string;
}): { username?: string; password?: string } {
  const errors: { username?: string; password?: string } = {};

  if (!input.username.trim()) {
    errors.username = '사용자 이름을 입력해 주세요.';
  } else if (!isValidUsername(input.username)) {
    errors.username = '영문, 숫자, ., _ 만 사용 (3~20자)';
  }

  if (!input.password) {
    errors.password = '비밀번호를 입력해 주세요.';
  } else if (input.password.length < 6) {
    errors.password = '비밀번호는 6자 이상이어야 합니다.';
  }

  return errors;
}

export type SignUpFormErrors = {
  username?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  phoneVerified?: string;
  terms?: string;
  visibility?: string;
};

export function validateSignUpForm(input: {
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  phoneVerified: boolean;
  agreedService: boolean;
  agreedPrivacy: boolean;
  visibility: VisibilityRange | null;
}): SignUpFormErrors {
  const errors: SignUpFormErrors = {
    ...validateLoginForm({
      username: input.username,
      password: input.password,
    }),
  };

  if (!input.confirmPassword) {
    errors.confirmPassword = '비밀번호를 다시 입력해 주세요.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }

  if (!input.phone.trim()) {
    errors.phone = '전화번호를 입력해 주세요.';
  } else if (!isValidPhone(input.phone)) {
    errors.phone = '올바른 휴대폰 번호 형식이 아닙니다.';
  } else if (!input.phoneVerified) {
    errors.phoneVerified = '전화번호 인증을 완료해 주세요.';
  }

  if (!input.agreedService || !input.agreedPrivacy) {
    errors.terms = '약관을 읽고 모두 동의해 주세요.';
  }

  if (!input.visibility) {
    errors.visibility = '공개 범위를 선택해 주세요.';
  }

  return errors;
}
