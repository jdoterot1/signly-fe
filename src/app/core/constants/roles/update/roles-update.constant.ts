// src/app/core/constants/role/update/role-update.constants.ts
import { FormConfig } from '../../../../shared/form/form.model';

export const ROLE_UPDATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre del rol',
      placeholder: 'Ej: Administrador',
      required: true
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Describe el propósito del rol',
      required: true
    },
    {
      key: 'status',
      type: 'toggle',
      label: 'Estado'
    }
  ]
};
