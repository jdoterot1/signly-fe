import { Component, OnInit }      from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule }           from '@angular/router';
import { FormsModule }            from '@angular/forms';

import { TableComponent }         from '../../../shared/table/table.component';
import { TableModel }             from '../../../shared/table/table.model';
import { DocumentService }        from '../../../core/services/documents/document.service';
import { Document, DocumentStatus } from '../../../core/models/documents/document.model';

import { AlertComponent }         from '../../../shared/alert/alert.component';
import { AlertType }              from '../../../shared/alert/alert-type.enum';

interface DocumentRow {
  id: string;
  name: string;
  description?: string;
  creationDate: string;    // 'dd/MM/yyyy'
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
    TableComponent,
    AlertComponent
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

  // ── Toast Alert ──
  alertType       = AlertType;
  currentAlertType: AlertType = AlertType.Success;
  alertMessage    = '';
  alertVisible    = false;

  // ── Confirm Modal ──
  confirmMode     = true;
  confirmVisible  = false;
  confirmMessage  = '';
  private pendingDelete!: DocumentRow;

  constructor(private documentService: DocumentService) {}

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

  /** Mostrar toast */
  private showToast(type: AlertType, message: string): void {
    this.currentAlertType = type;
    this.alertMessage     = message;
    this.alertVisible     = true;
    setTimeout(() => this.alertVisible = false, 3000);
  }

  onView(row: DocumentRow) {
    console.log('Ver documento', row);
  }

  onEdit(row: DocumentRow) {
    console.log('Editar documento', row);
  }

  onDelete(row: DocumentRow) {
    // abre modal de confirmación
    this.pendingDelete  = row;
    this.confirmMessage = `¿Seguro que deseas eliminar "${row.name}"?`;
    this.confirmVisible = true;
  }

  /** usuario confirma eliminación */
  onConfirmedDelete() {
    this.confirmVisible = false;
    this.documentService.deleteDocument(this.pendingDelete.id)
      .subscribe(() => {
        this.loadDocuments();
        this.showToast(AlertType.Delete, `Documento "${this.pendingDelete.name}" eliminado con éxito.`);
      });
  }

  /** usuario cancela */
  onCancelDelete() {
    this.confirmVisible = false;
  }
}
