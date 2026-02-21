// src/app/features/auth/forgot-password/forgot-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: []
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() {
    return this.forgotForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.forgotForm.invalid) {
      return;
    }

    const { email } = this.forgotForm.value;
    this.authService.setRecoveryEmail(email);
    this.loading = false;
    this.router.navigate(['/reset-password'], { state: { email } });
  }

  // Método para volver al login
  goToLogin() {
    this.router.navigate(['/login']);
  }

  private resolveForgotPasswordError(error: AuthError): string {
    const reason = String(error?.code || (error?.details as any)?.reason || '');
    const detailsMessage = String((error?.details as any)?.message || '').toLowerCase();

    if (
      reason === 'InvalidParameterException' ||
      detailsMessage.includes('no registered/verified email or phone_number')
    ) {
      return this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR_NO_VERIFIED_CONTACT');
    }

    if (reason === 'UserNotFoundException') {
      return this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR_USER_NOT_FOUND');
    }

    if (reason === 'UserNotConfirmedException') {
      return this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR_USER_NOT_CONFIRMED');
    }

    return error?.message || this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR_DEFAULT');
  }

  private handleUnverifiedContactRecovery(email: string): void {
    this.loading = false;
    this.errorMessage = null;
    this.successMessage = null;
    this.router.navigate(['/register/confirm'], {
      state: {
        email,
        fromForgotUnverified: true
      }
    });
  }
}
