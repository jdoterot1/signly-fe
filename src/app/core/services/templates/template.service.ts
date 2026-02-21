// src/app/core/services/templates/template.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { AuthService } from '../auth/auth.service';
import {
  CreateTemplateRequest,
  Template,
  TemplateApi,
  TemplateDownloadUrlResponse,
  TemplateField,
  TemplateFieldGrouped,
  TemplateFieldPlacement,
  TemplateLanguage,
  TemplateUploadUrlResponse,
  TemplateStatus,
  UpdateTemplateRequest
} from '../../models/templates/template.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private readonly baseUrl = `${environment.apiBaseUrl}/templates`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  listTemplates(): Observable<TemplateApi[]> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<TemplateApi[]>>(this.baseUrl, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  /** Obtener todos los templates (mapeados para UI) */
  getAllTemplates(): Observable<Template[]> {
    return this.listTemplates().pipe(map(list => list.map(t => this.mapToUi(t))));
  }

  getTemplateDetail(templateId: string): Observable<TemplateApi> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<TemplateApi>>(`${this.baseUrl}/${templateId}`, { headers }).pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      )
    );
  }

  /** Obtener un template por ID (mapeado para UI) */
  getTemplateById(id: string): Observable<Template> {
    return this.getTemplateDetail(id).pipe(map(t => this.mapToUi(t)));
  }

  getTemplateHistory(templateId: string): Observable<TemplateApi[]> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<TemplateApi[]>>(`${this.baseUrl}/${templateId}/history`, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  getTemplateVersion(templateId: string, version: string): Observable<TemplateApi> {
    return this.withHeaders(headers =>
      this.http
        .get<ApiResponse<TemplateApi>>(`${this.baseUrl}/${templateId}/versions/${version}`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  getTemplateFields(templateId: string): Observable<TemplateField[]> {
    return this.withHeaders(headers =>
      this.http.get<ApiResponse<unknown>>(`${this.baseUrl}/${templateId}/fields`, { headers }).pipe(
        map(res => this.flattenTemplateFields(this.extractTemplateFieldsData(res.data))),
        catchError(err => this.handleError(err))
      )
    );
  }

  updateTemplateFields(templateId: string, fields: TemplateField[]): Observable<TemplateField[]> {
    const payload = this.groupTemplateFields(fields);
    return this.withHeaders(
      headers =>
        this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${templateId}/fields`, payload, { headers }).pipe(
          map(res => this.flattenTemplateFields(this.extractTemplateFieldsData(res.data))),
          catchError(err => this.handleError(err))
        ),
      true
    );
  }

  getTemplateUploadUrl(templateId: string, version: string): Observable<TemplateUploadUrlResponse> {
    return this.withHeaders(headers =>
      this.http
        .post<ApiResponse<TemplateUploadUrlResponse>>(
          `${this.baseUrl}/${templateId}/versions/${version}/upload-url`,
          '',
          { headers: headers.set('Content-Type', 'application/x-www-form-urlencoded') }
        )
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  getTemplateDownloadUrl(templateId: string, version: string): Observable<TemplateDownloadUrlResponse> {
    return this.withHeaders(headers =>
      this.http
        .get<ApiResponse<TemplateDownloadUrlResponse>>(`${this.baseUrl}/${templateId}/versions/${version}/download-url`, {
          headers
        })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  /** Crear un nuevo template */
  createTemplate(payload: CreateTemplateRequest): Observable<TemplateApi> {
    return this.withHeaders(
      headers =>
        this.http.post<ApiResponse<TemplateApi>>(this.baseUrl, payload, { headers }).pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        ),
      true
    );
  }

  /** Actualizar un template existente */
  updateTemplate(templateId: string, payload: UpdateTemplateRequest): Observable<TemplateApi> {
    return this.withHeaders(
      headers =>
        this.http.put<ApiResponse<TemplateApi>>(`${this.baseUrl}/${templateId}`, payload, { headers }).pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        ),
      true
    );
  }

  /** Eliminar un template por ID (todas las versiones) */
  deleteTemplate(id: string): Observable<void> {
    return this.withHeaders(headers =>
      this.http.delete<ApiResponse<{ templateId: string }>>(`${this.baseUrl}/${id}`, { headers }).pipe(
        map(() => void 0),
        catchError(err => this.handleError(err))
      )
    );
  }

  /** Eliminar una versión específica */
  deleteTemplateVersion(templateId: string, version: string): Observable<void> {
    return this.withHeaders(headers =>
      this.http
        .delete<ApiResponse<{ templateId: string; version: string }>>(
          `${this.baseUrl}/${templateId}/versions/${version}`,
          { headers }
        )
        .pipe(
          map(() => void 0),
          catchError(err => this.handleError(err))
        )
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
    return throwError(() => new Error(message));
  }

  private extractTemplateFieldsData(data: unknown): unknown[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      const maybeFields = (data as { fields?: unknown }).fields;
      if (Array.isArray(maybeFields)) {
        return maybeFields;
      }
    }
    return [];
  }

  private flattenTemplateFields(fields: unknown[]): TemplateField[] {
    const normalized: TemplateField[] = [];

    fields.forEach((field, index) => {
      if (!field || typeof field !== 'object') {
        return;
      }

      const source = field as {
        fieldName?: unknown;
        fieldType?: unknown;
        fieldCode?: unknown;
        page?: unknown;
        x?: unknown;
        y?: unknown;
        width?: unknown;
        height?: unknown;
        placements?: unknown;
      };

      const fieldName = String(source.fieldName ?? `CAMPO_${index + 1}`);
      const fieldType = String(source.fieldType ?? 'text');
      const fieldCode = source.fieldCode ?? '1';
      const placements = Array.isArray(source.placements) ? source.placements : null;

      if (placements?.length) {
        placements.forEach((placement, placementIndex) => {
          if (!placement || typeof placement !== 'object') {
            return;
          }
          const coords = placement as {
            page?: unknown;
            x?: unknown;
            y?: unknown;
            width?: unknown;
            height?: unknown;
          };

          normalized.push({
            page: this.coalesceToStringOrNumber(coords.page, 1),
            x: this.coalesceToStringOrNumber(coords.x, 0),
            y: this.coalesceToStringOrNumber(coords.y, 0),
            width: this.coalesceToStringOrNumber(coords.width, 120),
            height: this.coalesceToStringOrNumber(coords.height, 40),
            fieldName,
            fieldType,
            fieldCode: this.coalesceToStringOrNumber(fieldCode, placementIndex + 1)
          });
        });
        return;
      }

      normalized.push({
        page: this.coalesceToStringOrNumber(source.page, 1),
        x: this.coalesceToStringOrNumber(source.x, 0),
        y: this.coalesceToStringOrNumber(source.y, 0),
        width: this.coalesceToStringOrNumber(source.width, 120),
        height: this.coalesceToStringOrNumber(source.height, 40),
        fieldName,
        fieldType,
        fieldCode: this.coalesceToStringOrNumber(fieldCode, 1)
      });
    });

    return normalized;
  }

  private groupTemplateFields(fields: TemplateField[]): TemplateFieldGrouped[] {
    const grouped = new Map<string, TemplateFieldGrouped>();

    fields.forEach((field, index) => {
      const fieldName = String(field.fieldName || `CAMPO_${index + 1}`);
      const fieldType = String(field.fieldType || 'text');
      const fieldCode = this.coalesceToStringOrNumber(field.fieldCode, 1);
      const key = `${fieldName}||${fieldType}||${fieldCode}`;

      const placement: TemplateFieldPlacement = {
        page: this.coalesceToStringOrNumber(field.page, 1),
        x: this.coalesceToStringOrNumber(field.x, 0),
        y: this.coalesceToStringOrNumber(field.y, 0),
        width: this.coalesceToStringOrNumber(field.width, 120),
        height: this.coalesceToStringOrNumber(field.height, 40)
      };

      const existing = grouped.get(key);
      if (existing) {
        existing.placements.push(placement);
        return;
      }

      grouped.set(key, {
        fieldName,
        fieldType,
        fieldCode,
        placements: [placement]
      });
    });

    return Array.from(grouped.values());
  }

  private coalesceToStringOrNumber(value: unknown, fallback: string | number): string | number {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    return fallback;
  }

  private mapToUi(template: TemplateApi): Template {
    const creationDate = template.createdAt ? new Date(template.createdAt) : new Date();
    const updateDate = template.updatedAt ? new Date(template.updatedAt) : undefined;
    return {
      id: template.templateId,
      name: template.templateName,
      description: template.description ?? undefined,
      creationDate,
      createdBy: template.createdBy,
      language: this.resolveTemplateLanguage(template),
      status: this.resolveTemplateStatus(template),
      registeredBy: template.createdBy,
      registerDate: creationDate,
      updatedBy: template.updatedBy ?? template.createdBy,
      updateDate
    };
  }

  private resolveTemplateLanguage(_template: TemplateApi): TemplateLanguage {
    return 'N/A';
  }

  private resolveTemplateStatus(_template: TemplateApi): TemplateStatus {
    return 'Active';
  }
}
