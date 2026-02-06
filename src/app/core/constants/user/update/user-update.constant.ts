// src/app/core/constants/user/update/update-user.constants.ts
import { FormConfig } from '../../../../shared/form/form.model';

export const USER_UPDATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'email',
      type: 'email',
      label: 'Correo electrónico',
      placeholder: 'ejemplo@correo.com',
      required: true,
      disabled: true
    },
    {
      key: 'givenName',
      type: 'text',
      label: 'Nombre',
      placeholder: 'Escribe el primer nombre',
      required: true
    },
    {
      key: 'familyName',
      type: 'text',
      label: 'Apellido',
      placeholder: 'Escribe los apellidos',
      required: true
    },
    {
      key: 'enabled',
      type: 'toggle',
      label: 'Usuario habilitado'
    }
  ]
};
