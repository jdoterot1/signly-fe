import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TableComponent } from '../../../shared/table/table.component';
import { TableModel } from '../../../shared/table/table.model';
import { UserService } from '../../../core/services/user/user.service';
import { User} from '../../../core/models/auth/user.model';



interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  workload: string;
  rol: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableComponent],
  templateUrl: './user-list.component.html'
})
export class UsersListComponent implements OnInit {
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
      trackByField: 'id'
    },
    columns: [
      { key: 'name',   header: 'Nombre',   columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'email',  header: 'Email',    columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'workload',  header: 'Cargo',    columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'rol',    header: 'Rol',      columnType: 'text', sortable: true, filterable: true, visible: true },
      { key: 'status', header: 'Estado',   columnType: 'text', sortable: true, filterable: true, visible: true },
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

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.getAllUsers()
      .subscribe((users: User[]) => {
        const rows: UserRow[] = users.map(u => ({
          id:     u.id!,
          name:   u.name || '',
          email:  u.email,
          status: u.status,
          workload:  u.workload,
          rol:    u.rol,
        }));
        this.tableModel = { ...this.tableModel, data: rows };
      });
  }

  onEdit(row: UserRow): void {
    this.router.navigate(['/users', row.id, 'update']);
  }


  onDelete(row: UserRow): void {
    if (confirm(`¿Seguro que deseas eliminar al usuario "${row.name}"?`)) {
      this.userService.deleteUser(row.id)
        .subscribe(() => this.loadUsers());
    }
  }
  onCreate(): void {
    this.router.navigate(['/users/create']);
  }
}
