export interface UserAttributes {
  email?: string;
  email_verified?: string;
  sub?: string;
  'custom:signly_tenant_id'?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: string | undefined;
}

export interface UserSummary {
  sub: string;
  username: string;
  email: string;
  email_verified: boolean;
  enabled: boolean;
  status: string;
  tenant_id?: string | null;
  created_at?: string;
  updated_at?: string;
  mfa_options?: any;
  attributes?: UserAttributes;
  name?: string;
}

export interface CreateUserPayload {
  email: string;
  tmp_password: string;
  attributes: {
    given_name: string;
    family_name: string;
  };
}

export interface UpdateUserAttributesPayload {
  attributes: {
    given_name?: string;
    family_name?: string;
    [key: string]: string | undefined;
  };
}

export interface UpdateUserStatusPayload {
  enabled: boolean;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  enabled: boolean;
  name?: string;
}
