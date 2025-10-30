// src/app/shared/models/template.model.ts

export type TemplateLanguage = 'Inglés' | 'Español' | string;
export type TemplateStatus   = 'Pendiente' | 'En Proceso' | 'Completado' | string;

export interface Template {
  /** Unique identifier */
  id: string;

  /** Template name */
  name: string;

  /** Description (optional) */
  description?: string;

  /** Creation date */
  creationDate: Date;

  /** Created by */
  createdBy: string;

  /** Language */
  language: TemplateLanguage;

  /** Current status */
  status: TemplateStatus;

  /** Audit (optional) */
  registeredBy?: string;
  registerDate?: Date;
  updatedBy?: string;
  updateDate?: Date;
}
