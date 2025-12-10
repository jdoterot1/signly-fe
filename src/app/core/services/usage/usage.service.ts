import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { UsageSummaryItem, UsageSummaryResponse } from '../../models/usage/usage.model';

@Injectable({
  providedIn: 'root'
})
export class UsageService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsageSummary(period: string): Observable<UsageSummaryItem[]> {
    return this.executeWithHeaders(headers => {
      const params = new HttpParams().set('period', period);
      return this.http
        .get<UsageSummaryResponse>(`${this.baseUrl}/usage/summary`, { headers, params })
        .pipe(
          map(res => res.data),
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
    const message = error?.error?.message || error?.message || 'No fue posible obtener el uso más reciente.';
    return throwError(() => new Error(message));
  }
}
