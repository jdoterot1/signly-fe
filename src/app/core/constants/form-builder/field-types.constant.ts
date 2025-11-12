import { FormFieldPaletteItem } from '../../models/form-builder/field.model';

export const FIELD_TYPES: FormFieldPaletteItem[] = [
  { type: 'string', label: 'Texto (línea)', description: 'Nombres, apellidos, etc.' },
  { type: 'textarea', label: 'Texto (multi-línea)', description: 'Notas o instrucciones' },
  { type: 'number', label: 'Número', description: 'Valores numéricos simples' },
  { type: 'email', label: 'Correo electrónico' },
  { type: 'date', label: 'Fecha' },
  { type: 'datetime', label: 'Fecha y hora' },
  { type: 'select', label: 'Seleccionar (lista)' },
  { type: 'radio', label: 'Selección única (radio)' },
  { type: 'multiselect', label: 'Selección múltiple' },
  { type: 'currency', label: 'Moneda' },
  { type: 'file', label: 'Archivo' },
  { type: 'department', label: 'Departamentos (CO)' },
  { type: 'city', label: 'Ciudades (CO)' }
];

