import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  AuditEvent,
  AuditEventResponse,
  AuditListResponse,
  ProcessEvent,
  ProcessEventsListResponse
} from '../../models/audit/audit-event.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAuditEvents(limit = 50): Observable<AuditEvent[]> {
    return this.executeWithHeaders(headers => {
      let params = new HttpParams();
      if (limit) {
        params = params.set('limit', limit.toString());
      }
      return this.http
        .get<AuditListResponse>(`${this.baseUrl}/audit`, { headers, params })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        );
    });
  }

  getAuditEventById(id: string): Observable<AuditEvent> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<AuditEventResponse>(`${this.baseUrl}/audit/${id}`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  getEventsByProcessId(processId: string, limit = 30): Observable<ProcessEvent[]> {
    return this.executeWithHeaders(headers => {
      let params = new HttpParams();
      if (limit) {
        params = params.set('limit', limit.toString());
      }
      return this.http
        .get<ProcessEventsListResponse>(`${this.baseUrl}/events/${encodeURIComponent(processId)}`, { headers, params })
        .pipe(
          map(res => res.data ?? []),
          catchError(err => this.handleError(err))
        );
    });
  }

  private executeWithHeaders<T>(fn: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    try {
      const headers = this.buildHeaders();
      return fn(headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo establecer la sesión.';
      return throwError(() => new Error(message));
    }
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('No existe una sesión activa para ejecutar esta operación.');
    }
    return new HttpHeaders().set('X-Auth-Signly', `Bearer ${token}`);
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'Hubo un problema al obtener los registros de auditoría.';
    return throwError(() => new Error(message));
  }
}
