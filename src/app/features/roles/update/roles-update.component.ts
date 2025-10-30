import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { RoleService } from '../../../core/services/roles/roles.service';
import { FormComponent } from '../../../shared/form/form.component';
import { ROLE_UPDATE_FORM_CONFIG } from '../../../core/constants/roles/update/roles-update.constant';
import { ROLE_PERMISSION_MATRIX } from '../../../core/constants/roles/permissions-map.constant';
import { PermissionMatrixComponent } from '../../../shared/permissions/permission-matrix/permission-matrix.component';

import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-role-update',
  standalone: true,
  imports: [FormComponent, PermissionMatrixComponent],
  templateUrl: './roles-update.component.html'
})
export class RolesUpdateComponent implements OnInit {
  formConfig = ROLE_UPDATE_FORM_CONFIG;
  permissionRows = ROLE_PERMISSION_MATRIX;
  form: FormGroup;
  selectedPermissions: string[] = [];

  private roleId!: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private roleService: RoleService,
    private router: Router,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      roleId: [{ value: '', disabled: true }, [Validators.required]],
      roleName: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.roleId = this.route.snapshot.params['id'];
    this.loadRole();
  }

  onSubmit(formValue: any): void {
    if (!this.selectedPermissions.length) {
      this.alertService.showError('Selecciona al menos un permiso para el rol.', 'Permisos requeridos');
      return;
    }

    const payload = {
      roleName: formValue.roleName,
      description: formValue.description,
      permissions: this.selectedPermissions
    };

    this.roleService.updateRole(this.roleId, payload).subscribe({
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

  onCancel(): void {
    this.router.navigate(['/roles']);
  }

  onPermissionsChange(permissions: string[]): void {
    this.selectedPermissions = permissions;
  }

  private loadRole(): void {
    this.roleService.getRoleById(this.roleId).subscribe({
      next: role => {
        this.form.patchValue({
          roleId: role.roleId,
          roleName: role.roleName,
          description: role.description
        });
        this.selectedPermissions = role.permissions || [];
      },
      error: err => {
        this.alertService.showError('Error al cargar el rol', 'Error');
        console.error('Error al cargar rol', err);
      }
    });
  }
}
