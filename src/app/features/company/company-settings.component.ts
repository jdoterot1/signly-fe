import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CompanyService } from '../../core/services/company/company.service';
import { CompanyGeneralInfo, UpdateCompanyGeneralInfoPayload } from '../../core/models/company/company.model';
import { AlertService } from '../../shared/alert/alert.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './company-settings.component.html'
})
export class CompanySettingsComponent implements OnInit {
  generalForm: FormGroup;

  isLoadingGeneral = false;
  isSavingGeneral = false;

  readonly localeOptions = ['es-CO', 'es-MX', 'es-AR', 'en-US'];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private alertService: AlertService,
    private translate: TranslateService
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
  }

  ngOnInit(): void {
    this.loadGeneralInfo();
  }

  loadGeneralInfo(): void {
    this.isLoadingGeneral = true;
    this.companyService
      .getGeneralInfo()
      .pipe(finalize(() => (this.isLoadingGeneral = false)))
      .subscribe({
        next: data => this.generalForm.patchValue(this.toGeneralForm(data)),
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('COMPANY.SETTINGS.ERROR_LOAD');
          this.alertService.showError(message, this.translate.instant('COMPANY.SETTINGS.ERROR_LOAD_TITLE'));
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
          this.alertService.showSuccess(
            this.translate.instant('COMPANY.SETTINGS.SUCCESS'),
            this.translate.instant('COMPANY.SETTINGS.SUCCESS_TITLE')
          );
        },
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('COMPANY.SETTINGS.ERROR_SAVE');
          this.alertService.showError(message, this.translate.instant('COMPANY.SETTINGS.ERROR_SAVE_TITLE'));
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
}
