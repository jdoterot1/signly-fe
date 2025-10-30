import { FormConfig } from '../../../../shared/form/form.model';

export const DOCUMENT_LANGUAGES = [
  { name: 'Español', code: 'Español' },
  { name: 'Inglés',  code: 'Inglés'  }
];

export const DOCUMENT_STATUSES = [
  { name: 'Pending',     code: 'Pending' },
  { name: 'In Progress', code: 'In Progress' },
  { name: 'Completed',   code: 'Completed' }
];

export const DOCUMENT_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre del documento',
      placeholder: 'Escribe el nombre del documento',
      required: true
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Escribe una descripción del documento',
      required: true
    },
    {
      key: 'language',
      type: 'select',
      label: 'Idioma',
      placeholder: 'Selecciona un idioma',
      required: true,
      options: DOCUMENT_LANGUAGES
    },
    {
      key: 'status',
      type: 'select',
      label: 'Estado',
      placeholder: 'Selecciona el estado',
      required: true,
      options: DOCUMENT_STATUSES
    },
    {
      key: 'creationDate',
      type: 'date',
      label: 'Fecha de creación',
      placeholder: 'Selecciona la fecha'
    }
  ]
};
