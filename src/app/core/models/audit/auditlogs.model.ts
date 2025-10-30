// src/app/core/models/audit/audit-log.model.ts

export type AuditRole = 'Firmante' | 'Validador' | string;
export type AuditStatus = 'Exitoso' | 'Validado' | string;
export type AuditMethod = 'Firma Biométrica' | 'OTP Email' | string;

export interface AuditLog {
  /** ID único del registro de auditoría */
  id: string;

  /** ID del documento relacionado */
  id_document: string;

  /** Nombre del participante */
  name: string;

  /** Rol en el proceso (Firmante o Validador) */
  role: AuditRole;

  /** Estado de la acción */
  status: AuditStatus;

  /** Acción realizada */
  action: string;

  /** Observación adicional */
  observation: string;

  /** Método de validación/firma utilizado */
  method: AuditMethod;
}
