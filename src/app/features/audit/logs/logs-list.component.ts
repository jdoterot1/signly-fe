import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { AuditlogService } from '../../../core/services/audit/logs/auditlogs.service';
import { AuditLog } from '../../../core/models/audit/auditlogs.model';

interface AuditLogRow {
  id: string;
  name: string;
  role: string;
  status: string;
  action: string;
  observation: string;
  method: string;
}

@Component({
  selector: 'app-logs-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableComponent],
  templateUrl: './logs-list.component.html'
})
export class LogsListComponent implements OnInit {
  tableModel: TableModel<AuditLogRow> = {
    entityName: 'Cargando auditoría...',
    tableConfig: {
      pageSize: 8,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron registros.',
      trackByField: 'id'
    },
    columns: [
      { key: 'name',        header: 'Participante', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'role',        header: 'Rol',          columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status',      header: 'Estado',       columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'action',      header: 'Acción',       columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'observation', header: 'Observación',  columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'method',      header: 'Método',       columnType: 'text', sortable: true, filterable: true, visible: true }
    ],
    data: []
  };

  constructor(
    private auditService: AuditlogService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAuditLogs(id);
    }
  }

  private loadAuditLogs(id: string): void {
    this.auditService.getLogsByDocumentId(id)
      .subscribe((logs: AuditLog[]) => {
        const rows: AuditLogRow[] = logs.map(log => ({
          id: log.id,
          name: log.name,
          role: log.role,
          status: log.status,
          action: log.action,
          observation: log.observation,
          method: log.method
        }));

        const docName = logs.length ? logs[0].name : 'desconocido';
        this.tableModel = {
          ...this.tableModel,
          entityName: `Auditoría del documento "${docName}" (ID: ${id})`,
          data: rows
        };
      });
  }
}
