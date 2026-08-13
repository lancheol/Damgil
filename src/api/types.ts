export type AgreementsPayload = {
  terms: boolean;
  privacy: boolean;
  age14: boolean;
  location?: boolean;
  marketing?: boolean;
  push?: boolean;
  taste?: boolean;
};

export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
  agreements: AgreementsPayload;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  detail: unknown;
};

export type MeResponse = {
  id: string;
  email: string;
  nickname: string;
  provider: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: unknown;
};

export class ApiError extends Error {
  status: number;
  code: string;
  detail: unknown;

  constructor(status: number, code: string, message: string, detail: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}
