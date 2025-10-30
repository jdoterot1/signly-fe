import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { WebhookService } from '../../../core/services/webhooks/webhook.service';
import { CreateWebhookPayload } from '../../../core/models/webhooks/webhook.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { WEBHOOK_EVENT_OPTIONS, WEBHOOK_BACKOFF_OPTIONS } from '../../../core/constants/webhooks/webhook.constants';

@Component({
  selector: 'app-webhook-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './webhook-create.component.html'
})
export class WebhookCreateComponent {
  form: FormGroup;
  readonly eventOptions = WEBHOOK_EVENT_OPTIONS;
  readonly backoffOptions = WEBHOOK_BACKOFF_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private webhookService: WebhookService,
    private router: Router,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
      description: [''],
      events: [[], [Validators.required]],
      customHeaders: [''],
      maxAttempts: [3, [Validators.min(1)]],
      backoff: ['exponential'],
      httpTimeoutMs: [3000, [Validators.min(0)]]
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

    const payload: CreateWebhookPayload = {
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

    this.webhookService.createWebhook(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('Webhook creado correctamente.', 'Webhook creado');
        setTimeout(() => this.router.navigate(['/webhooks']), 1500);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el webhook.', 'Error');
        console.error('Error al crear webhook', err);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/webhooks']);
  }
}
