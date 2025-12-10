import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { CommonModule } from '@angular/common';

import { WebhookService } from '../../../core/services/webhooks/webhook.service';
import { WebhookDetail } from '../../../core/models/webhooks/webhook.model';
import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-webhook-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './webhook-detail.component.html'
})
export class WebhookDetailComponent implements OnInit {
  webhook: WebhookDetail | null = null;
  loading = false;

  private webhookId!: string;
  private returnTo: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webhookService: WebhookService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.webhookId = this.route.snapshot.paramMap.get('id') || '';
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    if (!this.webhookId) {
      this.alertService.showError('Identificador de webhook inválido.', 'Error');
      this.navigateBack();
      return;
    }
    this.loadWebhook();
  }

  private loadWebhook(): void {
    this.loading = true;
    this.webhookService.getWebhookById(this.webhookId).subscribe({
      next: webhook => {
        this.webhook = webhook;
        this.loading = false;
      },
      error: err => {
        this.alertService.showError('No se pudo cargar la información del webhook.', 'Error');
        console.error('Error al cargar webhook', err);
        this.loading = false;
        this.navigateBack();
      }
    });
  }

  goBack(): void {
    this.navigateBack();
  }

  goToEdit(): void {
    this.router.navigate(['/webhooks', this.webhookId, 'update'], this.navigationExtras());
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }

  private navigateBack(): void {
    if (this.returnTo) {
      this.router.navigateByUrl(this.returnTo);
      return;
    }
    this.router.navigate(['/webhooks']);
  }
}
