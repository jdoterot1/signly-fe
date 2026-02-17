import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: []
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  email: string | null = null;
  otp: string | null = null;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const state = history.state as { email?: string; otp?: string };
    this.email = state?.email ?? this.authService.getRecoveryEmail();
    this.otp = state?.otp ?? this.authService.getRecoveryOtp();

    if (!this.email || !this.otp) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_RESET_LINK_EXPIRED');
    }

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  get f() {
    return this.resetForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.email || !this.otp) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_RESET_INVALID');
      return;
    }

    if (this.resetForm.invalid) {
      return;
    }

    const { newPassword, confirmPassword } = this.resetForm.value;
    if (newPassword !== confirmPassword) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_PASSWORDS_NO_MATCH');
      return;
    }

    this.loading = true;
    this.authService.verifyOtp(this.email, this.otp, newPassword).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('AUTH.SUCCESS_PASSWORD_RESET');
        this.loading = false;
        setTimeout(() => {
          this.authService.clearRecoveryEmail();
          this.authService.clearRecoveryOtp();
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (err) => {
        this.errorMessage = err.message || this.translate.instant('AUTH.ERROR_RESET_PASSWORD');
        this.loading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
