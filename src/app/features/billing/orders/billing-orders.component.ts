import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingOrderSummary } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';

@Component({
  selector: 'app-billing-orders',
  standalone: true,
  imports: [CommonModule, TableComponent, TranslateModule],
  templateUrl: './billing-orders.component.html'
})
export class BillingOrdersComponent implements OnInit {
  isLoading = false;
  orders: BillingOrderSummary[] = [];

  get tableModel(): TableModel<OrderRow> {
    return {
      entityName: this.translate.instant('BILLING.ORDERS.TITLE'),
      tableConfig: {
        pageSize: 10,
        enableFiltering: true,
        enableSorting: true,
        showPagination: true,
        showRowSelection: false,
        showIndexColumn: false,
        emptyMessage: this.translate.instant('BILLING.ORDERS.EMPTY'),
        trackByField: 'orderId',
        showCreateButton: false
      },
      columns: [
        { key: 'orderType', header: this.translate.instant('BILLING.ORDERS.HEADER_TYPE'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'status', header: this.translate.instant('BILLING.ORDERS.HEADER_STATUS'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'total', header: this.translate.instant('BILLING.ORDERS.HEADER_TOTAL'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'dueDate', header: this.translate.instant('BILLING.ORDERS.HEADER_DUE'), columnType: 'text', sortable: true, filterable: true, visible: true },
        { key: 'createdAt', header: this.translate.instant('BILLING.ORDERS.HEADER_CREATED'), columnType: 'text', sortable: true, filterable: true, visible: true },
        {
          key: 'actions',
          header: this.translate.instant('BILLING.ORDERS.HEADER_ACTIONS'),
          columnType: 'action',
          visible: true,
          actions: [
            {
              label: '',
              icon: 'view',
              tooltip: this.translate.instant('BILLING.ORDERS.VIEW_DETAIL'),
              handler: row => this.onView(row)
            }
          ]
        }
      ],
      data: this._tableData
    };
  }

  private _tableData: OrderRow[] = [];

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.billingService
      .listOrders()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: orders => {
          this.orders = Array.isArray(orders) ? orders : [];
          this._tableData = this.mapOrdersToRows(this.orders);
        },
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('BILLING.ORDERS.ERROR_LOAD');
          this.alertService.showError(message, this.translate.instant('BILLING.ORDERS.ERROR_LOAD_TITLE'));
        }
      });
  }

  onView(row: OrderRow): void {
    if (!row?.orderId) {
      return;
    }
    this.router.navigate(['/administration/orders', row.orderId]);
  }

  private mapOrdersToRows(orders: BillingOrderSummary[]): OrderRow[] {
    return orders.map(order => ({
      orderId: order.orderId,
      orderType: this.humanOrderType(order.orderType),
      status: this.humanStatus(order.status),
      total: this.formatMoney(order.totalAmount, order.currency),
      currency: order.currency,
      dueDate: order.dueDate || '—',
      createdAt: this.formatDateTime(order.createdAt)
    }));
  }

  private humanOrderType(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return '—';
    }
    const map: Record<string, string> = {
      prepaid_topup: this.translate.instant('BILLING.ORDERS.TYPE_PREPAID_TOPUP')
    };
    return map[normalized] ?? normalized;
  }

  private humanStatus(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return '—';
    }
    const map: Record<string, string> = {
      pending: this.translate.instant('BILLING.ORDERS.STATUS_PENDING'),
      paid: this.translate.instant('BILLING.ORDERS.STATUS_PAID'),
      canceled: this.translate.instant('BILLING.ORDERS.STATUS_CANCELED'),
      cancelled: this.translate.instant('BILLING.ORDERS.STATUS_CANCELED'),
      failed: this.translate.instant('BILLING.ORDERS.STATUS_FAILED')
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

interface OrderRow {
  orderId: string;
  orderType: string;
  status: string;
  total: string;
  currency: string;
  dueDate: string;
  createdAt: string;
}
