import { PermissionMatrixRow } from '../../../shared/permissions/permission-matrix/permission-matrix.component';

export const ROLE_PERMISSION_MATRIX: PermissionMatrixRow[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    section: 'General',
    actions: [
      { action: 'view', permission: 'dashboard.view' }
    ]
  },
  {
    key: 'documents',
    label: 'Documentos y procesos',
    section: 'Gestión documental',
    actions: [
      { action: 'create', permission: 'documents.create' },
      { action: 'view', permission: 'documents.view' },
      { action: 'edit', permission: 'documents.edit' },
      { action: 'delete', permission: 'documents.delete' }
    ]
  },
  {
    key: 'templates',
    label: 'Plantillas de documentos',
    section: 'Gestión documental',
    actions: [
      { action: 'create', permission: 'templates.create' },
      { action: 'view', permission: 'templates.view' },
      { action: 'edit', permission: 'templates.edit' },
      { action: 'delete', permission: 'templates.delete' }
    ]
  },
  {
    key: 'users',
    label: 'Usuarios',
    section: 'Administración',
    actions: [
      { action: 'create', permission: 'users.create' },
      { action: 'view', permission: 'users.view' },
      { action: 'edit', permission: 'users.edit' },
      { action: 'delete', permission: 'users.delete' }
    ]
  },
  {
    key: 'roles',
    label: 'Roles y permisos',
    section: 'Administración',
    actions: [
      { action: 'create', permission: 'roles.create' },
      { action: 'view', permission: 'roles.view' },
      { action: 'edit', permission: 'roles.edit' },
      { action: 'delete', permission: 'roles.delete' }
    ]
  },
  {
    key: 'audit',
    label: 'Auditoría',
    section: 'Seguridad',
    actions: [
      { action: 'view', permission: 'audit.view' },
      { action: 'edit', permission: 'audit.manage' }
    ]
  },
  {
    key: 'reports',
    label: 'Reportes',
    section: 'Seguridad',
    actions: [
      { action: 'view', permission: 'report.view' },
      { action: 'create', permission: 'report.generate' }
    ]
  }
];
