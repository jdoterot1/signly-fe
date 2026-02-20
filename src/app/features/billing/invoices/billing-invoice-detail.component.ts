import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingInvoiceDetail } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { AdminDetailShellComponent } from '../../../shared/components/admin-detail-shell/admin-detail-shell.component';

@Component({
  selector: 'app-billing-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminDetailShellComponent],
  templateUrl: './billing-invoice-detail.component.html'
})
export class BillingInvoiceDetailComponent implements OnInit, OnChanges {
  @Input() invoiceId?: string;

  isLoading = false;
  invoice: BillingInvoiceDetail | null = null;

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      if (this.invoiceId) {
        return;
      }
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('invoiceId' in changes) {
      const next = this.invoiceId;
      if (next) {
        this.load(next);
      }
    }
  }

  load(invoiceId: string): void {
    this.isLoading = true;
    this.invoice = null;
    this.billingService
      .getInvoiceById(invoiceId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: invoice => (this.invoice = invoice ?? null),
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle de la factura.';
          this.alertService.showError(message, 'Error al cargar factura');
        }
      });
  }

  humanStatus(value: string | null | undefined): string {
    const normalized = String(value || '').trim().toLowerCase();
    const map: Record<string, string> = {
      issued: 'Emitida',
      paid: 'Pagada',
      void: 'Anulada',
      canceled: 'Anulada',
      cancelled: 'Anulada'
    };
    return map[normalized] ?? (value || '—');
  }

  formatMoney(amount: number, currency: string): string {
    const normalized = String(currency || '').toUpperCase();
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: normalized,
        maximumFractionDigits: 0
      }).format(amount ?? 0);
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
