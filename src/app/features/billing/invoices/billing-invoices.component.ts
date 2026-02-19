import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingInvoiceSummary } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';

@Component({
  selector: 'app-billing-invoices',
  standalone: true,
  imports: [CommonModule, TableComponent, TranslateModule],
  templateUrl: './billing-invoices.component.html'
})
export class BillingInvoicesComponent implements OnInit {
  isLoading = false;
  invoices: BillingInvoiceSummary[] = [];

  get tableModel(): TableModel<InvoiceRow> {
    return {
      entityName: this.translate.instant('BILLING.INVOICES.TITLE'),
      tableConfig: {
        pageSize: 10,
        enableFiltering: true,
        enableSorting: true,
        showPagination: true,
        showRowSelection: false,
        showIndexColumn: false,
        emptyMessage: this.translate.instant('BILLING.INVOICES.EMPTY'),
        trackByField: 'invoiceId',
        showCreateButton: false
      },
      columns: [
        { key: 'number', header: this.translate.instant('BILLING.INVOICES.HEADER_NUMBER'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'status', header: this.translate.instant('BILLING.INVOICES.HEADER_STATUS'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'total', header: this.translate.instant('BILLING.INVOICES.HEADER_TOTAL'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'issueDate', header: this.translate.instant('BILLING.INVOICES.HEADER_ISSUE_DATE'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'orderId', header: this.translate.instant('BILLING.INVOICES.HEADER_ORDER'), columnType: 'text', sortable: true, filterable: true, visible: true },
        {
          key: 'actions',
          header: this.translate.instant('BILLING.INVOICES.HEADER_ACTIONS'),
          columnType: 'action',
          visible: true,
          actions: [
            {
              label: '',
              icon: 'view',
              tooltip: this.translate.instant('BILLING.INVOICES.VIEW_DETAIL'),
              handler: row => this.onView(row)
            }
          ]
        }
      ],
      data: this._tableData
    };
  }

  private _tableData: InvoiceRow[] = [];

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService
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
          this._tableData = this.mapInvoicesToRows(this.invoices);
        },
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('BILLING.INVOICES.ERROR_LOAD');
          this.alertService.showError(message, this.translate.instant('BILLING.INVOICES.ERROR_LOAD_TITLE'));
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
      issued: this.translate.instant('BILLING.INVOICES.STATUS_ISSUED'),
      paid: this.translate.instant('BILLING.INVOICES.STATUS_PAID'),
      void: this.translate.instant('BILLING.INVOICES.STATUS_VOID'),
      canceled: this.translate.instant('BILLING.INVOICES.STATUS_VOID'),
      cancelled: this.translate.instant('BILLING.INVOICES.STATUS_VOID')
    };
    return map[normalized] ?? normalized;
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

interface InvoiceRow {
  invoiceId: string;
  number: string;
  status: string;
  total: string;
  currency: string;
  issueDate: string;
  orderId: string;
}
