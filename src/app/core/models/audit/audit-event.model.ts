export interface AuditActor {
  id: string;
  type: string;
}

export interface AuditResource {
  id: string | null;
  type: string | null;
}

export interface AuditHttpInfo {
  ip: string;
  method: string;
  path: string;
  query: string | null;
  requestId: string;
  userAgent: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: AuditActor;
  auditId: string;
  http: AuditHttpInfo;
  occurredAt: string;
  resource: AuditResource;
  sqsMessageId: string | null;
  tenantId: string;
}

export interface AuditListResponse {
  code: string;
  data: AuditEvent[];
  message: string;
  meta: Record<string, unknown>;
  status: number;
  success: boolean;
}

export interface AuditEventResponse {
  code: string;
  data: AuditEvent;
  message: string;
  meta: Record<string, unknown>;
  status: number;
  success: boolean;
}

export interface ProcessEvent {
  actor?: string;
  auth?: Record<string, unknown>;
  documentId?: string;
  eventId: string;
  eventType: string;
  fieldId?: string;
  participantId?: string;
  payload?: Record<string, unknown>;
  processId: string;
  status?: string;
  tenantId?: string;
  tenantProcessId?: string;
  timestamp: string;
  timestampUlid?: string;
}

export interface ProcessEventsListResponse {
  code: string;
  data: ProcessEvent[];
  message: string;
  meta: Record<string, unknown>;
  status: number;
  success: boolean;
}
