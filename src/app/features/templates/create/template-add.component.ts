// src/app/features/templates/create/template-add.component.ts
import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TemplateService } from '../../../core/services/templates/template.service';
import { Template } from '../../../core/models/templates/template.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { DocumentMapperComponent } from '../../document-mapper/document-mapper.component';

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DocumentMapperComponent],
  templateUrl: './template-add.component.html'
})
export class TemplateCreateComponent {
  @ViewChild(DocumentMapperComponent)
  private mapperComponent?: DocumentMapperComponent;

  private readonly fb = inject(FormBuilder);

  readonly stepForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]]
  });
  currentStep: 1 | 2 = 1;
  isSaving = false;
  private readonly returnTo: string | null;
  private uploadedFile?: File;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
  }

  goToStepTwo(): void {
    if (this.stepForm.invalid) {
      this.stepForm.markAllAsTouched();
      return;
    }
    this.currentStep = 2;
  }

  goBackToStepOne(): void {
    this.currentStep = 1;
  }

  saveTemplate(): void {
    if (this.stepForm.invalid || this.isSaving) {
      this.stepForm.markAllAsTouched();
      return;
    }

    const { name, description } = this.stepForm.getRawValue();
    const payload: Template = {
      name,
      description,
      language: 'Spanish',
      status: 'Pending',
      creationDate: new Date(),
      createdBy: 'System Admin'
    } as Template;

    this.isSaving = true;
    this.templateService.createTemplate(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('La plantilla fue creada exitosamente', '¡Plantilla creada!');
        setTimeout(() => this.navigateBack(), 2600);
      },
      error: err => {
        this.isSaving = false;
        this.alertService.showError('No se pudo crear la plantilla', 'Error');
        console.error('Error al crear la plantilla', err);
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  onCancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    const target = this.returnTo || '/templates';
    this.router.navigateByUrl(target);
  }

  onFileSelected(file?: File): void {
    this.uploadedFile = file;
    if (file && !this.stepForm.get('name')?.dirty) {
      const suggestedName = file.name.replace(/\.[^.]+$/, '');
      this.stepForm.patchValue({ name: suggestedName });
    }
  }

  openDocumentPicker(): void {
    this.mapperComponent?.openFilePicker();
  }

  get selectedFile(): File | undefined {
    return this.uploadedFile;
  }
}
