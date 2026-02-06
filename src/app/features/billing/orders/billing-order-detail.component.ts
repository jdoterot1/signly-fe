import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingOrderDetail } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { AdminDetailShellComponent } from '../../../shared/components/admin-detail-shell/admin-detail-shell.component';

@Component({
  selector: 'app-billing-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminDetailShellComponent],
  templateUrl: './billing-order-detail.component.html'
})
export class BillingOrderDetailComponent implements OnInit, OnChanges {
  @Input() orderId?: string;

  isLoading = false;
  order: BillingOrderDetail | null = null;

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      if (this.orderId) {
        return;
      }
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('orderId' in changes) {
      const next = this.orderId;
      if (next) {
        this.load(next);
      }
    }
  }

  load(orderId: string): void {
    this.isLoading = true;
    this.order = null;
    this.billingService
      .getOrderById(orderId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: order => (this.order = order ?? null),
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle de la orden.';
          this.alertService.showError(message, 'Error al cargar orden');
        }
      });
  }

  humanStatus(value: string | null | undefined): string {
    const normalized = String(value || '').trim().toLowerCase();
    const map: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagada',
      canceled: 'Cancelada',
      cancelled: 'Cancelada',
      failed: 'Fallida'
    };
    return map[normalized] ?? (value || '—');
  }

  humanOrderType(value: string | null | undefined): string {
    const normalized = String(value || '').trim();
    const map: Record<string, string> = {
      prepaid_topup: 'Recarga de créditos (prepago)'
    };
    return map[normalized] ?? (value || '—');
  }

  formatMoney(amount: number, currency: string): string {
    const normalized = String(currency || '').toUpperCase();
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: normalized }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${normalized}`.trim();
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString('es-CO');
  }
}
