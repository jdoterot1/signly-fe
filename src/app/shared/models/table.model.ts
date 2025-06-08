// src/app/shared/models/table.model.ts
import { TemplateRef } from '@angular/core';

export interface TableColumn<T = any> {
  /** nombre de la propiedad en la fila */
  field?: keyof T;
  /** encabezado de la columna */
  header: string;
  /** (opcional) template de acciones */
  actionsTpl?: TemplateRef<{ $implicit: T }>;
}

export type TableData = Record<string, any>;
