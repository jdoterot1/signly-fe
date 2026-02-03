import { FormConfig } from '../../../../shared/form/form.model';

export const DOCUMENT_LANGUAGES = [
  { name: 'Español', code: 'Español' },
  { name: 'Inglés',  code: 'Inglés'  }
];

export const DOCUMENT_ORDER_MODES = [
  { name: 'Secuencial', code: 'SEQUENTIAL' },
  { name: 'Paralelo', code: 'PARALLEL' }
];

export const DOCUMENT_SIGNATURE_MODES = [
  { name: 'Firma por Email', code: 'SIGNATURE_EMAIL' },
  { name: 'Firma por SMS', code: 'SIGNATURE_SMS' },
  { name: 'Firma Biométrica', code: 'SIGNATURE_BIOMETRIC_PLUS' }
];

export const DOCUMENT_CREATE_FORM_CONFIG: FormConfig = {
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre del documento',
      placeholder: 'Ej: Contrato de servicios',
      required: true
    },
    {
      key: 'description',
      type: 'textarea',
      label: 'Descripción',
      placeholder: 'Resumen breve del documento'
    },
    {
      key: 'templateId',
      type: 'select',
      label: 'Template ID',
      placeholder: 'Selecciona un template',
      required: true
    },
    {
      key: 'templateVersion',
      type: 'select',
      label: 'Template Version',
      placeholder: 'Selecciona una versión',
      required: true
    },
    {
      key: 'orderMode',
      type: 'select',
      label: 'Modo de Orden',
      placeholder: 'Selecciona el modo',
      required: true,
      options: DOCUMENT_ORDER_MODES
    },
    {
      key: 'deadlineAt',
      type: 'date',
      label: 'Fecha límite',
      placeholder: 'Selecciona la fecha'
    },
    {
      key: 'language',
      type: 'select',
      label: 'Idioma',
      placeholder: 'Selecciona un idioma',
      options: DOCUMENT_LANGUAGES
    },
    {
      key: 'signatureMode',
      type: 'select',
      label: 'Modo de Firma',
      placeholder: 'Selecciona el modo',
      required: true,
      options: DOCUMENT_SIGNATURE_MODES
    },
    {
      key: 'participantName',
      type: 'text',
      label: 'Nombre del participante',
      placeholder: 'Nombre completo',
      required: true
    },
    {
      key: 'participantEmail',
      type: 'email',
      label: 'Email del participante',
      placeholder: 'correo@ejemplo.com'
    },
    {
      key: 'participantPhone',
      type: 'text',
      label: 'Teléfono del participante',
      placeholder: '+573001112233'
    },
    {
      key: 'participantDocumentNumber',
      type: 'text',
      label: 'Documento del participante',
      placeholder: 'Requerido para firma biométrica'
    },
    {
      key: 'attemptsMax',
      type: 'text',
      label: 'Intentos máximos',
      placeholder: 'Ej: 3'
    },
    {
      key: 'cooldownSeconds',
      type: 'text',
      label: 'Cooldown (segundos)',
      placeholder: 'Ej: 60'
    }
  ]
};
