// src/app/features/documents/list/document-list.component.ts
import { Component, OnInit }      from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule, Router }   from '@angular/router';
import { FormsModule }            from '@angular/forms';

import { TableComponent }         from '../../../shared/table/table.component';
import { TableModel }             from '../../../shared/table/table.model';
import { DocumentService }        from '../../../core/services/documents/document.service';
import { Document, DocumentStatus } from '../../../core/models/documents/document.model';

interface DocumentRow {
  id: string;
  name: string;
  description?: string;
  creationDate: string;
  createdBy: string;
  language: string;
  status: DocumentStatus;
}

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableComponent
  ],
  templateUrl: './document-list.component.html',
})
export class DocumentListComponent implements OnInit {
  tableModel: TableModel<DocumentRow> = {
    entityName: 'Lista de Documentos',
    tableConfig: {
      pageSize: 8,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron documentos.',
      trackByField: 'id',
    },
    columns: [
      { key: 'name',         header: 'Nombre de Documento', columnType: 'text', sortable: true,  filterable: true,  visible: true },
      { key: 'description',  header: 'Descripción',          columnType: 'text', sortable: true,  filterable: true,  visible: true },
      { key: 'creationDate', header: 'Fecha de Creación',    columnType: 'text', sortable: true,  filterable: false, visible: true },
      { key: 'createdBy',    header: 'Creado por',           columnType: 'text', sortable: true,  filterable: true,  visible: true },
      { key: 'language',     header: 'Idioma',               columnType: 'text', sortable: true,  filterable: true,  visible: true },
      { key: 'status',       header: 'Estado',               columnType: 'text', sortable: true,  filterable: false, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'assets/icons/tables/Pdf.svg',
            tooltip: 'Ver documento',
            handler: row => this.onView(row)
          },
          {
            label: '',
            icon: 'assets/icons/tables/Edit.svg',
            tooltip: 'Editar documento',
            handler: row => this.onEdit(row)
          },
          {
            label: '',
            icon: 'assets/icons/tables/Delete.svg',
            tooltip: 'Eliminar documento',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(private documentService: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.documentService.getAllDocuments().subscribe(docs => {
      const rows: DocumentRow[] = docs.map(d => ({
        id:           d.id,
        name:         d.name,
        description:  d.description,
        creationDate: d.creationDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        createdBy:    d.createdBy,
        language:     d.language,
        status:       d.status
      }));
      this.tableModel = { ...this.tableModel, data: rows };
    });
  }

  onView(row: DocumentRow) {
    console.log('Ver documento', row);
  }

  onEdit(row: DocumentRow) {
    console.log('Editar documento', row);
    // this.router.navigate(['/documents/edit', row.id]); // opcional
  }

  onDelete(row: DocumentRow) {
    if (confirm(`¿Seguro que deseas eliminar "${row.name}"?`)) {
      this.documentService.deleteDocument(row.id)
        .subscribe(() => this.loadDocuments());
    }
  }

  onCreate(): void {
    this.router.navigate(['/documents/create']);
  }
}
