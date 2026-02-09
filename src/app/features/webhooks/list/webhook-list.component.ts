import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationExtras } from '@angular/router';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { WebhookService } from '../../../core/services/webhooks/webhook.service';
import { WebhookSummary } from '../../../core/models/webhooks/webhook.model';
import { AlertService } from '../../../shared/alert/alert.service';

interface WebhookRow {
  id: string;
  url: string;
  status: string;
  version: string;
  updatedAt: string;
}

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableComponent],
  templateUrl: './webhook-list.component.html'
})
export class WebhookListComponent implements OnInit {
  @Input() returnTo: string | null = null;

  tableModel: TableModel<WebhookRow> = {
    entityName: 'Webhooks configurados',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron webhooks registrados.',
      trackByField: 'id'
    },
    columns: [
      { key: 'url', header: 'Endpoint', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'version', header: 'Versión', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'updatedAt', header: 'Actualizado', columnType: 'text', sortable: true, filterable: true, visible: true },
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
          },
          {
            label: '',
            icon: 'assets/icons/tables/Edit.svg',
            tooltip: 'Editar',
            handler: row => this.onEdit(row)
          },
          {
            label: '',
            icon: 'assets/icons/tables/Delete.svg',
            tooltip: 'Eliminar',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(
    private webhookService: WebhookService,
    private router: Router,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadWebhooks();
  }

  private loadWebhooks(): void {
    this.webhookService.getWebhooks().subscribe({
      next: (webhooks: WebhookSummary[]) => {
        const rows: WebhookRow[] = webhooks.map(item => ({
          id: item.webhookId,
          url: item.url,
          status: item.status,
          version: String(item.version ?? '-'),
          updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'
        }));
        this.tableModel = { ...this.tableModel, data: rows };
      },
      error: err => {
        this.alertService.showError('No se pudieron cargar los webhooks.', 'Error');
        console.error('Error al cargar webhooks', err);
      }
    });
  }

  onView(row: WebhookRow): void {
    if (!row.id) {
      this.alertService.showError('No se encontró el identificador del webhook.', 'Error');
      return;
    }
    this.router.navigate(['/webhooks', row.id, 'view'], this.navigationExtras());
  }

  onEdit(row: WebhookRow): void {
    if (!row.id) {
      this.alertService.showError('No se encontró el identificador del webhook.', 'Error');
      return;
    }
    this.router.navigate(['/webhooks', row.id, 'update'], this.navigationExtras());
  }

  onDelete(row: WebhookRow): void {
    if (!row.id) {
      this.alertService.showError('No se encontró el identificador del webhook.', 'Error');
      return;
    }

    if (!confirm(`¿Eliminar el webhook con endpoint "${row.url}"?`)) {
      return;
    }

    this.webhookService.deleteWebhook(row.id).subscribe({
      next: () => {
        this.alertService.showSuccess('Webhook eliminado correctamente.', 'Webhook eliminado');
        this.loadWebhooks();
      },
      error: err => {
        this.alertService.showError('No se pudo eliminar el webhook.', 'Error');
        console.error('Error al eliminar webhook', err);
      }
    });
  }

  onCreate(): void {
    this.router.navigate(['/webhooks/create'], this.navigationExtras());
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }
}
