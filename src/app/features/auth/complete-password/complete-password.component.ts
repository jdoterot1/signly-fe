import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService, AuthError } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-complete-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './complete-password.component.html',
  styleUrls: []
})
export class CompletePasswordComponent implements OnInit {
  passwordForm!: FormGroup;
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  showNewPassword = false;
  showConfirmPassword = false;

  private email: string | null = null;
  private session: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const challenge = this.authService.getPasswordChallenge();
    this.email = challenge?.email ?? null;
    this.session = challenge?.session ?? null;

    if (!this.email || !this.session) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_SESSION_INVALID');
      setTimeout(() => this.router.navigate(['/login']), 1500);
    }

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  get f() {
    return this.passwordForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.email || !this.session) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_LOGIN_AGAIN');
      return;
    }

    if (this.passwordForm.invalid) {
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.errorMessage = this.translate.instant('AUTH.ERROR_PASSWORDS_NO_MATCH');
      return;
    }

    this.loading = true;
    this.authService.completePassword(this.email, this.session, newPassword).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('AUTH.SUCCESS_PASSWORD_UPDATED');
        this.loading = false;
        setTimeout(() => this.router.navigate(['/home']), 1000);
      },
      error: (err: AuthError) => {
        this.errorMessage = err.message || this.translate.instant('AUTH.ERROR_UPDATE_PASSWORD');
        this.loading = false;
      }
    });
  }

  goToLogin(): void {
    this.authService.clearPasswordChallenge();
    this.router.navigate(['/login']);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
