// src/app/features/templates/list/template-list.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { TableComponent }       from '../../../shared/table/table.component';
import { TableModel }           from '../../../shared/table/table.model';
import { TemplateService }      from '../../../core/services/templates/template.service';
import { AuthService } from '../../../core/services/auth/auth.service';
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
      { key: 'name',         header: 'Nombre de plantilla', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description',  header: 'Descripción',         columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'creationDate', header: 'Fecha de creación',   columnType: 'text', sortable: true, filterable: false, visible: true },
      { key: 'createdBy',    header: 'Creado por',          columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'language',     header: 'Idioma',              columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status',       header: 'Estado',              columnType: 'text', sortable: true, filterable: false, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
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
            tooltip: 'Eliminar',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(private templateService: TemplateService, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.templateService.getAllTemplates()
      .subscribe((list: Template[]) => {
        const sortedByMostRecent = [...list].sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
        const rows: TemplateRow[] = sortedByMostRecent.map(t => ({
          id:            t.id,
          name:          t.name,
          description:   t.description,
          creationDate:  t.creationDate
                            .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          createdBy:     this.resolveCreatedBy(t.createdBy),
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
    const extras = this.navigationExtras();
    this.router.navigate(['/templates/create'], {
      ...extras,
      queryParams: {
        ...(extras.queryParams ?? {}),
        templateId: row.id
      }
    });
  }

  onDelete(row: TemplateRow) {
    if (confirm(`¿Seguro que deseas eliminar "${row.name}"?`)) {
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

  private resolveCreatedBy(createdById: string): string {
    const currentUser = this.authService.getSession()?.user;
    const currentUserDisplayName = currentUser?.name?.trim() || currentUser?.email?.trim() || '';
    if (!createdById) {
      return currentUserDisplayName;
    }
    if (currentUser?.userId && createdById === currentUser.userId && currentUserDisplayName) {
      return currentUserDisplayName;
    }
    return createdById;
  }

}
