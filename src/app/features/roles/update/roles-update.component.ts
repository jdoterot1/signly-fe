// src/app/features/roles/update/roles-update.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { RoleService } from '../../../core/services/roles/roles.service';
import { Role } from '../../../core/models/roles/roles.model';
import { FormComponent } from '../../../shared/form/form.component';
import { ROLE_UPDATE_FORM_CONFIG } from '../../../core/constants/roles/update/roles-update.constant';

import { AlertService } from '../../../shared/alert/alert.service'; 

@Component({
  selector: 'app-role-update',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './roles-update.component.html'
})
export class RolesUpdateComponent implements OnInit {
  formConfig = ROLE_UPDATE_FORM_CONFIG;
  initialData: any = {};
  private roleId!: string;

  constructor(
    private route: ActivatedRoute,
    private roleService: RoleService,
    private router: Router,
    private alertService: AlertService 
  ) {}

  ngOnInit(): void {
    this.roleId = this.route.snapshot.params['id'];

    this.roleService.getRoleById(this.roleId).subscribe({
      next: role => {
        this.initialData = {
          name:        role.name,
          description: role.description,
          status:      role.status === 'Active'
        };
      },
      error: err => {
        this.alertService.showError('Error al cargar el rol', 'Error');
        console.error('Error al cargar rol', err);
      }
    });
  }

  onSubmit(formValue: any) {
    const payload: Role = {
      id:          this.roleId,
      name:        formValue.name,
      description: formValue.description,
      status:      formValue.status ? 'Active' : 'Inactive'
    } as Role;

    this.roleService.updateRole(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El rol fue actualizado correctamente', '¡Rol actualizado!');
        setTimeout(() => this.router.navigate(['/roles']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo actualizar el rol', 'Error');
        console.error('Error al actualizar el rol', err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/roles']);
  }
}
