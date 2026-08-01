const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function validateLoginForm(input: {
  email: string;
  password: string;
}): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {};

  if (!input.email.trim()) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (!isValidEmail(input.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }

  if (!input.password) {
    errors.password = '비밀번호를 입력해 주세요.';
  } else if (input.password.length < 6) {
    errors.password = '비밀번호는 6자 이상이어야 합니다.';
  }

  return errors;
}

export function validateSignUpForm(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): { email?: string; password?: string; confirmPassword?: string } {
  const errors = validateLoginForm(input) as {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (!input.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해 주세요.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }

  return errors;
}
