import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';

import {
  AuthService,
  PendingRegisterConfirmRequest,
  RegisterRequest
} from '../../../core/services/auth/auth.service';
import { REGISTER_REGEX } from '../../../core/constants/auth/register-regex.constants';
import { COLOMBIA_CITIES } from '../../../core/constants/location/colombia-cities.constant';

type StepKey = 'user' | 'company' | 'security';

interface StepDefinition {
  key: StepKey;
  title: string;
  description: string;
}

interface DialCodeOption {
  code: string;
  label: string;
  dialCode: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrls: []
})
export class RegisterComponent implements OnDestroy {
  readonly defaultLocale = 'es-CO';
  readonly defaultTimezone = 'America/Bogota';

  registerForm: FormGroup;
  currentStep = 0;
  loading = false;
  errorMessage: string | null = null;
  showPassword = false;
  private readonly subs = new Subscription();

  readonly steps: StepDefinition[] = [
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

  readonly signlyActions = [
    'Firmar contratos con clientes',
    'Automatizar onboarding de personal',
    'Aprobar documentos internos',
    'Gestionar proveedores y compras',
    'Otro'
  ];

  readonly countries = [
    { code: 'CO', label: 'Colombia' },
    { code: 'US', label: 'Estados Unidos' },
    { code: 'MX', label: 'México' },
    { code: 'AR', label: 'Argentina' },
    { code: 'CL', label: 'Chile' }
  ];

  readonly phoneDialCodes: DialCodeOption[] = [
    { code: 'CO', label: 'Colombia', dialCode: '+57' },
    { code: 'US', label: 'Estados Unidos', dialCode: '+1' },
    { code: 'MX', label: 'México', dialCode: '+52' },
    { code: 'AR', label: 'Argentina', dialCode: '+54' },
    { code: 'CL', label: 'Chile', dialCode: '+56' },
    { code: 'PE', label: 'Perú', dialCode: '+51' },
    { code: 'EC', label: 'Ecuador', dialCode: '+593' },
    { code: 'PA', label: 'Panamá', dialCode: '+507' },
    { code: 'ES', label: 'España', dialCode: '+34' }
  ];

  readonly colombiaCities = COLOMBIA_CITIES;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      user: this.fb.group({
        firstName: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.name)]],
        lastName: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.name)]],
        email: ['', [Validators.required, Validators.email]],
        phoneDialCode: ['+57', [Validators.required, Validators.pattern(REGISTER_REGEX.phoneDialCode)]],
        phone: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.phoneNational)]],
        password: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.strongPassword)]],
        locale: [this.defaultLocale],
        timezone: [this.defaultTimezone]
      }),
      company: this.fb.group({
        businessName: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.companyName)]],
        subdomain: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.subdomain)]],
        website: ['', [Validators.pattern(REGISTER_REGEX.website)]],
        industry: ['', [Validators.required]],
        country: ['CO', [Validators.required]],
        city: ['', [Validators.required, Validators.pattern(REGISTER_REGEX.city)]],
        size: [10, [Validators.required, Validators.min(1)]],
        useSameBillingEmail: [true],
        billingEmail: ['', [Validators.required, Validators.email]],
        about: ['', [Validators.required]],
        aboutOther: ['']
      }),
      security: this.fb.group({
        captchaToken: ['demo-token'],
        tosAccepted: [false, [Validators.requiredTrue]],
        privacyAccepted: [false, [Validators.requiredTrue]],
        hasReferralCode: [false],
        referralCode: [{ value: '', disabled: true }, [Validators.pattern(REGISTER_REGEX.referralCode)]]
      })
    });

    this.setupBillingEmailSync();
    this.setupAboutOtherBehavior();
    this.setupReferralCodeBehavior();
  }

  get userGroup(): FormGroup {
    return this.registerForm.get('user') as FormGroup;
  }

  get companyGroup(): FormGroup {
    return this.registerForm.get('company') as FormGroup;
  }

  get securityGroup(): FormGroup {
    return this.registerForm.get('security') as FormGroup;
  }

  get step(): StepDefinition {
    return this.steps[this.currentStep] ?? this.steps[0];
  }

  get isOtherSignlyActionSelected(): boolean {
    return this.companyGroup.get('about')?.value === 'Otro';
  }

  get hasReferralCodeEnabled(): boolean {
    return !!this.securityGroup.get('hasReferralCode')?.value;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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

    this.securityGroup.markAllAsTouched();
    if (this.securityGroup.invalid) {
      return;
    }

    const registerPayload = this.buildRegisterPayload();
    const confirmPayload = this.buildRegisterConfirmPayload();

    this.loading = true;
    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.loading = false;
        this.authService.setPendingRegistration(registerPayload, confirmPayload);
        this.router.navigate(['/register/confirm'], {
          state: { email: registerPayload.email }
        });
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

  private getGroupForStep(key: StepKey): FormGroup | null {
    if (key === 'user') return this.userGroup;
    if (key === 'company') return this.companyGroup;
    if (key === 'security') return this.securityGroup;
    return null;
  }

  private buildRegisterPayload(): RegisterRequest {
    const raw = this.registerForm.getRawValue();

    return {
      firstName: raw.user.firstName,
      lastName: raw.user.lastName,
      email: raw.user.email,
      phone: this.normalizePhone(raw.user.phone, raw.user.phoneDialCode),
      password: raw.user.password,
      locale: this.defaultLocale,
      timezone: this.defaultTimezone
    };
  }

  private buildRegisterConfirmPayload(): PendingRegisterConfirmRequest {
    const raw = this.registerForm.getRawValue();
    const referralCode = raw.security.hasReferralCode ? raw.security.referralCode || null : null;
    const company = this.buildBusinessCompanyPayload(raw);

    return {
      email: String(raw.user.email || '').trim(),
      company,
      security: {
        captchaToken: raw.security.captchaToken || 'demo-token'
      },
      consents: {
        tosAccepted: !!raw.security.tosAccepted,
        privacyAccepted: !!raw.security.privacyAccepted
      },
      metadata: {
        signupSource: 'web',
        referralCode
      }
    };
  }

  private buildBusinessCompanyPayload(raw: any): PendingRegisterConfirmRequest['company'] {
    const businessName = String(raw.company.businessName || '').trim();
    const website = this.normalizeWebsite(raw.company.website);
    const subdomain = this.resolveRequiredSubdomain(
      raw.company.subdomain,
      businessName,
      raw.user?.email
    );

    return {
      displayName: businessName,
      legalName: businessName,
      industry: raw.company.industry,
      country: raw.company.country,
      city: raw.company.city,
      subdomain,
      website,
      size: Number(raw.company.size ?? 0),
      billingEmail: raw.company.billingEmail,
      about: raw.company.about === 'Otro' ? raw.company.aboutOther : raw.company.about
    };
  }

  private normalizePhone(phone: string, dialCode: string): string {
    const digitsOnly = (phone || '').replace(/\D/g, '');
    const normalizedDialCode = (dialCode || '+57').replace(/[^\d+]/g, '');

    if (!digitsOnly) {
      return '';
    }

    return `${normalizedDialCode}${digitsOnly}`;
  }

  private normalizeSubdomain(subdomain: string): string {
    const normalized = String(subdomain || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized;
  }

  private resolveRequiredSubdomain(primary: string, fallback: string, email?: string): string {
    const emailLocalPart = String(email || '').split('@')[0] || '';
    let candidate = this.normalizeSubdomain(primary);

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

  private normalizeWebsite(website: string): string | undefined {
    const cleanWebsite = String(website || '').trim();
    if (!cleanWebsite) {
      return undefined;
    }

    if (/^https?:\/\//i.test(cleanWebsite)) {
      return cleanWebsite;
    }

    return `https://${cleanWebsite}`;
  }

  private setupBillingEmailSync(): void {
    const userEmailControl = this.userGroup.get('email');
    const sameEmailControl = this.companyGroup.get('useSameBillingEmail');
    const billingEmailControl = this.companyGroup.get('billingEmail');

    if (!userEmailControl || !sameEmailControl || !billingEmailControl) {
      return;
    }

    const applyMode = (useSameEmail: boolean): void => {
      if (useSameEmail) {
        const emailValue = String(userEmailControl.value || '').trim();
        billingEmailControl.setValue(emailValue, { emitEvent: false });
        billingEmailControl.disable({ emitEvent: false });
        return;
      }

      billingEmailControl.enable({ emitEvent: false });
      if (!billingEmailControl.value) {
        billingEmailControl.setValue(String(userEmailControl.value || '').trim(), { emitEvent: false });
      }
    };

    applyMode(!!sameEmailControl.value);

    this.subs.add(
      sameEmailControl.valueChanges.subscribe(value => {
        applyMode(!!value);
      })
    );

    this.subs.add(
      userEmailControl.valueChanges.subscribe(value => {
        if (sameEmailControl.value) {
          billingEmailControl.setValue(String(value || '').trim(), { emitEvent: false });
        }
      })
    );
  }

  private setupAboutOtherBehavior(): void {
    const aboutControl = this.companyGroup.get('about');
    const aboutOtherControl = this.companyGroup.get('aboutOther');

    if (!aboutControl || !aboutOtherControl) {
      return;
    }

    const applyMode = (aboutValue: string): void => {
      if (aboutValue === 'Otro') {
        aboutOtherControl.setValidators([Validators.required, Validators.minLength(3)]);
        aboutOtherControl.enable({ emitEvent: false });
      } else {
        aboutOtherControl.clearValidators();
        aboutOtherControl.setValue('', { emitEvent: false });
        aboutOtherControl.disable({ emitEvent: false });
      }
      aboutOtherControl.updateValueAndValidity({ emitEvent: false });
    };

    applyMode(String(aboutControl.value || ''));

    this.subs.add(
      aboutControl.valueChanges.subscribe(value => {
        applyMode(String(value || ''));
      })
    );
  }

  private setupReferralCodeBehavior(): void {
    const hasReferralCodeControl = this.securityGroup.get('hasReferralCode');
    const referralCodeControl = this.securityGroup.get('referralCode');

    if (!hasReferralCodeControl || !referralCodeControl) {
      return;
    }

    const applyMode = (enabled: boolean): void => {
      if (enabled) {
        referralCodeControl.enable({ emitEvent: false });
        referralCodeControl.updateValueAndValidity({ emitEvent: false });
        return;
      }

      referralCodeControl.setValue('', { emitEvent: false });
      referralCodeControl.disable({ emitEvent: false });
      referralCodeControl.updateValueAndValidity({ emitEvent: false });
    };

    applyMode(!!hasReferralCodeControl.value);

    this.subs.add(
      hasReferralCodeControl.valueChanges.subscribe(value => {
        applyMode(!!value);
      })
    );
  }
}
