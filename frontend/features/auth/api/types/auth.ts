export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type AccessTokenData = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type AuthData = {
  user: AuthUser;
  tokens: TokenPair;
};

export type LogoutData = {
  message: string;
};

export type BackendError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

export type BackendResponse<T> = {
  data: T | null;
  error: BackendError | null;
};
