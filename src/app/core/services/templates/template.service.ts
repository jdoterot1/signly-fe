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
      this.http.get<ApiResponse<TemplateField[]>>(`${this.baseUrl}/${templateId}/fields`, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  updateTemplateFields(templateId: string, fields: TemplateField[]): Observable<TemplateField[]> {
    return this.withHeaders(
      headers =>
        this.http.put<ApiResponse<TemplateField[]>>(`${this.baseUrl}/${templateId}/fields`, fields, { headers }).pipe(
          map(res => res.data ?? []),
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
