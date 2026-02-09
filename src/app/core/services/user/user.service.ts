import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  UserSummary,
  CreateUserPayload,
  CreateUserResponse,
  UpdateUserAttributesPayload,
  UpdateUserStatusPayload
} from '../../models/auth/user.model';
import { ApiResponse } from '../../models/auth/auth-session.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsers(limit = 20, nextToken?: string): Observable<UserSummary[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (nextToken) {
      params = params.set('nextToken', nextToken);
    }

    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<UserSummary[]>>(this.baseUrl, { headers, params })
        .pipe(
          map(res => res.data ?? []),
          catchError(err => this.handleError(err))
        )
    );
  }

  getUserById(userId: string): Observable<UserSummary> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<UserSummary>>(`${this.baseUrl}/${userId}`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  createUser(payload: CreateUserPayload): Observable<CreateUserResponse> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .post<ApiResponse<CreateUserResponse>>(this.baseUrl, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  updateUserAttributes(userId: string, payload: UpdateUserAttributesPayload): Observable<void> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .put<ApiResponse<{ id: string }>>(`${this.baseUrl}/${userId}`, payload, { headers })
          .pipe(
            map(() => void 0),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  updateUserStatus(userId: string, payload: UpdateUserStatusPayload): Observable<void> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .put<ApiResponse<{ id: string; enabled: boolean }>>(`${this.baseUrl}/${userId}/status`, payload, {
            headers
          })
          .pipe(
            map(() => void 0),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  deleteUser(userId: string): Observable<void> {
    return this.executeWithHeaders(headers =>
      this.http
        .delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${userId}`, { headers })
        .pipe(
          map(() => void 0),
          catchError(err => this.handleError(err))
        )
    );
  }

  private executeWithHeaders<T>(fn: (headers: HttpHeaders) => Observable<T>, includeJson = false): Observable<T> {
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
