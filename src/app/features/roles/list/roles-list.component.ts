import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
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
  imports: [CommonModule, RouterModule, FormsModule, TableComponent, TranslateModule],
  templateUrl: './roles-list.component.html'
})
export class RolesListComponent implements OnInit {
  @Input() returnTo: string | null = null;
  tableModel: TableModel<RoleRow> = {
    entityName: 'ROLES.LIST_TITLE',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'ROLES.EMPTY',
      trackByField: 'roleId'
    },
    columns: [
      { key: 'roleName', header: 'ROLES.NAME', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'description', header: 'ROLES.DESCRIPTION', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'version', header: 'ROLES.VERSION', columnType: 'text', sortable: true, filterable: false, visible: true },
      {
        key: 'actions',
        header: 'ROLES.ACTIONS',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'edit',
            tooltip: 'ROLES.EDIT',
            handler: row => this.onEdit(row)
          },
          {
            label: '',
            icon: 'delete',
            tooltip: 'ROLES.DELETE',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(
    private roleService: RoleService,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }


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
        this.alertService.showError(
          this.translate.instant('ROLES.ERROR_LOAD'),
          this.translate.instant('ALERTS.ERROR_TITLE')
        );
        console.error('Error al cargar roles', err);
      }
    });
  }


  onEdit(row: RoleRow): void {
    this.router.navigate(['/roles', row.roleId, 'update'], this.navigationExtras());
  }

  onDelete(row: RoleRow): void {
    const message = this.translate.instant('ROLES.CONFIRM_DELETE', { name: row.roleName });
    if (confirm(message)) {
      this.roleService.deleteRole(row.roleId)
        .subscribe({
          next: () => this.loadRoles(),
          error: err => {
            this.alertService.showError(
              this.translate.instant('ROLES.ERROR_DELETE'),
              this.translate.instant('ALERTS.ERROR_TITLE')
            );
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
