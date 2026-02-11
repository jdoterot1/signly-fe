export interface Role {
  roleId: string;
  roleName: string;
  description?: string;
  permissions: string[];
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number | string;
}
