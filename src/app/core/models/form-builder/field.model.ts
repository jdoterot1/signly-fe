export type FormFieldType =
  | 'string'
  | 'textarea'
  | 'number'
  | 'email'
  | 'date'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'currency'
  | 'file'
  | 'department'
  | 'city';

export interface FormFieldPaletteItem {
  type: FormFieldType;
  label: string;
  description?: string;
}

