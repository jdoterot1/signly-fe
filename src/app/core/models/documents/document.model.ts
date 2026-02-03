// src/app/shared/models/document.model.ts

export type DocumentLanguage = 'Español' | 'Inglés' | string;
export type DocumentStatus =
  | 'Pendiente'
  | 'En Proceso'
  | 'Completado'
  | 'Cancelada'
  | 'Fallida'
  | string;

export type DocumentOrderMode = 'SEQUENTIAL' | 'PARALLEL' | string;
export type DocumentSignatureMode =
  | 'SIGNATURE_EMAIL'
  | 'SIGNATURE_SMS'
  | 'SIGNATURE_BIOMETRIC_PLUS'
  | string;
export type DocumentApiStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | string;

export interface DocumentParticipantIdentity {
  email?: string | null;
  phone?: string | null;
  documentNumber?: string | null;
}

export interface DocumentParticipantPolicy {
  attemptsMax?: number | string;
  cooldownSeconds?: number | string;
}

export interface DocumentParticipant {
  displayName: string;
  identity: DocumentParticipantIdentity;
  order?: string;
  participantId?: string;
  policy?: DocumentParticipantPolicy;
  signatureMode?: DocumentSignatureMode[];
  currentStep?: string;
  enabled?: boolean;
  processId?: string;
  status?: string;
}

export interface DocumentApi {
  createdAt?: string;
  createdBy: string;
  deadlineAt?: string | null;
  documentId: string;
  metadata?: Record<string, unknown>;
  orderMode?: DocumentOrderMode;
  participants?: DocumentParticipant[];
  startAt?: string | null;
  status: DocumentApiStatus;
  tags?: string[];
  templateId: string;
  templateVersion?: string;
  tenantId?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: string | number;
}

export interface CreateDocumentParticipant {
  signatureMode: DocumentSignatureMode[];
  policy?: {
    attemptsMax: number;
    cooldownSeconds: number;
  };
  displayName: string;
  identity: DocumentParticipantIdentity;
  order?: string;
}

export interface CreateDocumentRequest {
  templateId: string;
  templateVersion: string;
  participants: CreateDocumentParticipant[];
  flowPolicy?: {
    onParticipantFail: string;
  };
  orderMode?: DocumentOrderMode;
  deadlineAt?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  startAt?: string | null;
}

export interface ExtendDocumentRequest {
  newDeadlineAt: string;
}

export interface DocumentCancelResponse {
  documentId: string;
}

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

  /** status actual (Pendiente, En Proceso, Completado…) */
  status: DocumentStatus;

  /** Auditoría */
  registeredBy?: string;
  registerDate?: Date;
  updatedBy?: string;
  updateDate?: Date;
}
