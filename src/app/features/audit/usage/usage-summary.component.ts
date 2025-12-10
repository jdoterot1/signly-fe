import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { UsageService } from '../../../core/services/usage/usage.service';
import { UsageSummaryItem } from '../../../core/models/usage/usage.model';
import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';

interface UsageSummaryRow {
  concept: string;
  channel: string;
  qtyTotal: number;
  unitPriceLabel: string;
  amountLabel: string;
  ratedAt: string;
}

@Component({
  selector: 'app-usage-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, TableComponent],
  templateUrl: './usage-summary.component.html'
})
export class UsageSummaryComponent implements OnInit {
  loading = false;
  errorMessage?: string;
  selectedPeriod = this.buildDefaultPeriod();
  totalAmount = 0;
  totalQty = 0;
  currency = 'COP';
  lastRatedAt?: string;

  readonly meterLabels: Record<string, string> = {
    SIGNATURE_EMAIL: 'Firmas por correo',
    SIGNATURE_SMS: 'Firmas vía SMS',
    SIGNATURE_WHATSAPP: 'Firmas vía WhatsApp',
    SIGNATURE_BIOMETRIC: 'Firmas biométricas'
  };

  tableModel: TableModel<UsageSummaryRow> = {
    entityName: 'Consumo por canal',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: false,
      showRowSelection: false,
      showCreateButton: false,
      emptyMessage: 'No hay registros de uso para el período seleccionado.'
    },
    columns: [
      { key: 'concept', header: 'Concepto', columnType: 'text', visible: true },
      { key: 'channel', header: 'Código', columnType: 'text', visible: true },
      { key: 'qtyTotal', header: 'Cantidad', columnType: 'text', visible: true, sortable: true },
      { key: 'unitPriceLabel', header: 'Precio unitario', columnType: 'text', visible: true },
      { key: 'amountLabel', header: 'Total facturado', columnType: 'text', visible: true },
      { key: 'ratedAt', header: 'Actualizado', columnType: 'text', visible: true }
    ],
    data: []
  };

  constructor(private usageService: UsageService) {}

  ngOnInit(): void {
    this.fetchUsage();
  }

  onPeriodChange(): void {
    this.fetchUsage();
  }

  trackByRow(index: number, row: UsageSummaryRow): string {
    return `${row.channel}-${row.ratedAt}-${index}`;
  }

  fetchUsage(): void {
    if (!this.selectedPeriod) {
      return;
    }
    this.loading = true;
    this.errorMessage = undefined;
    this.usageService
      .getUsageSummary(this.selectedPeriod)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => this.handleUsageData(data),
        error: err => {
          const fallback = 'No pudimos obtener el resumen de uso. Intenta nuevamente en unos minutos.';
          this.errorMessage = err?.message || fallback;
          this.tableModel = { ...this.tableModel, data: [] };
          this.totalAmount = 0;
          this.totalQty = 0;
          this.lastRatedAt = undefined;
        }
      });
  }

  private handleUsageData(data: UsageSummaryItem[]): void {
    this.currency = data[0]?.currency || 'COP';
    const rows: UsageSummaryRow[] = data.map(item => ({
      concept: this.meterLabels[item.meterCode] || item.meterCode,
      channel: item.meterCode,
      qtyTotal: item.qtyTotal,
      unitPriceLabel: this.formatCurrency(item.unitPrice, item.currency),
      amountLabel: this.formatCurrency(item.amountTotal, item.currency),
      ratedAt: this.formatDate(item.ratedAt)
    }));

    this.tableModel = { ...this.tableModel, data: rows };
    this.totalQty = data.reduce((acc, item) => acc + item.qtyTotal, 0);
    this.totalAmount = data.reduce((acc, item) => acc + item.amountTotal, 0);
    this.lastRatedAt = rows[0]?.ratedAt;
  }

  private buildDefaultPeriod(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  formatCurrency(value: number, currency = this.currency): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(value);
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
