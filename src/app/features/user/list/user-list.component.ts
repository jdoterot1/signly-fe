import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './user-list.component.html'
})
export class UsersListComponent implements OnInit {
  @Input() returnTo: string | null = null;

  tableModel: TableModel<UserRow> = {
    entityName: 'Lista de Usuarios',
    tableConfig: {
      pageSize: 10,
      enableFiltering: true,
      enableSorting: true,
      showPagination: true,
      showRowSelection: false,
      showIndexColumn: false,
      emptyMessage: 'No se encontraron usuarios.',
      trackByField: 'sub'
    },
    columns: [
      { key: 'name',   header: 'Nombre',  columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'email',  header: 'Correo',  columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'enabled', header: 'Habilitado', columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado',  columnType: 'text', sortable: true, filterable: true, visible: true },
      {
        key: 'actions',
        header: 'Acciones',
        columnType: 'action',
        visible: true,
        actions: [
          {
            label: '',
            icon: 'assets/icons/tables/view.svg',
            tooltip: 'Ver',
            handler: row => this.onView(row)
          },
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

  constructor(private userService: UserService, private router: Router, private alertService: AlertService) {}

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
      this.alertService.showError('No se pudo determinar el identificador del usuario.', 'Error');
      return;
    }
    this.router.navigate(['/users', row.sub, 'view'], this.navigationExtras());
  }

  onEdit(row: UserRow): void {
    if (!row.sub) {
      this.alertService.showError('No se pudo determinar el identificador del usuario.', 'Error');
      return;
    }
    this.router.navigate(['/users', row.sub, 'update'], this.navigationExtras());
  }


  onDelete(row: UserRow): void {
    if (confirm(`¿Seguro que deseas eliminar al usuario "${row.name}"?`)) {
      this.userService.deleteUser(row.sub)
        .subscribe({
          next: () => {
            this.alertService.showSuccess('El usuario fue eliminado correctamente.', 'Usuario eliminado');
            this.loadUsers();
          },
          error: err => {
            this.alertService.showError('No se pudo eliminar el usuario.', 'Error');
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
