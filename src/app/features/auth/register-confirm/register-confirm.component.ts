import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import {
  AuthService,
  PendingRegisterConfirmRequest,
  RegisterRequest
} from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-register-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-confirm.component.html',
  styleUrls: []
})
export class RegisterConfirmComponent implements OnInit, OnDestroy {
  private readonly otpControlNames = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'] as const;
  otpForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;
  email: string | null = null;
  private fromForgotUnverified = false;
  hasSentOtp = true;

  countdown = 60;
  private countdownSub?: Subscription;
  private pendingConfirm: PendingRegisterConfirmRequest | null = null;
  private pendingRegisterRequest: RegisterRequest | null = null;

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const navigationState = history.state as { email?: string; fromForgotUnverified?: boolean };
    const navigationEmail = navigationState?.email;
    this.fromForgotUnverified = !!navigationState?.fromForgotUnverified;
    this.pendingConfirm = this.authService.getPendingRegisterConfirmRequest();
    this.pendingRegisterRequest = this.authService.getPendingRegisterRequest();
    this.email = navigationEmail || this.pendingConfirm?.email || null;

    if (!this.pendingConfirm && this.fromForgotUnverified && this.email) {
      this.pendingConfirm = this.buildFallbackConfirmRequest(this.email);
    }

    if (!this.pendingConfirm) {
      this.errorMessage = 'No encontramos una solicitud de registro pendiente. Vuelve a crear tu cuenta.';
    }

