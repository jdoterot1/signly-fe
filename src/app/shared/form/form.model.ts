// src/app/shared/form/form.model.ts
import { ValidatorFn } from '@angular/forms';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'toggle'
  | 'date'
  | 'textarea'
  | 'group';

export interface FormField {
  key: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: { name: string; code: any }[];     // para 'select' y 'multiselect'
  required?: boolean;                           // muestra asterisco y agrega Validators.required
  validators?: ValidatorFn[];                   // otros validadotes
  children?: FormField[];                       // solo para type = 'group'
  disabled?: boolean;
  hidden?: boolean;
  minDate?: Date;
  showTime?: boolean;
  hourFormat?: '12' | '24';
  dateFormat?: string;
}

export interface FormConfig {
  fields: FormField[];
}
