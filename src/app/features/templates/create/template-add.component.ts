// src/app/features/templates/create/template-add.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { FormComponent } from '../../../shared/form/form.component';
import { TEMPLATE_CREATE_FORM_CONFIG } from '../../../core/constants/templates/create/templates-create.constant';
import { TemplateService } from '../../../core/services/templates/template.service';
import { Template } from '../../../core/models/templates/template.model';

import { AlertService } from '../../../shared/alert/alert.service'; 

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './template-add.component.html'
})
export class TemplateCreateComponent {
  formConfig = TEMPLATE_CREATE_FORM_CONFIG;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private alertService: AlertService 
  ) {}

  onSubmit(formValue: {
    name: string;
    description: string;
    language: { name: string; code: string };
    status: { name: string; code: string };
  }) {
    const payload: Template = {
      name:        formValue.name,
      description: formValue.description,
      language:    formValue.language.code,
      status:      formValue.status.code,
      creationDate: new Date(),
      createdBy:    'System Admin' // Aquí podrías usar el usuario logueado si lo tienes
    } as Template;

    this.templateService.createTemplate(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('La plantilla fue creada exitosamente', '¡Plantilla creada!');
        setTimeout(() => this.router.navigate(['/templates']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear la plantilla', 'Error');
        console.error('Error al crear la plantilla', err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/templates']);
  }
}
