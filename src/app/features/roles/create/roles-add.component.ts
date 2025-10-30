// src/app/features/roles/create/roles-create.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { RoleService } from '../../../core/services/roles/roles.service';
import { Role } from '../../../core/models/roles/roles.model';
import { FormComponent } from '../../../shared/form/form.component';
import { ROLE_CREATE_FORM_CONFIG } from '../../../core/constants/roles/create/roles-create.constant';

import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-role-create',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './roles-add.component.html'
})
export class RolesCreateComponent {
  formConfig = ROLE_CREATE_FORM_CONFIG;

  constructor(
    private roleService: RoleService,
    private router: Router,
    private alertService: AlertService
  ) {}

  onSubmit(formValue: any) {
    const payload: Role = {
      name: formValue.name,
      description: formValue.description,
      status: formValue.status ? 'Active' : 'Inactive',
    }as Role;

    this.roleService.createRole(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El rol fue creado exitosamente', '¡Rol creado!');
        setTimeout(() => this.router.navigate(['/roles']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el rol', 'Error');
        console.error(err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/roles']);
  }
}
