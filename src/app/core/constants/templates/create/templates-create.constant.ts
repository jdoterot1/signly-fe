import { FormConfig } from '../../../../shared/form/form.model';

export const TEMPLATE_LANGUAGES = [
  { name: 'Español', code: 'Spanish' },
  { name: 'Inglés', code: 'English' }
];

export const TEMPLATE_STATUSES = [
  { name: 'Pendiente', code: 'Pending' },
  { name: 'En Proceso', code: 'In Progress' },
  { name: 'Completado', code: 'Completed' }
];

export const TEMPLATE_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre de la Plantilla',
      placeholder: 'Escribe el nombre de la plantilla',
      required: true
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Describe brevemente la plantilla'
    },
    {
      key: 'language',
      type: 'select',
      label: 'Idioma',
      placeholder: 'Selecciona el idioma',
      required: true,
      options: TEMPLATE_LANGUAGES
    },
    {
      key: 'status',
      type: 'select',
      label: 'Estado',
      placeholder: 'Selecciona el estado',
      required: true,
      options: TEMPLATE_STATUSES
    }
  ]
};
