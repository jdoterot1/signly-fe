import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth/auth.service';
import { REGISTER_REGEX } from '../../../core/constants/auth/register-regex.constants';

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
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const state = history.state as { email?: string };
    this.email = state?.email ?? this.authService.getRecoveryEmail();

    if (!this.email) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_RESET_LINK_EXPIRED');
    }

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.strongPassword)]],
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

    if (!this.email) {
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

    this.authService.setPendingRecoveryPassword(newPassword);
    this.router.navigate(['/otp'], {
      state: { email: this.email, recoveryFlow: true }
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
