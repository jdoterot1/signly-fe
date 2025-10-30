// src/app/core/constants/role/create/role-create.constants.ts
import { FormConfig } from '../../../../shared/form/form.model';

export const ROLE_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'roleId',
      type: 'text',
      label: 'Identificador del rol',
      placeholder: 'Ej: auditor',
      required: true
    },
    {
      key: 'roleName',
      type: 'text',
      label: 'Nombre del rol',
      placeholder: 'Ej: Administrador',
      required: true
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Describe el propósito del rol'
    }
  ]
};
