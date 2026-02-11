import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { AuthService } from '../auth/auth.service';
import {
  CompanyBranding,
  CompanyBillingPreferences,
  CompanyGeneralInfo,
  UpdateCompanyBillingPreferencesPayload,
  UpdateCompanyBrandingPayload,
  UpdateCompanyGeneralInfoPayload
} from '../../models/company/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getGeneralInfo(): Observable<CompanyGeneralInfo> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<CompanyGeneralInfo>>(`${this.baseUrl}/company`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  updateGeneralInfo(payload: UpdateCompanyGeneralInfoPayload): Observable<CompanyGeneralInfo> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .put<ApiResponse<CompanyGeneralInfo>>(`${this.baseUrl}/company`, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  getBranding(): Observable<CompanyBranding> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<CompanyBranding>>(`${this.baseUrl}/company/branding`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  updateBranding(payload: UpdateCompanyBrandingPayload): Observable<CompanyBranding> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .put<ApiResponse<CompanyBranding>>(`${this.baseUrl}/company/branding`, payload, { headers })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
    );
  }

  getBillingPreferences(): Observable<CompanyBillingPreferences> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<CompanyBillingPreferences>>(`${this.baseUrl}/company/billing-preferences`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  updateBillingPreferences(payload: UpdateCompanyBillingPreferencesPayload): Observable<CompanyBillingPreferences> {
    return this.executeWithHeaders(
      headers =>
        this.http
          .put<ApiResponse<CompanyBillingPreferences>>(`${this.baseUrl}/company/billing-preferences`, payload, {
            headers
          })
          .pipe(
            map(res => res.data),
            catchError(err => this.handleError(err))
          ),
      true
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
