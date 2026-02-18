import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  imports: [CommonModule, TableComponent, TranslateModule],
  templateUrl: './wallet.component.html'
})
export class WalletComponent implements OnInit {
  walletInfo?: WalletInfo;
  infoError?: string;
  ledgerError?: string;
  loadingInfo = false;
  loadingLedger = false;

  get ledgerTable(): TableModel<LedgerRow> {
    return {
      entityName: this.translate.instant('WALLET.MOVEMENTS'),
      tableConfig: {
        pageSize: 10,
        enableFiltering: true,
        enableSorting: true,
        showPagination: true,
        showRowSelection: false,
        emptyMessage: this.translate.instant('WALLET.EMPTY_MOVEMENTS'),
        trackByField: 'id'
      },
      columns: [
        { key: 'entryType', header: this.translate.instant('WALLET.HEADER_TYPE'), columnType: 'text', visible: true, sortable: true, filterable: true },
        { key: 'notes', header: this.translate.instant('WALLET.HEADER_DESCRIPTION'), columnType: 'text', visible: true, sortable: true, filterable: true },
        { key: 'credits', header: this.translate.instant('WALLET.HEADER_CREDITS'), columnType: 'text', visible: true, sortable: true, filterable: true },
        { key: 'balanceAfter', header: this.translate.instant('WALLET.HEADER_BALANCE_AFTER'), columnType: 'text', visible: true, sortable: true },
        { key: 'source', header: this.translate.instant('WALLET.HEADER_SOURCE'), columnType: 'text', visible: true, sortable: true, filterable: true },
        { key: 'occurredAt', header: this.translate.instant('WALLET.HEADER_DATE'), columnType: 'text', visible: true, sortable: true }
      ],
      data: this._tableData
    };
  }

  private _tableData: LedgerRow[] = [];

  constructor(
    private walletService: WalletService,
    private translate: TranslateService
  ) {}

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
        this.infoError = err?.message || this.translate.instant('WALLET.ERROR_LOAD_BALANCE');
        this.loadingInfo = false;
      }
    });
  }

  fetchLedger(): void {
    this.loadingLedger = true;
    this.walletService.getLedger().subscribe({
      next: entries => {
        this._tableData = this.mapLedger(entries);
        this.loadingLedger = false;
      },
      error: err => {
        this.ledgerError = err?.message || this.translate.instant('WALLET.ERROR_LOAD_MOVEMENTS');
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
    return `${value > 0 ? '+' : ''}${value} ${this.translate.instant('WALLET.CREDITS_FORMAT')}`;
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
