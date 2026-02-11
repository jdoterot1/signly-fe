import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { LedgerEntry, LedgerResponse, WalletInfo, WalletResponse } from '../../models/wallet/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getWallet(): Observable<WalletInfo> {
    return this.http
      .get<WalletResponse>(`${this.baseUrl}/wallet`, { headers: this.buildHeaders() })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      );
  }

  getLedger(): Observable<LedgerEntry[]> {
    return this.http
      .get<LedgerResponse>(`${this.baseUrl}/ledger`, { headers: this.buildHeaders() })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      );
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('No existe una sesión activa para consultar la billetera.');
    }
    return new HttpHeaders().set('X-Auth-Signly', `Bearer ${token}`);
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'No pudimos obtener la información de la billetera.';
    return throwError(() => new Error(message));
  }
}
