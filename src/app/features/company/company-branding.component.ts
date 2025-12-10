import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CompanyService } from '../../core/services/company/company.service';
import { CompanyBranding, UpdateCompanyBrandingPayload } from '../../core/models/company/company.model';
import { AlertService } from '../../shared/alert/alert.service';

@Component({
  selector: 'app-company-branding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-branding.component.html'
})
export class CompanyBrandingComponent implements OnInit {
  brandingForm: FormGroup;

  isLoadingBranding = false;
  isSavingBranding = false;
  logoPreview = '';
  faviconPreview = '';
  readonly senderDomain = 'signly.apologs.co';
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private alertService: AlertService
  ) {
    this.brandingForm = this.fb.group({
      primary_color: ['#270089', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      secondary_color: ['#FFB600', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      logo_url: ['', [Validators.required]],
      favicon_url: ['', [Validators.required]],
      email_sender_name: ['', [Validators.required]],
      email_sender_alias: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+$/)]]
    });
  }

  ngOnInit(): void {
    this.loadBranding();
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

  onSaveBranding(): void {
    if (this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }
    const alias = this.normalizeAlias(this.brandingForm.value.email_sender_alias);

    const payload: UpdateCompanyBrandingPayload = {
      primary_color: this.requiredColor(this.brandingForm.value.primary_color),
      secondary_color: this.requiredColor(this.brandingForm.value.secondary_color),
      logo_url: this.requiredString(this.brandingForm.value.logo_url),
      favicon_url: this.requiredString(this.brandingForm.value.favicon_url),
      email_sender_name: this.requiredString(this.brandingForm.value.email_sender_name),
      email_sender_addr: `${alias}@${this.senderDomain}`.toLowerCase()
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

  private toBrandingForm(data: CompanyBranding | null): Record<string, unknown> {
    if (!data) {
      return {};
    }
    const alias = this.extractAlias(data?.email_sender_addr);
    this.logoPreview = data?.logo_url ?? '';
    this.faviconPreview = data?.favicon_url ?? '';
    return {
      primary_color: data.primary_color ?? '#270089',
      secondary_color: data.secondary_color ?? '#FFB600',
      logo_url: data.logo_url ?? '',
      favicon_url: data.favicon_url ?? '',
      email_sender_name: data.email_sender_name ?? '',
      email_sender_alias: alias
    };
  }

  private requiredString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private requiredColor(value: unknown): string {
    return this.requiredString(value).toUpperCase();
  }

  updateLogoPreview(): void {
    this.logoPreview = this.requiredString(this.brandingForm.value.logo_url);
  }

  updateFaviconPreview(): void {
    this.faviconPreview = this.requiredString(this.brandingForm.value.favicon_url);
  }

  onLogoFileSelected(event: Event): void {
    this.handleFileSelection(event, 'logo_url', preview => (this.logoPreview = preview));
  }

  onFaviconFileSelected(event: Event): void {
    this.handleFileSelection(event, 'favicon_url', preview => (this.faviconPreview = preview));
  }

  get emailPreviewSender(): string {
    const alias = this.normalizeAlias(this.brandingForm.value.email_sender_alias);
    return `${alias}@${this.senderDomain}`;
  }

  private handleFileSelection(event: Event, controlName: string, setter: (preview: string) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.brandingForm.get(controlName)?.setValue(result);
      setter(result);
    };
    reader.readAsDataURL(file);
  }

  private normalizeAlias(value: string): string {
    const clean = this.requiredString(value).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return clean || 'notificaciones';
  }

  private extractAlias(email?: string | null): string {
    if (!email) {
      return '';
    }
    const [alias, domain] = email.split('@');
    if (domain && domain.toLowerCase() === this.senderDomain) {
      return alias;
    }
    return alias || '';
  }
}
