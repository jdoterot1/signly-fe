import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  WebhookSummary,
  WebhookDetail,
  CreateWebhookPayload,
  UpdateWebhookPayload,
  UpdateWebhookStatusPayload
} from '../../models/webhooks/webhook.model';
import { ApiResponse } from '../../models/auth/auth-session.model';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private readonly baseUrl = `${environment.apiBaseUrl}/webhooks`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getWebhooks(limit = 20, nextToken?: string): Observable<WebhookSummary[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (nextToken) {
      params = params.set('nextToken', nextToken);
    }

    return this.withHeaders(headers =>
      this.http
        .get<ApiResponse<WebhookSummary[]>>(this.baseUrl, { headers, params })
        .pipe(
          map(res => res.data ?? []),
          catchError(err => this.handleError(err))
        )
    );
  }

  getWebhookById(webhookId: string): Observable<WebhookDetail> {
    return this.withHeaders(headers =>
      this.http
        .get<ApiResponse<WebhookDetail>>(`${this.baseUrl}/${webhookId}`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  createWebhook(payload: CreateWebhookPayload): Observable<WebhookDetail> {
    return this.withHeaders(
      headers =>
        this.http
          .post<ApiResponse<WebhookDetail>>(this.baseUrl, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  updateWebhook(webhookId: string, payload: UpdateWebhookPayload): Observable<WebhookDetail> {
    return this.withHeaders(
      headers =>
        this.http
          .put<ApiResponse<WebhookDetail>>(`${this.baseUrl}/${webhookId}`, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  updateWebhookStatus(webhookId: string, payload: UpdateWebhookStatusPayload): Observable<void> {
    return this.withHeaders(
      headers =>
        this.http
          .put<ApiResponse<{ webhookId: string; status: string }>>(
            `${this.baseUrl}/${webhookId}/status`,
            payload,
            { headers }
          )
          .pipe(
            map(() => void 0),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  deleteWebhook(webhookId: string): Observable<void> {
    return this.withHeaders(headers =>
      this.http
        .delete<ApiResponse<{ webhookId: string }>>(`${this.baseUrl}/${webhookId}`, { headers })
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
}
