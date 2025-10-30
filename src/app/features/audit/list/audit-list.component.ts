import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { AuditService } from '../../../core/services/audit/audit.service';
import { Document, DocumentStatus } from '../../../core/models/documents/document.model';

interface AuditRow {
  id: string;
  name: string;
  description?: string;
  creationDate: string;
  createdBy: string;
  language: string;
  status: DocumentStatus;
}

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './audit-list.component.html'
})
export class AuditListComponent implements OnInit {
  tableModel: TableModel<AuditRow> = {
    entityName: 'Auditorías registradas',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron auditorías.',
      trackByField: 'id'
    },
    columns: [
      { key: 'name', header: 'Nombre', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description', header: 'Descripción', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'creationDate', header: 'Fecha de Creación', columnType: 'text', sortable: true, filterable: false, visible: true },
      { key: 'createdBy', header: 'Creado por', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'language', header: 'Idioma', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado', columnType: 'text', sortable: true, filterable: false, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'assets/icons/tables/view.svg',
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
    this.auditService.getAllAudits().subscribe((audits: Document[]) => {
      const rows: AuditRow[] = audits.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        creationDate: a.creationDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        createdBy: a.createdBy,
        language: a.language,
        status: a.status
      }));
      this.tableModel = { ...this.tableModel, data: rows };
    });
  }

  onView(row: AuditRow): void {
    this.router.navigate(['/audit-logs', row.id]);
  }
}
