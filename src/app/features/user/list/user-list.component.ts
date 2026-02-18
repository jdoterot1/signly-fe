import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { UserService } from '../../../core/services/user/user.service';
import { UserSummary } from '../../../core/models/auth/user.model';
import { AlertService } from '../../../shared/alert/alert.service';



interface UserRow {
  sub: string;
  name: string;
  email: string;
  status: string;
  enabled: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent, TranslateModule],
  templateUrl: './user-list.component.html'
})
export class UsersListComponent implements OnInit {
  @Input() returnTo: string | null = null;

  tableModel: TableModel<UserRow> = {
    entityName: 'USERS.LIST_TITLE',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'USERS.EMPTY',
      trackByField: 'sub'
    },
    columns: [
      { key: 'name', header: 'USERS.NAME', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'email', header: 'USERS.EMAIL', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'enabled', header: 'USERS.ENABLED', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'USERS.STATUS', columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'USERS.ACTIONS',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'view',
            tooltip: 'USERS.VIEW',
            handler: row => this.onView(row)
          },
          {
            label: '',
            icon: 'edit',
            tooltip: 'USERS.EDIT',
            handler: row => this.onEdit(row)
          },
          {
            label: '',
            icon: 'delete',
            tooltip: 'USERS.DELETE',
            handler: row => this.onDelete(row)
          }
        ]
      }
    ],
    data: []
  };

  constructor(
    private userService: UserService,
    private router: Router,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users: UserSummary[]) => {
        const rows: UserRow[] = users.map(user => {
          const identifier = user.sub
            ?? user.username
            ?? user.attributes?.sub
            ?? user.attributes?.['custom:signly_user_id']
            ?? '';

          return {
            sub: identifier,
            name: this.extractDisplayName(user),
            email: user.email,
            status: user.status,
            enabled: user.enabled ? 'Sí' : 'No'
          };
        });
        this.tableModel = { ...this.tableModel, data: rows };
      },
      error: err => {
        this.alertService.showError('No se pudieron cargar los usuarios.', 'Error');
        console.error('Error al cargar usuarios', err);
      }
    });
  }

  onView(row: UserRow): void {
    if (!row.sub) {
      this.alertService.showError(
        this.translate.instant('USERS.ERROR_NO_ID'),
        this.translate.instant('ALERTS.ERROR_TITLE')
      );
      return;
    }
    this.router.navigate(['/users', row.sub, 'view'], this.navigationExtras());
  }

  onEdit(row: UserRow): void {
    if (!row.sub) {
      this.alertService.showError(
        this.translate.instant('USERS.ERROR_NO_ID'),
        this.translate.instant('ALERTS.ERROR_TITLE')
      );
      return;
    }
    this.router.navigate(['/users', row.sub, 'update'], this.navigationExtras());
  }


  onDelete(row: UserRow): void {
    const message = this.translate.instant('USERS.CONFIRM_DELETE', { name: row.name });
    if (confirm(message)) {
      this.userService.deleteUser(row.sub)
        .subscribe({
          next: () => {
            this.alertService.showSuccess(
              this.translate.instant('USERS.DELETE_SUCCESS'),
              this.translate.instant('USERS.DELETE_SUCCESS_TITLE')
            );
            this.loadUsers();
          },
          error: (err: any) => {
            this.alertService.showError(
              this.translate.instant('USERS.ERROR_DELETE'),
              this.translate.instant('ALERTS.ERROR_TITLE')
            );
            console.error('Error al eliminar usuario', err);
          }
        });
    }
  }
  onCreate(): void {
    this.router.navigate(['/users/create'], this.navigationExtras());
  }

  private navigationExtras(): NavigationExtras {
    if (!this.returnTo) {
      return {};
    }
    return { queryParams: { returnTo: this.returnTo } };
  }

  private extractDisplayName(user: UserSummary): string {
    if (user.name) {
      return user.name;
    }
    const given = user.attributes?.given_name;
    const family = user.attributes?.family_name;
    if (given || family) {
      return [given, family].filter(Boolean).join(' ');
    }
    return user.email;
  }
}
