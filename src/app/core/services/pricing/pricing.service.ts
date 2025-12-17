import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { PricingMeter, PricingMetersListPayload } from '../../models/pricing/pricing.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  listPricingMeters(): Observable<PricingMeter[]> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<PricingMetersListPayload>>(`${this.baseUrl}/pricing/meters`, { headers })
        .pipe(
          map(res => res.data?.meters ?? []),
          catchError(err => this.handleError(err))
        )
    );
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
    const message = error?.error?.message || error?.message || 'Ocurrió un error al procesar la solicitud.';
    return throwError(() => new Error(message));
  }
}

