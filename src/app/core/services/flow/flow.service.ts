import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth/auth-session.model';
import {
  FlowInitiateData,
  FlowState,
  OtpSendData,
  OtpVerifyData,
  OtpChannel,
  OtpVerifyRequest,
  BiometricStartData,
  BiometricStartRequest,
  BiometricVerifyData,
  LivenessStartData,
  FlowErrorDetails,
  TemplateDownloadData,
  TemplateSubmitRequest,
  FlowCompleteRequest,
  FlowCompleteData
} from '../../models/flow/flow.model';

export interface FlowError extends Error {
  code?: string;
  status?: number;
  details?: FlowErrorDetails;
}

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly storageKey = 'signly.flow.state';

  private flowStateSubject = new BehaviorSubject<FlowState | null>(null);
  flowState$ = this.flowStateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadFlowState();
  }

  // ============ Flow Initiation ============

  initiateFlow(processId: string): Observable<FlowInitiateData> {
    const url = `${this.baseUrl}/flows/${processId}/initiate`;
    return this.http
      .post<ApiResponse<FlowInitiateData>>(url, {})
      .pipe(
        map(res => res.data),
        tap(data => this.persistFlowState(this.mapToFlowState(data))),
        catchError(err => this.handleError(err))
      );
  }

  // ============ OTP Operations ============

  sendOtpEmail(processId: string): Observable<OtpSendData> {
    return this.executeWithFlowToken<ApiResponse<OtpSendData>>(
      headers => this.http.post<ApiResponse<OtpSendData>>(
        `${this.baseUrl}/flows/${processId}/otp/email/send`,
        {},
        { headers }
      )
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  sendOtpSms(processId: string): Observable<OtpSendData> {
    return this.executeWithFlowToken<ApiResponse<OtpSendData>>(
      headers => this.http.post<ApiResponse<OtpSendData>>(
        `${this.baseUrl}/flows/${processId}/otp/sms/send`,
        {},
        { headers }
      )
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  sendOtpWhatsapp(processId: string): Observable<OtpSendData> {
    return this.executeWithFlowToken<ApiResponse<OtpSendData>>(
      headers => this.http.post<ApiResponse<OtpSendData>>(
        `${this.baseUrl}/flows/${processId}/otp/whatsapp/send`,
        {},
        { headers }
      )
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  verifyOtp(processId: string, channel: OtpChannel, code: string): Observable<OtpVerifyData> {
    const body: OtpVerifyRequest = { channel, code };
    return this.executeWithFlowToken<ApiResponse<OtpVerifyData>>(
      headers => this.http.post<ApiResponse<OtpVerifyData>>(
        `${this.baseUrl}/flows/${processId}/otp/verify`,
        body,
        { headers }
      )
    ).pipe(
      map(res => res.data),
      tap(data => this.updateFlowStateAfterVerification(data)),
      catchError(err => this.handleError(err))
    );
  }

  // ============ Biometric Operations ============

  startBiometric(processId: string, requirements: BiometricStartRequest): Observable<BiometricStartData> {
    return this.executeWithFlowToken<ApiResponse<BiometricStartData>>(
      headers => this.http.post<ApiResponse<BiometricStartData>>(
        `${this.baseUrl}/flows/${processId}/biometric/start`,
        requirements,
        { headers }
      )
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  verifyBiometric(processId: string): Observable<BiometricVerifyData> {
    return this.executeWithFlowToken<ApiResponse<BiometricVerifyData>>(
      headers => this.http.post<ApiResponse<BiometricVerifyData>>(
        `${this.baseUrl}/flows/${processId}/biometric/verify`,
        {},
        { headers }
      )
    ).pipe(
      map(res => res.data),
      tap(data => {
        if (data.approved) {
          this.updateCurrentStep(null);
        }
      }),
      catchError(err => this.handleError(err))
    );
  }

  uploadBiometricImage(uploadUrl: string, imageBlob: Blob, contentType: string): Observable<void> {
    const headers = new HttpHeaders().set('Content-Type', contentType);
    return this.http.put(uploadUrl, imageBlob, { headers }).pipe(
      map(() => void 0),
      catchError(err => this.handleError(err))
    );
  }

  // ============ Liveness Operations ============

  startLivenessSession(processId: string): Observable<LivenessStartData> {
    console.log('[FlowService] startLivenessSession called for processId:', processId);
    console.log('[FlowService] Current flow state:', this.flowStateSubject.getValue());

    return this.executeWithFlowToken<ApiResponse<LivenessStartData>>(
      headers => {
        console.log('[FlowService] Headers being sent:', headers.keys(), headers.get('X-Auth-Signly-Flow')?.substring(0, 30));
        return this.http.post<ApiResponse<LivenessStartData>>(
          `${this.baseUrl}/flows/${processId}/biometric/liveness/session`,
          {},
          { headers }
        );
      }
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  // ============ Template Operations ============

  downloadTemplate(processId: string): Observable<TemplateDownloadData> {
    return this.executeWithFlowToken<ApiResponse<TemplateDownloadData>>(
      headers => this.http.get<ApiResponse<TemplateDownloadData>>(
        `${this.baseUrl}/flows/${processId}/template/download`,
        { headers }
      )
    ).pipe(
      map(res => res.data),
      catchError(err => this.handleError(err))
    );
  }

  submitTemplate(processId: string, request: TemplateSubmitRequest): Observable<void> {
    return this.executeWithFlowToken<ApiResponse<void>>(
      headers => this.http.post<ApiResponse<void>>(
        `${this.baseUrl}/flows/${processId}/template/submit`,
        request,
        { headers }
      )
    ).pipe(
      map(() => void 0),
      catchError(err => this.handleError(err))
    );
  }

  // ============ Flow Complete ============

  completeFlow(processId: string, request: FlowCompleteRequest): Observable<FlowCompleteData> {
    return this.executeWithFlowToken<ApiResponse<FlowCompleteData>>(
      headers => this.http.post<ApiResponse<FlowCompleteData>>(
        `${this.baseUrl}/flows/${processId}/complete`,
        request,
        { headers }
      )
    ).pipe(
      map(res => res.data ?? { code: 'flow_completed', message: 'Flujo completado' }),
      catchError(err => this.handleError(err))
    );
  }

  // ============ Flow State Management ============

  getFlowState(): FlowState | null {
    return this.flowStateSubject.getValue();
  }

  getFlowToken(): string | null {
    const state = this.flowStateSubject.getValue();
    const token = state?.flowAuthToken ?? null;
    console.log('[FlowService] getFlowToken called, hasState:', !!state, 'hasToken:', !!token);
    return token;
  }

  getProcessId(): string | null {
    return this.flowStateSubject.getValue()?.processId ?? null;
  }

  getCurrentStep(): string | null {
    return this.flowStateSubject.getValue()?.currentStep ?? null;
  }

  clearFlowState(): void {
    this.flowStateSubject.next(null);
    this.clearStoredState();
  }

  isTokenExpired(): boolean {
    // Token expiration is handled by the backend
    // This is a placeholder for future implementation
    return false;
  }

  // ============ Private Helpers ============

  private executeWithFlowToken<T>(
    fn: (headers: HttpHeaders) => Observable<T>
  ): Observable<T> {
    const token = this.getFlowToken();
    if (!token) {
      console.warn('[FlowService] No flow token available!');
      return throwError(() => {
        const err = new Error('Missing flow bearer token') as FlowError;
        err.code = 'missing_flow_token';
        return err;
      });
    }
    let headers = new HttpHeaders();
    const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    headers = headers.set('X-Auth-Signly-Flow', bearer);
    console.log('[FlowService] Using flow token:', token.substring(0, 20) + '...');
    headers = headers.set('Content-Type', 'application/json');
    return fn(headers);
  }

  private mapToFlowState(data: FlowInitiateData): FlowState {
    const anyData = data as unknown as Record<string, any>;
    const flowObject = (anyData['flow'] ?? {}) as Record<string, any>;
    const token =
      data.flowAuthToken ||
      anyData['flow_auth_token'] ||
      anyData['flowToken'] ||
      anyData['token'] ||
      anyData['flowTokenValue'] ||
      anyData['flowAuth'] ||
      anyData['flow_auth'] ||
      anyData['flowTokenBearer'] ||
      flowObject['authToken'] ||
      flowObject['flowAuthToken'] ||
      '';
    return {
      processId: data.processId,
      flowAuthToken: token,
      participant: data.participant,
      currentStep: data.flow.currentStep,
      pipeline: data.flow.pipeline,
      challenges: data.flow.challenges,
      status: data.status
    };
  }

  private updateFlowStateAfterVerification(data: OtpVerifyData): void {
    const currentState = this.flowStateSubject.getValue();
    if (!currentState) return;

    const updatedChallenges = currentState.challenges.map(challenge => {
      if (challenge.type === data.verifiedStep) {
        return { ...challenge, status: 'COMPLETED' as const };
      }
      if (challenge.type === data.nextStep) {
        return { ...challenge, status: 'ACTIVE' as const };
      }
      return challenge;
    });

    const updatedState: FlowState = {
      ...currentState,
      currentStep: data.nextStep ?? currentState.currentStep,
      challenges: updatedChallenges,
      status: data.status
    };

    this.persistFlowState(updatedState);
  }

  private updateCurrentStep(nextStep: string | null): void {
    const currentState = this.flowStateSubject.getValue();
    if (!currentState || !nextStep) return;

    const updatedState: FlowState = {
      ...currentState,
      currentStep: nextStep as FlowState['currentStep']
    };

    this.persistFlowState(updatedState);
  }

  private persistFlowState(state: FlowState | null): void {
    this.flowStateSubject.next(state);
    if (!state) {
      this.clearStoredState();
      console.log('[FlowService] Flow state cleared');
      return;
    }
    console.log('[FlowService] Persisting flow state:', {
      processId: state.processId,
      currentStep: state.currentStep,
      hasToken: !!state.flowAuthToken
    });
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch {
        // ignore storage failures
      }
    }
  }

  private loadFlowState(): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(this.storageKey);
        if (raw) {
          const state = JSON.parse(raw) as FlowState;
          this.flowStateSubject.next(state);
          console.log('[FlowService] Loaded flow state from storage:', {
            processId: state.processId,
            currentStep: state.currentStep,
            hasToken: !!state.flowAuthToken
          });
        } else {
          console.log('[FlowService] No flow state in storage');
        }
      } catch {
        console.warn('[FlowService] Failed to parse flow state from storage');
      }
    }
  }

  private clearStoredState(): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
    }
  }

  private handleError(error: unknown) {
    const httpError = error as HttpErrorResponse;
    const backend = (httpError?.error ?? {}) as {
      code?: string;
      message?: string;
      error?: { details?: FlowErrorDetails; type?: string };
      status?: number;
    };

    const details = backend?.error?.details ?? null;
    const message = backend?.message || httpError?.message || 'Error en el flujo de firma';
    const code = backend?.code || (details?.reason) || undefined;

    const flowError = new Error(message) as FlowError;
    flowError.code = code;
    flowError.status = httpError?.status;
    flowError.details = details ?? undefined;

    return throwError(() => flowError);
  }
}
