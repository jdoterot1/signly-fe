// src/app/features/users/user-update/user-update.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { UserService } from '../../../core/services/user/user.service';
import { UserSummary, UpdateUserAttributesPayload, UpdateUserStatusPayload } from '../../../core/models/auth/user.model';
import { FormComponent } from '../../../shared/form/form.component';
import { USER_UPDATE_FORM_CONFIG } from '../../../core/constants/user/update/user-update.constant';

import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-user-update',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './user-update.component.html'
})
export class UserUpdateComponent implements OnInit {
  formConfig = USER_UPDATE_FORM_CONFIG;
  form: FormGroup;
  private userId!: string;
  private currentEnabled = true;
  private returnTo: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private alertService: AlertService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      email: [{ value: '', disabled: true }, [Validators.required]],
      givenName: ['', [Validators.required]],
      familyName: ['', [Validators.required]],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    this.loadUserData();
  }

  private loadUserData(): void {
    this.userService.getUserById(this.userId).subscribe({
      next: (user: UserSummary) => {
        this.currentEnabled = user.enabled;
        this.form.patchValue({
          email: user.email,
          givenName: user.attributes?.given_name || '',
          familyName: user.attributes?.family_name || '',
          enabled: user.enabled
        });
      },
      error: err => {
        this.alertService.showError('Error al cargar el usuario', 'Error');
        console.error('Error al cargar el usuario', err);
      }
    });
  }

  onSubmit(formValue: any) {
    const attributesPayload: UpdateUserAttributesPayload = {
      attributes: {
        given_name: formValue.givenName,
        family_name: formValue.familyName
      }
    };

    const statusChanged = formValue.enabled !== this.currentEnabled;

    this.userService.updateUserAttributes(this.userId, attributesPayload).subscribe({
      next: () => {
        if (!statusChanged) {
          this.currentEnabled = formValue.enabled;
          this.handleSuccess();
          return;
        }

        const statusPayload: UpdateUserStatusPayload = {
          enabled: formValue.enabled
        };

        this.userService.updateUserStatus(this.userId, statusPayload).subscribe({
          next: () => {
            this.currentEnabled = statusPayload.enabled;
            this.handleSuccess();
          },
          error: err => {
            this.alertService.showError('No se pudo actualizar el estado del usuario', 'Error');
            console.error('Error al actualizar estado de usuario', err);
          }
        });
      },
      error: err => {
        this.alertService.showError('No se pudo actualizar el usuario', 'Error');
        console.error('Error al actualizar el usuario', err);
      }
    });
  }

  onCancel() {
    this.navigateBack();
  }

  private handleSuccess(): void {
    this.alertService.showSuccess('El usuario fue actualizado correctamente', '¡Usuario actualizado!');
    setTimeout(() => this.navigateBack(), 2600);
  }

  private navigateBack(): void {
    const target = this.returnTo || '/users';
    this.router.navigateByUrl(target);
  }
}
