// src/app/features/auth/login/login.component.ts

import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AuthService, AuthError } from '../../../core/services/auth/auth.service';
import { AuthSession } from '../../../core/models/auth/auth-session.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: []
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  errorMessage: string | null = null;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (_session: AuthSession) => {
        this.loading = false;
        this.router.navigate(['/home']);
      },
      error: (err: AuthError) => {
        this.loading = false;

        if (err?.code === 'new_password_required') {
          const details = (err.details ?? {}) as { session?: string };
          const session = details?.session;

          if (session) {
            this.authService.setPasswordChallenge({ email, session });
            this.router.navigate(['/complete-password']);
            return;
          }

          this.errorMessage = 'Necesitas establecer una nueva contraseña, pero no pudimos iniciar el proceso.';
          return;
        }

        this.errorMessage = err.message || 'Error al iniciar sesión';
      }
    });
  }



  // Método para navegar a la pantalla de recuperación
  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
