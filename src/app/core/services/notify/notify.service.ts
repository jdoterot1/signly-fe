import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

export interface NotifyEmailAttachment {
  url: string;
  filename: string;
}

export interface NotifySendEmailRequest {
  to: string[];
  subject: string;
  html: string;
  attachments?: NotifyEmailAttachment[];
}

@Injectable({
  providedIn: 'root'
})
export class NotifyService {
  private readonly baseUrl = environment.notifyApiBaseUrl;
  private readonly authToken = environment.notifyAuthToken;

  constructor(private http: HttpClient) {}

  sendEmail(request: NotifySendEmailRequest): Observable<void> {
    const headers = this.buildHeaders();
    return this.http.post(`${this.baseUrl}/channel/email/send`, request, { headers }).pipe(
      map(() => void 0),
      catchError(error => {
        const message =
          error?.error?.message ||
          error?.message ||
          'No se pudo enviar el correo con el documento adjunto.';
        return throwError(() => new Error(message));
      })
    );
  }

  private buildHeaders(): HttpHeaders {
    const idempotencyKey = this.generateIdempotencyKey();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-Auth-Notify': this.authToken
    });
  }

  private generateIdempotencyKey(): string {
    const randomUuid = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : null;

    if (randomUuid) {
      return randomUuid;
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

