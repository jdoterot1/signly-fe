import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent }       from '../../../shared/table/table.component';
import { TableModel }           from '../../../shared/table/table.model';
import { RoleService } from '../../../core/services/roles/roles.service';
import { Role } from '../../../core/models/roles/roles.model';
import { AlertService } from '../../../shared/alert/alert.service';

interface RoleRow {
  roleId: string;
  roleName: string;
  description?: string;
  version?: string | number;
}

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './roles-list.component.html'
})
export class RolesListComponent implements OnInit {
  @Input() returnTo: string | null = null;
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
      trackByField: 'roleId'
    },
    columns: [
      { key: 'roleName',        header: 'Nombre del Rol', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description', header: 'Descripción',     columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'version', header: 'Versión', columnType: 'text', sortable: true, filterable: false, visible: true },
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

  constructor(private roleService: RoleService, private router: Router, private alertService: AlertService) {}
  

  ngOnInit(): void {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles: Role[]) => {
        const rows: RoleRow[] = roles.map(role => ({
          roleId: role.roleId,
          roleName: role.roleName,
          description: role.description,
          version: role.version ?? '-'
        }));
        this.tableModel = { ...this.tableModel, data: rows };
      },
      error: err => {
        this.alertService.showError('No se pudieron cargar los roles.', 'Error');
        console.error('Error al cargar roles', err);
      }
    });
  }

  
  onEdit(row: RoleRow): void {
    this.router.navigate(['/roles', row.roleId, 'update'], this.navigationExtras());
  }

  onDelete(row: RoleRow): void {
    if (confirm(`¿Seguro que deseas eliminar el rol "${row.roleName}"?`)) {
      this.roleService.deleteRole(row.roleId)
        .subscribe({
          next: () => this.loadRoles(),
          error: err => {
            this.alertService.showError('No se pudo eliminar el rol.', 'Error');
            console.error('Error al eliminar rol', err);
          }
        });
    }
  }
  onCreate(): void {
    if (this.returnTo) {
      this.router.navigate([this.returnTo], {
        queryParams: { view: 'create-role', returnTo: this.returnTo }
      });
      return;
    }
    this.router.navigate(['/roles/create']);
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }
}
