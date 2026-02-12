// src/app/features/templates/list/template-list.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { TableComponent }       from '../../../shared/table/table.component';
import { TableModel }           from '../../../shared/table/table.model';
import { TemplateService }      from '../../../core/services/templates/template.service';
import { Template, TemplateStatus } from '../../../core/models/templates/template.model';

interface TemplateRow {
  id: string;
  name: string;
  description?: string;
  creationDate: string;      // ya formateado
  createdBy: string;
  language: string;
  status: TemplateStatus;    // 'Pending' | 'In Progress' | 'Completed'
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [ CommonModule, RouterModule, FormsModule, TableComponent ],
  templateUrl: './template-list.component.html'
})
export class TemplateListComponent implements OnInit {
  @Input() returnTo: string | null = null;
  tableModel: TableModel<TemplateRow> = {
    entityName: 'Lista de Plantillas',
    tableConfig: {
      pageSize: 8,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron plantillas.',
      trackByField: 'id'
    },
    columns: [
      { key: 'name',         header: 'Template Name',    columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description',  header: 'Description',      columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'creationDate', header: 'Creation Date',    columnType: 'text', sortable: true, filterable: false, visible: true },
      { key: 'createdBy',    header: 'Created By',       columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'language',     header: 'Language',         columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status',       header: 'Status',           columnType: 'text', sortable: true, filterable: false, visible: true },
      {
        key: 'actions',
        header: 'Actions',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'view',
            tooltip: 'Visualizar',
            handler: row => this.onView(row)
          },
          {
            label: '',
            icon: 'edit',
            tooltip: 'Editar',
            handler: row => this.onEdit(row)
          },
          {
            label: '',
            icon: 'delete',
            tooltip: 'Delete',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(private templateService: TemplateService, private router: Router) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.templateService.getAllTemplates()
      .subscribe((list: Template[]) => {
        const rows: TemplateRow[] = list.map(t => ({
          id:            t.id,
          name:          t.name,
          description:   t.description,
          creationDate:  t.creationDate
                            .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            .replace(/\//g, '/'),
          createdBy:     t.createdBy,
          language:      t.language,
          status:        t.status
        }));
        this.tableModel = { ...this.tableModel, data: rows };
      });
  }

  onView(row: TemplateRow) {
    this.router.navigate(['/templates', row.id], this.navigationExtras());
  }

  onEdit(row: TemplateRow) {
    this.router.navigate(['/templates', row.id, 'edit'], this.navigationExtras());
  }

  onDelete(row: TemplateRow) {
    if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
      this.templateService.deleteTemplate(row.id)
        .subscribe(() => this.loadTemplates());
    }
  }
  onCreate(): void {
    this.router.navigate(['/templates/create'], this.navigationExtras());
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }

}
