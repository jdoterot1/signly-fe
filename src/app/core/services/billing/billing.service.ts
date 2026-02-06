import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import { AuthService } from '../auth/auth.service';
import {
  BillingInvoiceDetail,
  BillingInvoiceSummary,
  BillingOrderDetail,
  BillingOrderSummary,
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentGatewayRequest,
  PaymentGatewayResponse
} from '../../models/billing/billing.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  listOrders(): Observable<BillingOrderSummary[]> {
    return this.executeWithHeaders(headers =>
      this.http.get<ApiResponse<BillingOrderSummary[]>>(`${this.baseUrl}/billing/orders`, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  getOrderById(orderId: string): Observable<BillingOrderDetail> {
    return this.executeWithHeaders(headers =>
      this.http.get<ApiResponse<BillingOrderDetail>>(`${this.baseUrl}/billing/orders/${orderId}`, { headers }).pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      )
    );
  }

  listInvoices(): Observable<BillingInvoiceSummary[]> {
    return this.executeWithHeaders(headers =>
      this.http.get<ApiResponse<BillingInvoiceSummary[]>>(`${this.baseUrl}/billing/invoices`, { headers }).pipe(
        map(res => res.data ?? []),
        catchError(err => this.handleError(err))
      )
    );
  }

  getInvoiceById(invoiceId: string): Observable<BillingInvoiceDetail> {
    return this.executeWithHeaders(headers =>
      this.http
        .get<ApiResponse<BillingInvoiceDetail>>(`${this.baseUrl}/billing/invoices/${invoiceId}`, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  createOrder(request: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.executeWithHeaders(headers =>
      this.http
        .post<ApiResponse<CreateOrderResponse>>(`${this.baseUrl}/billing/orders`, request, { headers })
        .pipe(
          map(res => res.data),
          catchError(err => this.handleError(err))
        )
    );
  }

  requestPayment(request: PaymentGatewayRequest): Observable<PaymentGatewayResponse> {
    return this.executeWithHeaders(headers =>
      this.http
        .post<ApiResponse<PaymentGatewayResponse>>(`${this.baseUrl}/payment-gateway/request`, request, { headers })
        .pipe(
          map(res => res.data),
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
    return new HttpHeaders()
      .set('X-Auth-Signly', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'Ocurrió un error al procesar la solicitud.';
    return throwError(() => new Error(message));
  }
}

