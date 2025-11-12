import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  AuthSession,
  AuthUserPayload,
  LoginSuccessPayload,
  MePayload,
  RefreshTokenPayload
} from '../../models/auth/auth-session.model';

interface PasswordSuccessPayload {
  status: string;
}

export interface AuthError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

interface PasswordChallenge {
  email: string;
  session: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly storageKey = 'signly.auth.session';
  private session: AuthSession | null;
  private recoveryEmail: string | null = null;
  private recoveryOtp: string | null = null;
  private passwordChallenge: PasswordChallenge | null = null;

  constructor(private http: HttpClient) {
    this.session = this.loadSession();
  }

  login(email: string, password: string): Observable<AuthSession> {
    const url = `${this.baseUrl}/auth/login`;
    return this.http
      .post<ApiResponse<LoginSuccessPayload>>(url, { email, password })
      .pipe(
        map(res => this.mapSession(res.data)),
        tap(session => this.persistSession(session)),
        catchError(err => this.handleError(err))
      );
  }

  logout(): Observable<void> {
    const url = `${this.baseUrl}/auth/logout`;
    return this.http
      .post<ApiResponse<{ status: string }>>(url, {}, { headers: this.buildSignlyHeaders() })
      .pipe(
        map(() => void 0),
        tap(() => this.persistSession(null)),
        catchError(err => {
          this.persistSession(null);
          return this.handleError(err);
        })
      );
  }

  refreshToken(refreshToken?: string): Observable<AuthSession> {
    const token = refreshToken || this.session?.refreshToken;
    if (!token) {
      return throwError(() => new Error('No hay token de actualización disponible'));
    }

    const url = `${this.baseUrl}/auth/token/refresh`;
    return this.http
      .post<ApiResponse<RefreshTokenPayload>>(url, { refresh_token: token })
      .pipe(
        map(res => this.mergeRefreshTokens(res.data)),
        tap(session => this.persistSession(session)),
        catchError(err => this.handleError(err))
      );
  }

  forgotPassword(email: string): Observable<ApiResponse<unknown>> {
    const url = `${this.baseUrl}/auth/password/forgot`;
    return this.http
      .post<ApiResponse<unknown>>(url, { email })
      .pipe(
        tap(() => {
          this.recoveryEmail = email;
          this.recoveryOtp = null;
        }),
        catchError(err => this.handleError(err))
      );
  }

  confirmPassword(email: string, otpCode: string, newPassword: string): Observable<ApiResponse<PasswordSuccessPayload>> {
    const url = `${this.baseUrl}/auth/password/confirm`;
    return this.http
      .post<ApiResponse<PasswordSuccessPayload>>(url, {
        email,
        otp_code: otpCode,
        new_password: newPassword
      })
      .pipe(catchError(err => this.handleError(err)));
  }

  completePassword(email: string, session: string, newPassword: string): Observable<AuthSession> {
    const url = `${this.baseUrl}/auth/password/complete`;
    return this.http
      .post<ApiResponse<LoginSuccessPayload>>(url, {
        email,
        session,
        new_password: newPassword
      })
      .pipe(
        map(res => this.mapSession(res.data)),
        tap(authSession => this.persistSession(authSession)),
        catchError(err => this.handleError(err))
      );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<ApiResponse<PasswordSuccessPayload>> {
    const url = `${this.baseUrl}/auth/password/change`;
    return this.http
      .post<ApiResponse<PasswordSuccessPayload>>(
        url,
        { old_password: oldPassword, new_password: newPassword },
        { headers: this.buildAuthorizationHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  me(): Observable<MePayload> {
    const url = `${this.baseUrl}/auth/me`;
    return this.http
      .post<ApiResponse<MePayload>>(url, {}, { headers: this.buildSignlyHeaders() })
      .pipe(
        map(res => res.data),
        catchError(err => this.handleError(err))
      );
  }

  verifyOtp(email: string, otpCode: string, newPassword: string): Observable<ApiResponse<PasswordSuccessPayload>> {
    return this.confirmPassword(email, otpCode, newPassword);
  }

  setRecoveryEmail(email: string): void {
    this.recoveryEmail = email;
  }

  getRecoveryEmail(): string | null {
    return this.recoveryEmail;
  }

  clearRecoveryEmail(): void {
    this.recoveryEmail = null;
    this.recoveryOtp = null;
  }

  setRecoveryOtp(otp: string): void {
    this.recoveryOtp = otp;
  }

  getRecoveryOtp(): string | null {
    return this.recoveryOtp;
  }

  clearRecoveryOtp(): void {
    this.recoveryOtp = null;
  }

  setPasswordChallenge(challenge: PasswordChallenge): void {
    this.passwordChallenge = challenge;
  }

  getPasswordChallenge(): PasswordChallenge | null {
    return this.passwordChallenge;
  }

  clearPasswordChallenge(): void {
    this.passwordChallenge = null;
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  getAccessToken(): string | null {
    return this.session?.accessToken || null;
  }

  getRefreshToken(): string | null {
    return this.session?.refreshToken || null;
  }

  isAuthenticated(): boolean {
    return !!this.session?.accessToken;
  }

  private mapSession(payload: LoginSuccessPayload): AuthSession {
    const userPayload = payload.user;
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      idToken: payload.id_token,
      tokenType: payload.token_type,
      expiresIn: payload.expires_in,
      user: this.mapUser(userPayload)
    };
  }

  private mergeRefreshTokens(payload: RefreshTokenPayload): AuthSession {
    if (!this.session) {
      throw new Error('No hay sesión activa para actualizar');
    }

    return {
      ...this.session,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      idToken: payload.id_token,
      tokenType: payload.token_type,
      expiresIn: payload.expires_in
    };
  }

  private mapUser(user: AuthUserPayload) {
    return {
      email: user.email,
      name: user.name,
      picture: user.picture,
      tenantId: user.tenant_id,
      userId: user.user_id
    };
  }

  private buildSignlyHeaders(): HttpHeaders {
    const token = this.session?.accessToken;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('X-Auth-Signly', `Bearer ${token}`);
    }
    return headers;
  }

  private buildAuthorizationHeaders(): HttpHeaders {
    const token = this.session?.accessToken;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private loadSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  private persistSession(session: AuthSession | null): void {
    this.session = session;
    if (!session) {
      localStorage.removeItem(this.storageKey);
      return;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.clearRecoveryEmail();
    this.clearRecoveryOtp();
    this.clearPasswordChallenge();
  }

  private handleError(error: unknown) {
    const httpError = error as HttpErrorResponse;
    const backend = (httpError?.error ?? {}) as {
      code?: string;
      message?: string;
      error?: { details?: unknown };
      details?: unknown;
      status?: number;
    };
    const details =
      backend?.error?.details ??
      backend?.details ??
      null;
    const message =
      backend?.message ||
      (details as { message?: string } | null)?.message ||
      httpError?.message ||
      'Error de autenticación';
    const code =
      backend?.code ||
      (details as { reason?: string } | null)?.reason ||
      undefined;

    const authError = new Error(message) as AuthError;
    authError.code = code;
    authError.status = httpError?.status;
    authError.details = details;

    return throwError(() => authError);
  }
}
