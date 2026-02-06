import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { WalletService } from '../../core/services/wallet/wallet.service';
import { LedgerEntry, WalletInfo } from '../../core/models/wallet/wallet.model';
import { TableComponent } from '../../shared/table/table.component';
import { TableModel } from '../../shared/table/table.model';

interface LedgerRow {
  id: string;
  entryType: string;
  notes: string;
  credits: string;
  balanceAfter: string;
  source: string;
  occurredAt: string;
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: './wallet.component.html'
})
export class WalletComponent implements OnInit {
  walletInfo?: WalletInfo;
  infoError?: string;
  ledgerError?: string;
  loadingInfo = false;
  loadingLedger = false;

  ledgerTable: TableModel<LedgerRow> = {
    entityName: 'Movimientos',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      emptyMessage: 'No hay movimientos registrados.',
      trackByField: 'id'
    },
    columns: [
      { key: 'entryType', header: 'Tipo', columnType: 'text', visible: true, sortable: true, filterable: true },
      { key: 'notes', header: 'Descripción', columnType: 'text', visible: true, sortable: true, filterable: true },
      { key: 'credits', header: 'Créditos', columnType: 'text', visible: true, sortable: true, filterable: true },
      { key: 'balanceAfter', header: 'Saldo luego', columnType: 'text', visible: true, sortable: true },
      { key: 'source', header: 'Origen', columnType: 'text', visible: true, sortable: true, filterable: true },
      { key: 'occurredAt', header: 'Fecha', columnType: 'text', visible: true, sortable: true }
    ],
    data: []
  };

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    this.fetchWallet();
    this.fetchLedger();
  }

  fetchWallet(): void {
    this.loadingInfo = true;
    this.walletService.getWallet().subscribe({
      next: info => {
        this.walletInfo = info;
        this.loadingInfo = false;
      },
      error: err => {
        this.infoError = err?.message || 'No pudimos obtener el saldo actual.';
        this.loadingInfo = false;
      }
    });
  }

  fetchLedger(): void {
    this.loadingLedger = true;
    this.walletService.getLedger().subscribe({
      next: entries => {
        this.ledgerTable = { ...this.ledgerTable, data: this.mapLedger(entries) };
        this.loadingLedger = false;
      },
      error: err => {
        this.ledgerError = err?.message || 'No pudimos obtener los movimientos.';
        this.loadingLedger = false;
      }
    });
  }

  private mapLedger(entries: LedgerEntry[]): LedgerRow[] {
    return entries.map(entry => ({
      id: entry.entryId,
      entryType: entry.entryType,
      notes: entry.notes || entry.meterCode || entry.sourceId,
      credits: this.formatCredits(entry.creditsDelta),
      balanceAfter: this.formatCredits(entry.balanceAfter),
      source: entry.source,
      occurredAt: this.formatDate(entry.occurredAt)
    }));
  }

  formatCredits(value: number): string {
    return `${value > 0 ? '+' : ''}${value} créditos`;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
