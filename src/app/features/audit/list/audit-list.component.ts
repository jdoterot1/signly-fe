import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { AuditService } from '../../../core/services/audit/audit.service';
import { AuditEvent } from '../../../core/models/audit/audit-event.model';

interface AuditRow {
  id: string;
  action: string;
  actor: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  occurredAt: string;
}

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './audit-list.component.html'
})
export class AuditListComponent implements OnInit {
  loading = false;
  errorMessage?: string;

  tableModel: TableModel<AuditRow> = {
    entityName: 'AUDIT.LIST_TITLE',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'AUDIT.EMPTY',
      trackByField: 'id',
      showCreateButton: false
    },
    columns: [
      { key: 'action', header: 'Acción', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'actor', header: 'Actor', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'resource', header: 'Recurso', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'method', header: 'Método', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'path', header: 'Ruta', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'ip', header: 'IP', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'occurredAt', header: 'Ocurrido', columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'view',
            tooltip: 'Ver auditoría',
            handler: row => this.onView(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(
    private auditService: AuditService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAudits();
  }

  private loadAudits(): void {
    this.loading = true;
    this.errorMessage = undefined;
    this.auditService.getAuditEvents().subscribe({
      next: events => {
        const rows = this.mapEventsToRows(events);
        this.tableModel = { ...this.tableModel, data: rows };
        this.loading = false;
      },
      error: err => {
        this.errorMessage =
          err?.message ||
          'No fue posible obtener los registros de auditoría. Intenta nuevamente en unos minutos.';
        this.tableModel = { ...this.tableModel, data: [] };
        this.loading = false;
      }
    });
  }

  private mapEventsToRows(events: AuditEvent[]): AuditRow[] {
    return events.map(event => {
      const resourceType = event.resource?.type || 'N/A';
      const resourceId = event.resource?.id ? ` (${event.resource?.id})` : '';
      return {
        id: event.id,
        action: event.action,
        actor: `${event.actor.type} (${event.actor.id})`,
        resource: `${resourceType}${resourceId}`,
        method: event.http.method,
        path: event.http.path,
        ip: event.http.ip,
        occurredAt: this.formatDate(event.occurredAt)
      };
    });
  }

  private formatDate(value: string): string {
    return new Date(value).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  retry(): void {
    this.loadAudits();
  }

  onView(row: AuditRow): void {
    this.router.navigate(['/administration/audit-log', row.id]);
  }
}
