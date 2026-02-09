import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService, RegistrationRequest } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: []
})
export class RegisterComponent {
  registerForm: FormGroup;
  currentStep = 0;
  loading = false;
  errorMessage: string | null = null;
  successPayload: unknown = null;
  showPassword = false;

  readonly steps = [
    { key: 'user', title: 'Tu cuenta', description: 'Datos personales y acceso' },
    { key: 'company', title: 'Tu empresa', description: 'Configura tu organización' },
    { key: 'security', title: 'Seguridad', description: 'Consentimientos y envío' }
  ];

  readonly industries = [
    'Software',
    'Servicios profesionales',
    'Educación',
    'Finanzas',
    'Salud',
    'Manufactura',
    'Legal'
  ];

  readonly countries = [
    { code: 'CO', label: 'Colombia' },
    { code: 'US', label: 'Estados Unidos' },
    { code: 'MX', label: 'México' },
    { code: 'AR', label: 'Argentina' },
    { code: 'CL', label: 'Chile' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      user: this.fb.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        locale: ['es-CO'],
        timezone: ['America/Bogota']
      }),
      company: this.fb.group({
        displayName: ['', [Validators.required]],
        legalName: ['', [Validators.required]],
        industry: ['', [Validators.required]],
        country: ['CO', [Validators.required]],
        city: ['', [Validators.required]],
        size: [10, [Validators.required, Validators.min(1)]],
        billingEmail: ['', [Validators.required, Validators.email]],
        about: ['']
      }),
      security: this.fb.group({
        captchaToken: ['demo-token'],
        tosAccepted: [false, [Validators.requiredTrue]],
        privacyAccepted: [false, [Validators.requiredTrue]],
        referralCode: ['']
      })
    });
  }

  get userGroup() {
    return this.registerForm.get('user') as FormGroup;
  }

  get companyGroup() {
    return this.registerForm.get('company') as FormGroup;
  }

  get securityGroup() {
    return this.registerForm.get('security') as FormGroup;
  }

  get step() {
    return this.steps[this.currentStep];
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  goNext(): void {
    const target = this.getGroupForStep(this.step.key);
    target?.markAllAsTouched();
    if (target?.invalid) {
      return;
    }
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
  }

  goPrev(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }

  hasError(controlPath: string, error: string): boolean {
    const control = this.registerForm.get(controlPath);
    return !!(control && control.touched && control.hasError(error));
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.currentStep < this.steps.length - 1) {
      this.goNext();
      return;
    }

    const securityGroup = this.securityGroup;
    securityGroup.markAllAsTouched();
    if (securityGroup.invalid) {
      return;
    }

    this.loading = true;
    const payload = this.buildPayload();

    this.authService.register(payload).subscribe({
      next: res => {
        this.loading = false;
        this.successPayload = res;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.message || 'No pudimos completar el registro';
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }

  private getGroupForStep(key: string): FormGroup | null {
    if (key === 'user') return this.userGroup;
    if (key === 'company') return this.companyGroup;
    if (key === 'security') return this.securityGroup;
    return null;
  }

  private buildPayload(): RegistrationRequest {
    const raw = this.registerForm.getRawValue();
    return {
      user: {
        firstName: raw.user.firstName,
        lastName: raw.user.lastName,
        email: raw.user.email,
        phone: this.normalizePhone(raw.user.phone, raw.company.country || 'CO'),
        password: raw.user.password,
        locale: raw.user.locale,
        timezone: raw.user.timezone
      },
      company: {
        displayName: raw.company.displayName,
        legalName: raw.company.legalName,
        industry: raw.company.industry,
        country: raw.company.country,
        city: raw.company.city,
        size: Number(raw.company.size ?? 0),
        billingEmail: raw.company.billingEmail,
        about: raw.company.about
      },
      security: {
        captchaToken: raw.security.captchaToken || 'demo-token'
      },
      consents: {
        tosAccepted: !!raw.security.tosAccepted,
        privacyAccepted: !!raw.security.privacyAccepted
      },
      metadata: {
        signupSource: 'web',
        referralCode: raw.security.referralCode || null
      }
    };
  }

  private normalizePhone(phone: string, countryCode: string): string {
    if (!phone) return phone;

    const cleaned = phone.trim();
    const digitsOnly = cleaned.replace(/[^\d]/g, '');

    if (!digitsOnly) return '';

    // If the user already typed the country code, keep it and just ensure "+" prefix
    if (cleaned.startsWith('+')) {
      return `+${digitsOnly}`;
    }

    // Default country code mapping (extend if needed)
    const countryDialCode: Record<string, string> = {
      CO: '+57',
      US: '+1',
      MX: '+52',
      AR: '+54',
      CL: '+56'
    };

    const dialCode = countryDialCode[countryCode] || '+57';
    return `${dialCode}${digitsOnly}`;
  }
}
