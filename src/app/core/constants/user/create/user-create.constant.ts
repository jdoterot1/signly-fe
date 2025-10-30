// src/app/core/constants/user/create/user-create.constants.ts
import { FormConfig } from '../../../../shared/form/form.model';

export const USER_ROLES = [
  { name: 'Administrador', code: 'admin' },
  { name: 'Editor',       code: 'editor' },
  { name: 'Usuario',      code: 'usuario' }
];

export const USER_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre completo',
      placeholder: 'Escribe el nombre completo',
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
      key: 'password',
      type: 'password',
      label: 'Contraseña',
      placeholder: 'Mínimo 6 caracteres',
      required: true
    },
    {
      key: 'role',
      type: 'select',
      label: 'Rol del sistema',
      placeholder: 'Selecciona un rol',
      required: true,
      options: USER_ROLES
    },
    {
      key: 'active',
      type: 'toggle',
      label: 'Estado'
    },
    {
      key: 'birthDate',
      type: 'date',
      label: 'Fecha de nacimiento',
      placeholder: 'Selecciona una fecha'
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Escribe una nota o descripción del usuario'
    }
  ]
};