    this.otpForm = this.fb.group({
      otp1: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp2: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp3: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp4: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp5: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp6: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]]
    });

    if (this.fromForgotUnverified) {
      this.hasSentOtp = false;
      this.countdown = 0;
      this.sendCode();
    } else {
      this.hasSentOtp = true;
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
  }

  get f() {
    return this.otpForm.controls as { [key: string]: FormControl };
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.pendingConfirm) {
      this.errorMessage = 'No encontramos una solicitud de registro pendiente.';
      return;
    }

    if (this.otpForm.invalid) {
      return;
    }

    const otpValue =
      this.f['otp1'].value +
      this.f['otp2'].value +
      this.f['otp3'].value +
      this.f['otp4'].value +
      this.f['otp5'].value +
      this.f['otp6'].value;

    const safeSubdomain = this.resolveRequiredSubdomain(
      this.pendingConfirm.company.subdomain,
      this.pendingConfirm.company.displayName,
      this.pendingConfirm.email
    );

    this.loading = true;
    this.authService.confirmRegister({
      ...this.pendingConfirm,
      company: {
        ...this.pendingConfirm.company,
        subdomain: safeSubdomain
      },
      code: otpValue
    }).subscribe({
      next: () => {
        this.loading = false;
        this.authService.clearPendingRegistration();
        this.successMessage = 'Cuenta confirmada correctamente. Redirigiendo al inicio de sesión.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 900);
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.message || 'No pudimos confirmar tu registro.';
      }
    });
  }

  onKeyUp(event: KeyboardEvent, index: number): void {
    const inputElements = this.otpInputs.toArray();
    const target = event.target as HTMLInputElement;
    if (target.value && index < inputElements.length - 1) {
      inputElements[index + 1].nativeElement.focus();
    } else if (!target.value && index > 0 && event.key === 'Backspace') {
      inputElements[index - 1].nativeElement.focus();
    }
  }

  onOtpInput(index: number): void {
    const controlName = this.otpControlNames[index];
    const control = this.otpForm.get(controlName);
    const inputElements = this.otpInputs.toArray();
    const rawValue = String(control?.value || '');
    const digitsOnly = rawValue.replace(/\D/g, '');

    if (!control) {
      return;
    }

    if (!digitsOnly) {
      control.setValue('', { emitEvent: false });
      return;
    }

    const digit = digitsOnly.slice(-1);
    control.setValue(digit, { emitEvent: false });

    if (index < inputElements.length - 1) {
      inputElements[index + 1].nativeElement.focus();
    }
  }

  onPasteOtp(event: ClipboardEvent, startIndex = 0): void {
    event.preventDefault();

    const clipboard = event.clipboardData?.getData('text') ?? '';
    const digits = clipboard.replace(/\D/g, '');
    if (!digits) {
      return;
    }

    const inputElements = this.otpInputs.toArray();
    let lastFilledIndex = startIndex;

    for (let i = 0; i < digits.length && startIndex + i < this.otpControlNames.length; i++) {
      const controlName = this.otpControlNames[startIndex + i];
      this.otpForm.get(controlName)?.setValue(digits[i], { emitEvent: false });
      lastFilledIndex = startIndex + i;
    }

    inputElements[Math.min(lastFilledIndex + 1, inputElements.length - 1)]?.nativeElement.focus();
  }

  resendCode(): void {
    if (!this.hasSentOtp) {
      this.sendCode();
      return;
    }

    if (this.countdown > 0 || this.loading) {
      return;
    }

    this.pendingRegisterRequest = this.pendingRegisterRequest || this.authService.getPendingRegisterRequest();
    this.pendingConfirm = this.pendingConfirm || this.authService.getPendingRegisterConfirmRequest();
    this.email = this.email || this.pendingConfirm?.email || null;

    this.errorMessage = null;
    this.successMessage = null;
    this.loading = true;
    const resendEmail = this.pendingRegisterRequest?.email || this.email;
    if (!resendEmail) {
      this.loading = false;
      this.errorMessage = 'No encontramos un correo para reenviar el código.';
      return;
    }

    this.authService.resendRegisterOtp(resendEmail).subscribe({
      next: () => {
        this.loading = false;
        this.hasSentOtp = true;
        this.successMessage = 'Código reenviado. Revisa tu correo.';
        this.resetCountdown();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.message || 'No pudimos reenviar el código.';
      }
    });
  }

  sendCode(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.loading = true;

    const resendEmail = this.pendingRegisterRequest?.email || this.email;
    if (!resendEmail) {
      this.loading = false;
      this.errorMessage = 'No encontramos un correo para enviar el código.';
      return;
    }

    this.authService.resendRegisterOtp(resendEmail).subscribe({
      next: () => {
        this.loading = false;
        this.hasSentOtp = true;
        this.successMessage = 'Código enviado. Revisa tu correo.';
        this.resetCountdown();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.message || 'No pudimos enviar el código.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  private startCountdown(): void {
    this.countdownSub?.unsubscribe();
    this.countdown = 60;
    this.countdownSub = interval(1000).subscribe(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.countdownSub?.unsubscribe();
      }
    });
  }

  private resetCountdown(): void {
    this.startCountdown();
  }

  private normalizeSubdomain(subdomain: string): string {
    return String(subdomain || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private resolveRequiredSubdomain(primary: string | undefined, fallback: string, email?: string): string {
    const emailLocalPart = String(email || '').split('@')[0] || '';
    let candidate = this.normalizeSubdomain(String(primary || ''));

    if (!candidate) {
      candidate = this.normalizeSubdomain(fallback);
    }

    if (!candidate) {
      candidate = this.normalizeSubdomain(emailLocalPart);
    }

    if (!candidate) {
      candidate = 'signly-user';
    }

    candidate = candidate.slice(0, 63).replace(/-+$/g, '');
    while (candidate.length < 3) {
      candidate += 'x';
    }

    return candidate;
  }

  private buildFallbackConfirmRequest(email: string): PendingRegisterConfirmRequest {
    const emailLocalPart = String(email || '').split('@')[0] || 'signly-user';
    const safeName = emailLocalPart.replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Usuario Signly';
    const safeSubdomain = this.resolveRequiredSubdomain(emailLocalPart, safeName, email);

    return {
      email,
      company: {
        displayName: safeName,
        legalName: safeName,
        industry: 'Software',
        country: 'CO',
        city: 'Bogota',
        subdomain: safeSubdomain,
        size: 1,
        billingEmail: email,
        about: 'Activacion de cuenta'
      },
      security: {
        captchaToken: 'from-forgot-unverified'
      },
      consents: {
        tosAccepted: true,
        privacyAccepted: true
      },
      metadata: {
        signupSource: 'web',
        referralCode: null
      }
    };
  }
}
