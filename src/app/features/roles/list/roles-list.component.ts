import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent }       from '../../../shared/table/table.component';
import { TableModel }           from '../../../shared/table/table.model';
import { RoleService } from '../../../core/services/roles/roles.service';
import { Role } from '../../../core/models/roles/roles.model';

interface RoleRow {
  id: string;
  name: string;
  description?: string;
  status: string;
  permits: string;
}

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './roles-list.component.html'
})
export class RolesListComponent implements OnInit {
  tableModel: TableModel<RoleRow> = {
    entityName: 'Lista de Roles',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron roles.',
      trackByField: 'id'
    },
    columns: [
      { key: 'name',        header: 'Nombre del Rol', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description', header: 'Descripción',     columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'permits', header: 'Permisos', columnType: 'text', sortable: false, filterable: false, visible: true },
      { key: 'status', header: 'Estado', columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
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

  constructor(private roleService: RoleService, private router: Router) {}
  

  ngOnInit(): void {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.roleService.getAllRoles()
      .subscribe((roles: Role[]) => {
        const rows: RoleRow[] = roles.map(r => ({
          id: r.id!,
          name: r.name,
          description: r.description,
          status: r.status,
          permits: r.permits
        }));
        this.tableModel = { ...this.tableModel, data: rows };
      });
  }

  
  onEdit(row: RoleRow): void {
    this.router.navigate(['/roles', row.id, 'update']);
    // Puedes navegar al formulario de edición o abrir un modal
  }

  onDelete(row: RoleRow): void {
    if (confirm(`¿Seguro que deseas eliminar el rol "${row.name}"?`)) {
      this.roleService.deleteRole(row.id)
        .subscribe(() => this.loadRoles());
    }
  }
  onCreate(): void {
    this.router.navigate(['/roles/create']);
  }
}
