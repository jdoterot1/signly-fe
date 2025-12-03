import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CompanyService } from '../../core/services/company/company.service';
import {
  CompanyBranding,
  CompanyBillingPreferences,
  CompanyGeneralInfo,
  UpdateCompanyBillingPreferencesPayload,
  UpdateCompanyBrandingPayload,
  UpdateCompanyGeneralInfoPayload
} from '../../core/models/company/company.model';
import { AlertService } from '../../shared/alert/alert.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-settings.component.html'
})
export class CompanySettingsComponent implements OnInit {
  generalForm: FormGroup;
  brandingForm: FormGroup;
  billingForm: FormGroup;

  isLoadingGeneral = false;
  isSavingGeneral = false;
  isLoadingBranding = false;
  isSavingBranding = false;
  isLoadingBilling = false;
  isSavingBilling = false;

  readonly billingModelOptions = [
    { label: 'Postpago', value: 'postpaid' },
    { label: 'Prepago', value: 'prepaid' }
  ];

  readonly paymentProviderOptions = [
    { label: 'Manual', value: 'manual' },
    { label: 'Stripe', value: 'stripe' },
    { label: 'Oferta privada', value: 'private_offer' }
  ];

  readonly currencyOptions = ['COP', 'USD', 'EUR'];

  readonly localeOptions = ['es-CO', 'es-MX', 'es-AR', 'en-US'];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private alertService: AlertService
  ) {
    this.generalForm = this.fb.group({
      display_name: ['', [Validators.required]],
      legal_name: ['', [Validators.required]],
      country: ['', [Validators.required]],
      city: ['', [Validators.required]],
      industry: [''],
      size: [null],
      website: ['', [Validators.required]],
      about: [''],
      locale: ['', [Validators.required]],
      timezone: ['', [Validators.required]],
      tax_id: ['', [Validators.required]]
    });

    this.brandingForm = this.fb.group({
      primary_color: ['#270089', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      secondary_color: ['#FFB600', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      logo_url: ['', [Validators.required]],
      favicon_url: ['', [Validators.required]],
      email_sender_name: ['', [Validators.required]],
      email_sender_addr: ['', [Validators.required, Validators.email]]
    });

    this.billingForm = this.fb.group({
      billing_email: ['', [Validators.required, Validators.email]],
      billing_model: ['', [Validators.required]],
      currency: ['', [Validators.required]],
      invoice_day: [null, [Validators.required, Validators.min(1), Validators.max(31)]],
      legal_address: ['', [Validators.required]],
      net_terms_days: [null, [Validators.required, Validators.min(0)]],
      notes: [''],
      payment_method_ref: [''],
      payment_provider: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadGeneralInfo();
    this.loadBranding();
    this.loadBillingPreferences();
  }

  loadGeneralInfo(): void {
    this.isLoadingGeneral = true;
    this.companyService
      .getGeneralInfo()
      .pipe(finalize(() => (this.isLoadingGeneral = false)))
      .subscribe({
        next: data => this.generalForm.patchValue(this.toGeneralForm(data)),
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar la información general.';
          this.alertService.showError(message, 'Error al cargar datos');
        }
      });
  }

  loadBranding(): void {
    this.isLoadingBranding = true;
    this.companyService
      .getBranding()
      .pipe(finalize(() => (this.isLoadingBranding = false)))
      .subscribe({
        next: data => this.brandingForm.patchValue(this.toBrandingForm(data)),
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar la identidad visual.';
          this.alertService.showError(message, 'Error al cargar branding');
        }
      });
  }

  loadBillingPreferences(): void {
    this.isLoadingBilling = true;
    this.companyService
      .getBillingPreferences()
      .pipe(finalize(() => (this.isLoadingBilling = false)))
      .subscribe({
        next: data => this.billingForm.patchValue(this.toBillingForm(data)),
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar la facturación.';
          this.alertService.showError(message, 'Error al cargar facturación');
        }
      });
  }

  onSaveGeneral(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    const payload: UpdateCompanyGeneralInfoPayload = {
      display_name: this.requiredString(this.generalForm.value.display_name),
      legal_name: this.requiredString(this.generalForm.value.legal_name),
      country: this.requiredString(this.generalForm.value.country),
      city: this.requiredString(this.generalForm.value.city),
      industry: this.optionalString(this.generalForm.value.industry),
      size: this.toNumberOrNull(this.generalForm.value.size),
      website: this.requiredString(this.generalForm.value.website),
      about: this.optionalString(this.generalForm.value.about),
      locale: this.requiredString(this.generalForm.value.locale),
      timezone: this.requiredString(this.generalForm.value.timezone),
      tax_id: this.requiredString(this.generalForm.value.tax_id)
    };

    this.isSavingGeneral = true;
    this.companyService
      .updateGeneralInfo(payload)
      .pipe(finalize(() => (this.isSavingGeneral = false)))
      .subscribe({
        next: data => {
          this.generalForm.patchValue(this.toGeneralForm(data));
          this.alertService.showSuccess('Información general actualizada correctamente.', 'Datos guardados');
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo guardar la información general.';
          this.alertService.showError(message, 'Error al guardar');
        }
      });
  }

  onSaveBranding(): void {
    if (this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }

    const payload: UpdateCompanyBrandingPayload = {
      primary_color: this.requiredColor(this.brandingForm.value.primary_color),
      secondary_color: this.requiredColor(this.brandingForm.value.secondary_color),
      logo_url: this.requiredString(this.brandingForm.value.logo_url),
      favicon_url: this.requiredString(this.brandingForm.value.favicon_url),
      email_sender_name: this.requiredString(this.brandingForm.value.email_sender_name),
      email_sender_addr: this.requiredString(this.brandingForm.value.email_sender_addr)?.toLowerCase()
    };

    this.isSavingBranding = true;
    this.companyService
      .updateBranding(payload)
      .pipe(finalize(() => (this.isSavingBranding = false)))
      .subscribe({
        next: data => {
          this.brandingForm.patchValue(this.toBrandingForm(data));
          this.alertService.showSuccess('Branding actualizado correctamente.', 'Branding guardado');
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo actualizar el branding.';
          this.alertService.showError(message, 'Error al guardar');
        }
      });
  }

  onSaveBilling(): void {
    if (this.billingForm.invalid) {
      this.billingForm.markAllAsTouched();
      return;
    }

    const payload: UpdateCompanyBillingPreferencesPayload = {
      billing_email: this.requiredString(this.billingForm.value.billing_email)?.toLowerCase(),
      billing_model: this.requiredString(this.billingForm.value.billing_model),
      currency: this.requiredString(this.billingForm.value.currency)?.toUpperCase(),
      invoice_day: this.toNumberOrNull(this.billingForm.value.invoice_day),
      legal_address: this.requiredString(this.billingForm.value.legal_address),
      net_terms_days: this.toNumberOrNull(this.billingForm.value.net_terms_days),
      notes: this.optionalString(this.billingForm.value.notes),
      payment_method_ref: this.optionalString(this.billingForm.value.payment_method_ref),
      payment_provider: this.requiredString(this.billingForm.value.payment_provider)
    };

    this.isSavingBilling = true;
    this.companyService
      .updateBillingPreferences(payload)
      .pipe(finalize(() => (this.isSavingBilling = false)))
      .subscribe({
        next: data => {
          this.billingForm.patchValue(this.toBillingForm(data));
          this.alertService.showSuccess('Preferencias de facturación actualizadas.', 'Facturación guardada');
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo actualizar la facturación.';
          this.alertService.showError(message, 'Error al guardar');
        }
      });
  }

  private toGeneralForm(data: CompanyGeneralInfo | null): Partial<CompanyGeneralInfo> {
    if (!data) {
      return {};
    }
    return {
      display_name: data.display_name ?? '',
      legal_name: data.legal_name ?? '',
      country: data.country ?? '',
      city: data.city ?? '',
      industry: data.industry ?? '',
      size: data.size ?? null,
      website: data.website ?? '',
      about: data.about ?? '',
      locale: data.locale ?? '',
      timezone: data.timezone ?? '',
      tax_id: data.tax_id ?? ''
    };
  }

  private toBrandingForm(data: CompanyBranding | null): Partial<CompanyBranding> {
    if (!data) {
      return {};
    }
    return {
      primary_color: data.primary_color ?? '#270089',
      secondary_color: data.secondary_color ?? '#FFB600',
      logo_url: data.logo_url ?? '',
      favicon_url: data.favicon_url ?? '',
      email_sender_name: data.email_sender_name ?? '',
      email_sender_addr: data.email_sender_addr ?? ''
    };
  }

  private toBillingForm(data: CompanyBillingPreferences | null): Partial<CompanyBillingPreferences> {
    if (!data) {
      return {};
    }
    return {
      billing_email: data.billing_email ?? '',
      billing_model: data.billing_model ?? '',
      currency: data.currency ?? '',
      invoice_day: data.invoice_day ?? null,
      legal_address: data.legal_address ?? '',
      net_terms_days: data.net_terms_days ?? null,
      notes: data.notes ?? '',
      payment_method_ref: data.payment_method_ref ?? '',
      payment_provider: data.payment_provider ?? ''
    };
  }

  private optionalString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const sanitized = String(value).trim();
    return sanitized ? sanitized : null;
  }

  private requiredString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private requiredColor(value: unknown): string {
    return this.requiredString(value).toUpperCase();
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  get billingModelValue(): string | null {
    const value = this.billingForm.get('billing_model')?.value;
    return value ? String(value) : null;
  }

  get showBillingModelFallback(): boolean {
    const value = this.billingModelValue;
    return !!value && !this.billingModelOptions.some(opt => opt.value === value);
  }

  get currencyValue(): string | null {
    const value = this.billingForm.get('currency')?.value;
    return value ? String(value) : null;
  }

  get showCurrencyFallback(): boolean {
    const value = this.currencyValue;
    return !!value && !this.currencyOptions.includes(value);
  }

  get paymentProviderValue(): string | null {
    const value = this.billingForm.get('payment_provider')?.value;
    return value ? String(value) : null;
  }

  get showPaymentProviderFallback(): boolean {
    const value = this.paymentProviderValue;
    return !!value && !this.paymentProviderOptions.some(opt => opt.value === value);
  }
}
