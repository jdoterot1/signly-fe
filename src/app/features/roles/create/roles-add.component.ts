// src/app/features/roles/create/roles-create.component.ts
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { RoleService } from '../../../core/services/roles/roles.service';
import { FormComponent } from '../../../shared/form/form.component';
import { ROLE_CREATE_FORM_CONFIG } from '../../../core/constants/roles/create/roles-create.constant';
import { ROLE_PERMISSION_MATRIX } from '../../../core/constants/roles/permissions-map.constant';
import { PermissionMatrixComponent } from '../../../shared/permissions/permission-matrix/permission-matrix.component';

import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-role-create',
  standalone: true,
  imports: [FormComponent, PermissionMatrixComponent],
  templateUrl: './roles-add.component.html'
})
export class RolesCreateComponent {
  formConfig = ROLE_CREATE_FORM_CONFIG;
  permissionRows = ROLE_PERMISSION_MATRIX;
  selectedPermissions: string[] = [];
  form: FormGroup;
  private readonly returnTo: string | null;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    this.form = this.fb.group({
      roleId: ['', [Validators.required]],
      roleName: ['', [Validators.required]],
      description: ['']
    });
  }

  onSubmit(formValue: any) {
    if (!this.selectedPermissions.length) {
      this.alertService.showError('Selecciona al menos un permiso para el rol.', 'Permisos requeridos');
      return;
    }

    const normalizedRoleId = this.normalizeRoleId(formValue.roleId);
    if (!normalizedRoleId) {
      this.alertService.showError('El identificador del rol no puede estar vacío.', 'Datos inválidos');
      return;
    }

    if (normalizedRoleId !== formValue.roleId) {
      this.form.patchValue({ roleId: normalizedRoleId }, { emitEvent: false });
    }

    const payload = {
      roleId: normalizedRoleId,
      roleName: formValue.roleName,
      description: formValue.description,
      permissions: this.selectedPermissions
    };

    this.roleService.createRole(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El rol fue creado exitosamente', '¡Rol creado!');
        setTimeout(() => this.navigateBack(), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el rol', 'Error');
        console.error(err);
      }
    });
  }

  onCancel() {
    this.navigateBack();
  }

  onPermissionsChange(permissions: string[]): void {
    this.selectedPermissions = permissions;
  }

  private normalizeRoleId(roleId: string): string {
    return (roleId || '').trim().toLowerCase().replace(/\s+/g, '-');
  }

  private navigateBack(): void {
    const target = this.returnTo || '/roles';
    this.router.navigateByUrl(target);
  }
}
