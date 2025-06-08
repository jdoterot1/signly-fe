// src/app/shared/models/document.model.ts

export type DocumentLanguage = 'Español' | 'Inglés' | string;
export type DocumentStatus =
  | 'Pendiente'
  | 'En Proceso'
  | 'Completado'
  | string;


export interface Document {
  /** Identificador único */
  id: string;

  /** Nombre del documento */
  name: string;

  /** Descripción o resumen (opcional) */
  description?: string;

  /** Fecha de creación (la que aparece como “Fecha de Creación”) */
  creationDate: Date;

  /** Usuario que creó el documento (la columna “Creado por”) */
  createdBy: string;

  /** Idioma del documento */
  language: DocumentLanguage;

  /** Estado actual (Pendiente, En Proceso, Completado…) */
  status: DocumentStatus;

  /** Auditoría */
  registeredBy?: string;
  registerDate?: Date;
  updatedBy?: string;
  updateDate?: Date;
}
