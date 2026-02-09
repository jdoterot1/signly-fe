export interface ApiMeta {
  api_version?: string;
  request_id?: string;
  tenant_id?: string | null;
  timestamp?: string;
}

export interface ApiResponse<T> {
  code: string;
  data: T;
  message: string;
  meta?: ApiMeta;
  status: number;
  success: boolean;
}

export interface AuthUserPayload {
  email: string;
  name: string | null;
  picture: string | null;
  tenant_id: string | null;
  user_id: string;
}

export interface LoginSuccessPayload {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUserPayload;
}

export interface RefreshTokenPayload {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MePayload {
  attributes: {
    email?: string;
    email_verified?: string;
    sub?: string;
  };
  mfa_methods: string[] | null;
  mfa_options: string[] | null;
  tenant_id: string | null;
  username: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    email: string;
    name: string | null;
    picture: string | null;
    tenantId: string | null;
    userId: string;
  };
}
