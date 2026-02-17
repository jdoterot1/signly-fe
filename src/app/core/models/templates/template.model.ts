// src/app/shared/models/template.model.ts

export type TemplateLanguage = 'Inglés' | 'Español' | string;
export type TemplateStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' |  string;

export interface TemplateApiField {
  [key: string]: unknown;
}

export interface TemplateField {
  page: number | string;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  fieldName: string;
  fieldType: string;
  fieldCode: number | string;
}

export interface TemplateUploadUrlResponse {
  s3Uri: string;
  uploadUrl: string;
}

export interface TemplateDownloadUrlResponse {
  downloadUrl: string;
  s3Uri: string;
}

export interface TemplateApi {
  createdAt?: string;
  createdBy: string;
  description?: string | null;
  fields?: TemplateApiField[];
  s3Uri?: string | null;
  templateId: string;
  templateName: string;
  templateVersion?: string;
  tenantId?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: string | number;
}

export interface CreateTemplateRequest {
  templateName: string;
  description?: string;
}

export interface UpdateTemplateRequest {
  templateName?: string;
  description?: string;
}

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
