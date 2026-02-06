// src/app/core/constants/user/create/user-create.constants.ts
import { FormConfig } from '../../../../shared/form/form.model';

export const USER_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
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
      key: 'email',
      type: 'email',
      label: 'Correo electrónico',
      placeholder: 'ejemplo@correo.com',
      required: true
    },
    {
      key: 'tmpPassword',
      type: 'password',
      label: 'Contraseña temporal',
      placeholder: 'Define la contraseña temporal',
      required: true
    }
  ]
};
