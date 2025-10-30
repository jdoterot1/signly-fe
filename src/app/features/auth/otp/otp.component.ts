// src/app/features/auth/otp/otp.component.ts

import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './otp.component.html',
  styleUrls: []
})
export class OtpComponent implements OnInit {
  otpForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  loading = false;

  // Para el countdown
  countdown: number = 60;
  private countdownSub!: Subscription;

  // Referencias a los inputs para mover el foco
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
  }

  get f() {
    return this.otpForm.controls as { [key: string]: FormControl };
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

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

    this.loading = true;
    this.authService.verifyOtp(otpValue).subscribe({
      next: () => {
        this.successMessage = 'OTP verificado correctamente. Redirigiendo…';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/home']), 1000);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al verificar OTP';
        this.loading = false;
      }
    });
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

  // Reenviar OTP: reiniciar countdown a 60
  resendCode() {
    if (this.countdown === 0) {
      this.countdown = 60;
      this.countdownSub = interval(1000).subscribe(sec => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          this.countdownSub.unsubscribe();
        }
      });
      // Aquí podrías llamar a un método de AuthService para reenviar el código
      // e.g. this.authService.resendOtp().subscribe();
    }
  }

  // Regresar a login
  goToLogin() {
    this.router.navigate(['/login']);
  }
}
