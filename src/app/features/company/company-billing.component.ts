import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CompanyService } from '../../core/services/company/company.service';
import {
  CompanyBillingPreferences,
  UpdateCompanyBillingPreferencesPayload
} from '../../core/models/company/company.model';
import { AlertService } from '../../shared/alert/alert.service';

@Component({
  selector: 'app-company-billing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './company-billing.component.html'
})
export class CompanyBillingComponent implements OnInit {
  billingForm: FormGroup;

  isLoadingBilling = false;
  isSavingBilling = false;

  get billingModelOptions() {
    return [
      { label: this.translate.instant('COMPANY.BILLING.MODEL_POSTPAID'), value: 'postpaid' },
      { label: this.translate.instant('COMPANY.BILLING.MODEL_PREPAID'), value: 'prepaid' }
    ];
  }

  get paymentProviderOptions() {
    return [
      { label: this.translate.instant('COMPANY.BILLING.PROVIDER_MANUAL'), value: 'manual' },
      { label: this.translate.instant('COMPANY.BILLING.PROVIDER_STRIPE'), value: 'stripe' },
      { label: this.translate.instant('COMPANY.BILLING.PROVIDER_PRIVATE_OFFER'), value: 'private_offer' }
    ];
  }

  readonly currencyOptions = ['COP', 'USD', 'EUR'];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {
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
    this.loadBillingPreferences();
  }

  loadBillingPreferences(): void {
    this.isLoadingBilling = true;
    this.companyService
      .getBillingPreferences()
      .pipe(finalize(() => (this.isLoadingBilling = false)))
      .subscribe({
        next: data => this.billingForm.patchValue(this.toBillingForm(data)),
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('COMPANY.BILLING.ERROR_LOAD');
          this.alertService.showError(message, this.translate.instant('COMPANY.BILLING.ERROR_LOAD_TITLE'));
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
          this.alertService.showSuccess(this.translate.instant('COMPANY.BILLING.SUCCESS_UPDATE'), this.translate.instant('COMPANY.BILLING.SUCCESS_UPDATE_TITLE'));
        },
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('COMPANY.BILLING.ERROR_UPDATE');
          this.alertService.showError(message, this.translate.instant('COMPANY.BILLING.ERROR_UPDATE_TITLE'));
        }
      });
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
