// src/app/features/users/user-update/user-update.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { UserService } from '../../../core/services/user/user.service';
import { User } from '../../../core/models/auth/user.model';
import { FormComponent } from '../../../shared/form/form.component';
import { USER_UPDATE_FORM_CONFIG } from '../../../core/constants/user/update/user-update.constant';

import { AlertService } from '../../../shared/alert/alert.service'; // ✅ Importar alerta

@Component({
  selector: 'app-user-update',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './user-update.component.html'
})
export class UserUpdateComponent implements OnInit {
  formConfig = USER_UPDATE_FORM_CONFIG;
  selectedFile?: File;
  userId!: string;
  initialData: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private alertService: AlertService // ✅ Inyectar servicio
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    this.loadUserData();
  }

  /** Carga los datos del usuario para llenar el formulario */
  private loadUserData(): void {
    this.userService.getUserById(this.userId).subscribe({
      next: (user: User) => {
        this.initialData = {
          name: user.name,
          email: user.email,
          role: { code: user.rol, name: this.getRoleName(user.rol) },
          active: user.status === 'Active',
          birthDate: user.birthDate,
          description: user.workload
        };
      },
      error: err => {
        this.alertService.showError('Error al cargar el usuario', 'Error');
        console.error('Error al cargar el usuario', err);
      }
    });
  }

  /** Recoge el evento del upload */
  onFileSelected(file: File) {
    this.selectedFile = file;
  }

  /** Al enviar el formulario montamos el objeto User */
  onSubmit(formValue: any) {
    const payload: User = {
      id:           this.userId,
      name:         formValue.name,
      email:        formValue.email,
      rol:          formValue.role.code,
      status:       formValue.active ? 'Active' : 'Inactive',
      workload:     formValue.description,
      birthDate:    formValue.birthDate,
      profileImage: this.selectedFile
    } as User;

    this.userService.updateUser(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El usuario fue actualizado correctamente', '¡Usuario actualizado!');
        setTimeout(() => this.router.navigate(['/users']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo actualizar el usuario', 'Error');
        console.error('Error al actualizar el usuario', err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/users']);
  }

  /** Devuelve el nombre del rol a partir del código */
  private getRoleName(code: string): string {
    const roles = [
      { name: 'Administrador', code: 'admin' },
      { name: 'Editor', code: 'editor' },
      { name: 'Usuario', code: 'usuario' }
    ];
    return roles.find(r => r.code === code)?.name ?? '';
  }
}
