// src/app/features/users/user-add/user-add.component.ts
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { UserService }             from '../../../core/services/user/user.service';
import { CreateUserPayload } from '../../../core/models/auth/user.model';
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
  private readonly returnTo: string | null;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService 
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
  }

  /** Al enviar el formulario montamos el objeto User */
  onSubmit(formValue: any) {
    const payload: CreateUserPayload = {
      email: formValue.email,
      tmp_password: formValue.tmpPassword,
      attributes: {
        given_name: formValue.givenName,
        family_name: formValue.familyName
      }
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El usuario fue creado exitosamente', '¡Usuario creado!');
        setTimeout(() => this.navigateBack(), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el usuario', 'Error');
        console.error('Error al crear el usuario', err);
      }
    });
  }

  onCancel() {
    this.navigateBack();
  }

  private navigateBack(): void {
    const target = this.returnTo || '/users';
    this.router.navigateByUrl(target);
  }
}
