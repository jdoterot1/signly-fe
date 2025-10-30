// src/app/features/users/user-add/user-add.component.ts
import { Component } from '@angular/core';
import { Router }    from '@angular/router';

import { UserService }             from '../../../core/services/user/user.service';
import { User }                    from '../../../core/models/auth/user.model';
import { FormComponent }           from '../../../shared/form/form.component';
import { USER_CREATE_FORM_CONFIG } from '../../../core/constants/user/create/user-create.constant';

import { AlertService } from '../../../shared/alert/alert.service'; 

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './user-add.component.html'
})
export class UserCreateComponent {
  formConfig = USER_CREATE_FORM_CONFIG;

  /** Aquí guardamos temporalmente el archivo seleccionado */
  selectedFile?: File;

  constructor(
    private userService: UserService,
    private router: Router,
    private alertService: AlertService 
  ) {}

  /** Recoge el evento del upload y guarda el File */
  onFileSelected(file: File) {
    this.selectedFile = file;
    console.log('Imagen seleccionada:', file);
  }

  /** Al enviar el formulario montamos el objeto User */
  onSubmit(formValue: any) {
    const payload: User = {
      name:         formValue.name,
      email:        formValue.email,
      password:     formValue.password,
      rol:          formValue.role.code,
      status:       formValue.active ? 'Active' : 'Inactive',
      workload:     formValue.description,
      birthDate:    formValue.birthDate,
      profileImage: this.selectedFile
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El usuario fue creado exitosamente', '¡Usuario creado!');
        setTimeout(() => this.router.navigate(['/users']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el usuario', 'Error');
        console.error('Error al crear el usuario', err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/users']);
  }
}
