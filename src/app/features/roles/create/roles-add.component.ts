// src/app/features/roles/create/roles-create.component.ts
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { RoleService } from '../../../core/services/roles/roles.service';
import { ROLE_PERMISSION_MATRIX } from '../../../core/constants/roles/permissions-map.constant';
import { PermissionMatrixComponent } from '../../../shared/permissions/permission-matrix/permission-matrix.component';

import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-role-create',
  standalone: true,
  imports: [PermissionMatrixComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './roles-add.component.html'
})
export class RolesCreateComponent {
  permissionRows = ROLE_PERMISSION_MATRIX;
  selectedPermissions: string[] = [];
  form: FormGroup;
  currentStep = 1;
  readonly totalSteps = 2;
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
      roleName: ['', [Validators.required]],
      description: ['']
    });
  }

  goNext(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.currentStep = Math.min(this.totalSteps, this.currentStep + 1);
  }

  goPrev(): void {
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  onSubmit(formValue: any) {
    if (!this.selectedPermissions.length) {
      this.alertService.showError('Selecciona al menos un permiso para el rol.', 'Permisos requeridos');
      return;
    }

    const normalizedRoleId = this.normalizeRoleId(formValue.roleName);
    if (!normalizedRoleId) {
      this.alertService.showError('El nombre del rol no puede estar vacío.', 'Datos inválidos');
      return;
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
