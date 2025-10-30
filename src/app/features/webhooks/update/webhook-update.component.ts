import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { WebhookService } from '../../../core/services/webhooks/webhook.service';
import { WebhookDetail, UpdateWebhookPayload, UpdateWebhookStatusPayload } from '../../../core/models/webhooks/webhook.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { WEBHOOK_EVENT_OPTIONS, WEBHOOK_BACKOFF_OPTIONS } from '../../../core/constants/webhooks/webhook.constants';

@Component({
  selector: 'app-webhook-update',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './webhook-update.component.html'
})
export class WebhookUpdateComponent implements OnInit {
  form: FormGroup;
  webhookId!: string;
  loading = false;
  currentStatus: string | null = null;

  readonly eventOptions = WEBHOOK_EVENT_OPTIONS;
  readonly backoffOptions = WEBHOOK_BACKOFF_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private webhookService: WebhookService,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
      description: [''],
      events: [[], [Validators.required]],
      customHeaders: [''],
      maxAttempts: [3, [Validators.min(1)]],
      backoff: ['exponential'],
      httpTimeoutMs: [3000, [Validators.min(0)]],
      status: ['ENABLED', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.webhookId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.webhookId) {
      this.alertService.showError('Identificador de webhook inválido.', 'Error');
      this.router.navigate(['/webhooks']);
      return;
    }
    this.loadWebhook();
  }

  private loadWebhook(): void {
    this.loading = true;
    this.webhookService.getWebhookById(this.webhookId).subscribe({
      next: (detail: WebhookDetail) => {
        this.currentStatus = detail.status;
        this.form.patchValue({
          url: detail.url,
          description: detail.description,
          events: detail.events ?? [],
          customHeaders: detail.customHeaders ? JSON.stringify(detail.customHeaders, null, 2) : '',
          maxAttempts: Number(detail.retries?.maxAttempts ?? 3),
          backoff: detail.retries?.backoff ?? 'exponential',
          httpTimeoutMs: Number(detail.httpTimeoutMs ?? 3000),
          status: detail.status ?? 'ENABLED'
        });
        this.loading = false;
      },
      error: err => {
        this.alertService.showError('No se pudo cargar el webhook.', 'Error');
        console.error('Error al cargar webhook', err);
        this.loading = false;
        this.router.navigate(['/webhooks']);
      }
    });
  }

  toggleEvent(eventName: string, checked: boolean): void {
    const current: string[] = this.form.value.events || [];
    if (checked) {
      if (!current.includes(eventName)) {
        this.form.patchValue({ events: [...current, eventName] });
      }
    } else {
      this.form.patchValue({ events: current.filter(e => e !== eventName) });
    }
  }

  isEventSelected(eventName: string): boolean {
    return (this.form.value.events || []).includes(eventName);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    let headers: Record<string, string> | undefined;
    const headersRaw = this.form.value.customHeaders?.trim();
    if (headersRaw) {
      try {
        headers = JSON.parse(headersRaw);
      } catch (error) {
        this.alertService.showError('Los Headers personalizados deben ser un JSON válido.', 'Datos inválidos');
        return;
      }
    }

    const payload: UpdateWebhookPayload = {
      url: this.form.value.url,
      description: this.form.value.description || undefined,
      events: this.form.value.events,
      customHeaders: headers,
      retries: {
        maxAttempts: this.form.value.maxAttempts,
        backoff: this.form.value.backoff
      },
      httpTimeoutMs: this.form.value.httpTimeoutMs
    };

    this.webhookService.updateWebhook(this.webhookId, payload).subscribe({
      next: () => {
        const desiredStatus = this.form.value.status;
        if (desiredStatus && desiredStatus !== this.currentStatus) {
          const statusPayload: UpdateWebhookStatusPayload = { status: desiredStatus };
          this.webhookService.updateWebhookStatus(this.webhookId, statusPayload).subscribe({
            next: () => this.handleSuccess(),
            error: err => {
              this.alertService.showError('El webhook fue actualizado, pero no se pudo cambiar el estado.', 'Advertencia');
              console.error('Error al actualizar estado del webhook', err);
              this.handleSuccess(false);
            }
          });
        } else {
          this.handleSuccess();
        }
      },
      error: err => {
        this.alertService.showError('No se pudo actualizar el webhook.', 'Error');
        console.error('Error al actualizar webhook', err);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/webhooks']);
  }

  private handleSuccess(showSuccess = true): void {
    if (showSuccess) {
      this.alertService.showSuccess('Webhook actualizado correctamente.', 'Webhook actualizado');
    }
    setTimeout(() => this.router.navigate(['/webhooks']), 1500);
  }
}
