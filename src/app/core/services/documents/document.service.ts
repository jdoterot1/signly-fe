// src/app/core/services/documents/document.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { AuthService } from '../auth/auth.service';
import {
  CreateDocumentRequest,
  Document,
  DocumentApi,
  DocumentLanguage,
  DocumentStatus,
  ExtendDocumentRequest,
  DocumentCancelResponse
} from '../../models/documents/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly baseUrl = `${environment.apiBaseUrl}/documents`;
  private readonly processSnapshotStorageKey = 'signly.documents.process.snapshot';

  constructor(private http: HttpClient, private authService: AuthService) {}

  listDocuments(): Observable<DocumentApi[]> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<DocumentApi[]>>(this.baseUrl, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  /** Obtener todos los documentos (mapeados para UI) */
  getAllDocuments(): Observable<Document[]> {
    return this.listDocuments().pipe(map(list => list.map(doc => this.mapToUi(doc))));
  }

  getDocumentDetail(documentId: string): Observable<DocumentApi> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<DocumentApi>>(`${this.baseUrl}/${documentId}`, { headers }).pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      )
    );
  }

  /** Obtener un documento por ID (mapeado para UI) */
  getDocumentById(id: string): Observable<Document> {
    return this.getDocumentDetail(id).pipe(map(doc => this.mapToUi(doc)));
  }

  /** Crear un nuevo documento */
  createDocument(payload: CreateDocumentRequest): Observable<DocumentApi> {
    return this.withHeaders(
      headers =>
        this.http.post<ApiResponse<DocumentApi>>(this.baseUrl, payload, { headers }).pipe(
          map(res => {
            const data = res.data;
            this.rememberProcessSnapshot(data);
            return data;
          }),
          catchError(err => this.handleError(err))
        ),
      true
    );
  }

  getProcessIdFromSnapshot(documentId: string, participantId: string): string | null {
    if (!documentId || !participantId) {
      return null;
    }
    const snapshot = this.readProcessSnapshot();
    return snapshot?.[documentId]?.[participantId] ?? null;
  }

  /** Cancelar un documento */
  cancelDocument(documentId: string): Observable<void> {
    return this.withHeaders(headers =>
      this.http
        .delete<ApiResponse<DocumentCancelResponse>>(`${this.baseUrl}/${documentId}/cancel`, { headers })
        .pipe(
          map(() => void 0),
          catchError(err => this.handleError(err))
        )
    );
  }

  /** Alias para compatibilidad con UI */
  deleteDocument(id: string): Observable<void> {
    return this.cancelDocument(id);
  }

  /** Reenviar invitación a participante */
  resendInvitation(documentId: string, participantId: string): Observable<void> {
    return this.withHeaders(headers =>
      this.http
        .post<ApiResponse<{ documentId: string; participantId: string }>>(
          `${this.baseUrl}/${documentId}/participants/${participantId}/resend`,
          {},
          { headers }
        )
        .pipe(
          map(() => void 0),
          catchError(err => this.handleError(err))
        )
    );
  }

  /** Extender fecha límite */
  extendDocument(documentId: string, payload: ExtendDocumentRequest): Observable<DocumentApi> {
    return this.withHeaders(
      headers =>
        this.http
          .post<ApiResponse<DocumentApi>>(`${this.baseUrl}/${documentId}/extend`, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  private withHeaders<T>(fn: (headers: HttpHeaders) => Observable<T>, includeJson = false): Observable<T> {
    try {
      const headers = this.buildHeaders(includeJson);
      return fn(headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo establecer la sesión.';
      return throwError(() => new Error(message));
    }
  }

  private buildHeaders(includeJson = false): HttpHeaders {
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('No existe una sesión activa para ejecutar esta operación.');
    }
    let headers = new HttpHeaders().set('X-Auth-Signly', `Bearer ${token}`);
    if (includeJson) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'Ocurrió un error al procesar la solicitud.';
    const wrapped: any = new Error(message);
    wrapped.status = error?.status ?? error?.error?.status;
    wrapped.code = error?.error?.code;
    wrapped.details = error?.error?.error?.details ?? error?.error?.details;
    return throwError(() => wrapped);
  }

  private mapToUi(doc: DocumentApi): Document {
    const creationDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
    const updateDate = doc.updatedAt ? new Date(doc.updatedAt) : undefined;
    return {
      id: doc.documentId,
      name: this.resolveDocumentName(doc),
      description: this.resolveDocumentDescription(doc),
      creationDate,
      createdBy: doc.createdBy,
      language: this.resolveDocumentLanguage(doc),
      status: this.mapStatus(doc.status),
      registeredBy: doc.createdBy,
      registerDate: creationDate,
      updatedBy: doc.updatedBy ?? doc.createdBy,
      updateDate
    };
  }

  private rememberProcessSnapshot(doc: DocumentApi | null | undefined): void {
    if (!doc?.documentId || !doc.participants?.length || typeof window === 'undefined') {
      return;
    }

    const current = this.readProcessSnapshot();
    const byParticipant: Record<string, string> = { ...(current[doc.documentId] ?? {}) };
    for (const participant of doc.participants) {
      if (participant.participantId && participant.processId) {
        byParticipant[participant.participantId] = participant.processId;
      }
    }

    if (!Object.keys(byParticipant).length) {
      return;
    }

    const nextSnapshot = {
      ...current,
      [doc.documentId]: byParticipant
    };
    this.writeProcessSnapshot(nextSnapshot);
  }

  private readProcessSnapshot(): Record<string, Record<string, string>> {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(this.processSnapshotStorageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeProcessSnapshot(snapshot: Record<string, Record<string, string>>): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(this.processSnapshotStorageKey, JSON.stringify(snapshot));
    } catch {
      // no-op (private mode / quota / storage blocked)
    }
  }

  private resolveDocumentName(doc: DocumentApi): string {
    const metadataName = doc.metadata?.['name'];
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName;
    }
    const shortId = doc.documentId ? doc.documentId.split('-')[0] : 'Documento';
    return `Documento ${shortId}`;
  }

  private resolveDocumentDescription(doc: DocumentApi): string | undefined {
    const metadataDescription = doc.metadata?.['description'];
    if (typeof metadataDescription === 'string' && metadataDescription.trim()) {
      return metadataDescription;
    }
    if (doc.templateId) {
      const version = doc.templateVersion ? ` v${doc.templateVersion}` : '';
      return `Plantilla ${doc.templateId}${version}`;
    }
    return undefined;
  }

  private resolveDocumentLanguage(doc: DocumentApi): DocumentLanguage {
    const metadataLanguage = doc.metadata?.['language'];
    if (typeof metadataLanguage === 'string' && metadataLanguage.trim()) {
      return metadataLanguage;
    }
    return 'N/A';
  }

  private mapStatus(status?: string): DocumentStatus {
    if (!status) {
      return 'N/A';
    }
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
      case 'PENDING':
      case 'DRAFT':
        return 'Creado';
      case 'IN_PROGRESS':
      case 'IN_PROGRESS_SIGNING':
      case 'STARTED':
        return 'En proceso';
      case 'COMPLETED':
      case 'SIGNED':
      case 'FINISHED':
        return 'Completado';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelado';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return normalized;
    }
  }
}
