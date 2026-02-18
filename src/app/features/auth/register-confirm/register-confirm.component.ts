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
  otpForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;
  email: string | null = null;

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
    const navigationEmail = history.state?.email as string | undefined;
    this.pendingConfirm = this.authService.getPendingRegisterConfirmRequest();
    this.pendingRegisterRequest = this.authService.getPendingRegisterRequest();
    this.email = navigationEmail || this.pendingConfirm?.email || null;

    if (!this.pendingConfirm || !this.pendingRegisterRequest) {
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

    this.startCountdown();
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

  resendCode(): void {
    if (this.countdown > 0 || !this.pendingRegisterRequest) {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.loading = true;

    this.authService.register(this.pendingRegisterRequest).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Código reenviado. Revisa tu correo.';
        this.resetCountdown();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.message || 'No pudimos reenviar el código.';
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
}
