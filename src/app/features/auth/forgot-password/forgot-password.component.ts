// src/app/features/auth/forgot-password/forgot-password.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
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
    private router: Router
  ) {}

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

    this.loading = true;
    const { email } = this.forgotForm.value;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        // En lugar de quedarse aquí, navega a /otp
        this.loading = false;
        this.router.navigate(['/otp']);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al procesar la solicitud';
        this.loading = false;
      }
    });
  }

  // Método para volver al login
  goToLogin() {
    this.router.navigate(['/login']);
  }
}
