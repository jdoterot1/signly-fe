import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BillingService } from '../../../core/services/billing/billing.service';
import { BillingOrderSummary } from '../../../core/models/billing/billing.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';

@Component({
  selector: 'app-billing-orders',
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: './billing-orders.component.html'
})
export class BillingOrdersComponent implements OnInit {
  isLoading = false;
  orders: BillingOrderSummary[] = [];

  tableModel: TableModel<OrderRow> = {
    entityName: 'Órdenes',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron órdenes.',
      trackByField: 'orderId',
      showCreateButton: false
    },
    columns: [
      { key: 'orderType', header: 'Tipo', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'total', header: 'Total', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'dueDate', header: 'Vence', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'createdAt', header: 'Creada', columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'view',
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
          this.tableModel = { ...this.tableModel, data: this.mapOrdersToRows(this.orders) };
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudieron cargar las órdenes.';
          this.alertService.showError(message, 'Error al cargar órdenes');
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
      prepaid_topup: 'Recarga de créditos (prepago)'
    };
    return map[normalized] ?? normalized;
  }

  private humanStatus(value: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return '—';
    }
    const map: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagada',
      canceled: 'Cancelada',
      cancelled: 'Cancelada',
      failed: 'Fallida'
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

interface OrderRow {
  orderId: string;
  orderType: string;
  status: string;
  total: string;
  currency: string;
  dueDate: string;
  createdAt: string;
}
