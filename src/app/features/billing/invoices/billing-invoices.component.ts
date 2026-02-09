import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingInvoiceSummary } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';

@Component({
  selector: 'app-billing-invoices',
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: './billing-invoices.component.html'
})
export class BillingInvoicesComponent implements OnInit {
  isLoading = false;
  invoices: BillingInvoiceSummary[] = [];

  tableModel: TableModel<InvoiceRow> = {
    entityName: 'Facturas',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron facturas.',
      trackByField: 'invoiceId',
      showCreateButton: false
    },
    columns: [
      { key: 'number', header: 'Número', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'total', header: 'Total', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'issueDate', header: 'Emisión', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'orderId', header: 'Orden', columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'assets/icons/tables/view.svg',
            tooltip: 'Ver detalle',
            handler: row => this.onView(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading = true;
    this.billingService
      .listInvoices()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: invoices => {
          this.invoices = Array.isArray(invoices) ? invoices : [];
          this.tableModel = { ...this.tableModel, data: this.mapInvoicesToRows(this.invoices) };
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudieron cargar las facturas.';
          this.alertService.showError(message, 'Error al cargar facturas');
        }
      });
  }

  onView(row: InvoiceRow): void {
    if (!row?.invoiceId) {
      return;
    }
    this.router.navigate(['/administration/invoices', row.invoiceId]);
  }

  private mapInvoicesToRows(invoices: BillingInvoiceSummary[]): InvoiceRow[] {
    return invoices.map(invoice => ({
      invoiceId: invoice.invoiceId,
      number: invoice.number || '—',
      status: this.humanStatus(invoice.status),
      total: this.formatMoney(invoice.totalAmount, invoice.currency),
      currency: invoice.currency,
      issueDate: invoice.issueDate || '—',
      orderId: invoice.orderId || '—'
    }));
  }

  private humanStatus(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return '—';
    }
    const map: Record<string, string> = {
      issued: 'Emitida',
      paid: 'Pagada',
      void: 'Anulada',
      canceled: 'Anulada',
      cancelled: 'Anulada'
    };
    return map[normalized] ?? normalized;
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

interface InvoiceRow {
  invoiceId: string;
  number: string;
  status: string;
  total: string;
  currency: string;
  issueDate: string;
  orderId: string;
}
