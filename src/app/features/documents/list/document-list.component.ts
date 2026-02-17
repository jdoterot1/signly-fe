// src/app/features/documents/list/document-list.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { DocumentService } from '../../../core/services/documents/document.service';
import {
  Document,
  DocumentStatus,
} from '../../../core/models/documents/document.model';
import { TranslateService } from '@ngx-translate/core';

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
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './document-list.component.html',
})
export class DocumentListComponent implements OnInit {
  @Input() returnTo: string | null = null;
  tableModel: TableModel<DocumentRow> = {
    entityName: 'DOCUMENTS.LIST_TITLE',
    tableConfig: {
      pageSize: 8,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'DOCUMENTS.EMPTY',
      trackByField: 'id',
    },
    columns: [
      {
        key: 'name',
        header: 'DOCUMENTS.NAME',
        columnType: 'text',
        sortable: true,
        filterable: true,
        visible: true,
      },
      {
        key: 'description',
        header: 'DOCUMENTS.DOC_DESCRIPTION',
        columnType: 'text',
        sortable: true,
        filterable: true,
        visible: true,
      },
      {
        key: 'creationDate',
        header: 'DOCUMENTS.CREATED_AT',
        columnType: 'text',
        sortable: true,
        filterable: false,
        visible: true,
      },
      {
        key: 'createdBy',
        header: 'DOCUMENTS.CREATED_BY',
        columnType: 'text',
        sortable: true,
        filterable: true,
        visible: true,
      },
      {
        key: 'language',
        header: 'DOCUMENTS.LANGUAGE',
        columnType: 'text',
        sortable: true,
        filterable: true,
        visible: true,
      },
      {
        key: 'status',
        header: 'DOCUMENTS.STATUS',
        columnType: 'text',
        sortable: true,
        filterable: false,
        visible: true,
        statusTranslationPrefix: 'DOCUMENTS.STATUS_VALUES',
      },
      {
        key: 'actions',
        header: 'TEMPLATES.ACTIONS_LABEL',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'view',
            tooltip: 'DOCUMENTS.VIEW',
            handler: (row) => this.onView(row),
          },
          {
            label: '',
            icon: 'edit',
            tooltip: 'DOCUMENTS.EDIT',
            handler: (row) => this.onEdit(row),
          },
          {
            label: '',
            icon: 'delete',
            tooltip: 'DOCUMENTS.DELETE',
            handler: (row) => this.onDelete(row),
          },
        ],
      },
    ],
    data: [],
  };

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.documentService.getAllDocuments().subscribe((docs) => {
      const rows: DocumentRow[] = docs.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        creationDate: d.creationDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        createdBy: d.createdBy,
        language: d.language,
        status: d.status,
      }));
      this.tableModel = { ...this.tableModel, data: rows };
    });
  }

  onView(row: DocumentRow) {
    this.router.navigate(['/documents', row.id], this.navigationExtras());
  }

  onEdit(row: DocumentRow) {
    console.log('Editar documento', row);
    // this.router.navigate(['/documents/edit', row.id]); // opcional
  }

  onDelete(row: DocumentRow) {
    const message = this.translate.instant('DOCUMENTS.CONFIRM_DELETE', {
      name: row.name,
    });

    if (confirm(message)) {
      this.documentService
        .deleteDocument(row.id)
        .subscribe(() => this.loadDocuments());
    }
  }

  onCreate(): void {
    this.router.navigate(['/documents/create'], this.navigationExtras());
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }
}
