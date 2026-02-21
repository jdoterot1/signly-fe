// src/app/features/auth/otp/otp.component.ts

import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, TranslateModule],
  templateUrl: './otp.component.html',
  styleUrls: []
})
export class OtpComponent implements OnInit {
  private readonly otpControlNames = ['otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6'] as const;
  otpForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;
  email: string | null = null;
  recoveryFlow = false;

  // Para el countdown
  countdown: number = 60;
  private countdownSub!: Subscription;

  // Referencias a los inputs para mover el foco
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const navigationState = history.state as { email?: string; recoveryFlow?: boolean };
    const navigationEmail = navigationState?.email;
    this.recoveryFlow = !!navigationState?.recoveryFlow;
    this.email = navigationEmail || this.authService.getRecoveryEmail();

    if (!this.email) {
      this.errorMessage = 'AUTH.OTP.ERROR_NO_EMAIL';
    }

    // Creamos 6 controles, cada uno para un dígito
    this.otpForm = this.fb.group({
      otp1: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp2: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp3: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp4: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp5: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp6: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]]
    });

    // Iniciar countdown de 60s
    this.countdownSub = interval(1000).subscribe(sec => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.countdownSub.unsubscribe();
      }
    });

    if (this.recoveryFlow && this.email) {
      this.sendRecoveryCodeOnEntry();
    }
  }

  get f() {
    return this.otpForm.controls as { [key: string]: FormControl };
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.email) {
      this.errorMessage = 'AUTH.OTP.ERROR_RESTART';
      return;
    }

    if (this.otpForm.invalid) {
      return;
    }

    // Concatenar los seis dígitos
    const otpValue =
      this.f['otp1'].value +
      this.f['otp2'].value +
      this.f['otp3'].value +
      this.f['otp4'].value +
      this.f['otp5'].value +
      this.f['otp6'].value;

    if (this.recoveryFlow) {
      const pendingPassword = this.authService.getPendingRecoveryPassword();
      if (!pendingPassword) {
        this.errorMessage = 'AUTH.ERROR_RESET_INVALID';
        return;
      }

      this.loading = true;
      this.authService.verifyOtp(this.email, otpValue, pendingPassword).subscribe({
        next: () => {
          this.successMessage = 'AUTH.SUCCESS_PASSWORD_RESET';
          this.loading = false;
          setTimeout(() => {
            this.authService.clearPendingRecoveryPassword();
            this.authService.clearRecoveryEmail();
            this.authService.clearRecoveryOtp();
            this.router.navigate(['/login']);
          }, 1200);
        },
        error: err => {
          this.errorMessage = err?.message || 'AUTH.ERROR_RESET_PASSWORD';
          this.loading = false;
        }
      });
      return;
    }

    this.loading = true;
    this.authService.setRecoveryOtp(otpValue);
    this.successMessage = 'AUTH.OTP.SUCCESS';
    this.loading = false;
    setTimeout(() => {
      this.router.navigate(['/reset-password'], {
        state: { email: this.email, otp: otpValue }
      });
    }, 600);
  }

  // Cuando se escribe un dígito, moverse al siguiente input
  onKeyUp(event: KeyboardEvent, index: number) {
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

  // Reenviar OTP: reiniciar countdown a 60
  resendCode() {
    if (this.countdown > 0 || this.loading) {
      return;
    }

    if (!this.email) {
      this.errorMessage = 'AUTH.OTP.ERROR_RESTART';
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'AUTH.OTP.RESENT_SUCCESS';
        this.restartCountdown();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'AUTH.OTP.RESEND_FAILED';
      }
    });
  }

  // Regresar a login
  goToLogin() {
    this.router.navigate(['/login']);
  }

  private restartCountdown(): void {
    this.countdownSub?.unsubscribe();
    this.countdown = 60;
    this.countdownSub = interval(1000).subscribe(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.countdownSub.unsubscribe();
      }
    });
  }

  private sendRecoveryCodeOnEntry(): void {
    this.loading = true;
    this.authService.forgotPassword(this.email as string).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'AUTH.OTP.RESENT_SUCCESS';
        this.errorMessage = null;
        this.restartCountdown();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'AUTH.OTP.RESEND_FAILED';
      }
    });
  }
}
