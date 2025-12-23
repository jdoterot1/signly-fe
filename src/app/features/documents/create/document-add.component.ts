// src/app/features/documents/create/document-add.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { DocumentService } from '../../../core/services/documents/document.service';
import { Document } from '../../../core/models/documents/document.model';
import { FormComponent } from '../../../shared/form/form.component';
import { DOCUMENT_CREATE_FORM_CONFIG } from '../../../core/constants/documents/create/documents-create.constant';

import { AlertService } from '../../../shared/alert/alert.service'; // ✅ Importar servicio
import { GuideModalComponent } from '../../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep } from '../../../shared/services/guide-flow/guide-flow.service';

@Component({
  selector: 'app-document-create',
  standalone: true,
  imports: [CommonModule, FormComponent, GuideModalComponent],
  templateUrl: './document-add.component.html'
})
export class DocumentCreateComponent {
  formConfig = DOCUMENT_CREATE_FORM_CONFIG;
  selectedFile?: File;
  private readonly returnTo: string | null;
  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  private readonly isGuidedFlow: boolean;

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService, // ✅ Inyectar servicio
    private guideFlow: GuideFlowService
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const guidedParam = this.route.snapshot.queryParamMap.get('guided');
    this.isGuidedFlow = guidedParam === '1' || guidedParam === 'true';
    if (this.isGuidedFlow) {
      this.guideSteps = this.guideFlow.getSteps('document');
      this.showGuideModal = true;
    }
  }

  onFileSelected(file: File) {
    this.selectedFile = file;
    console.log('Archivo PDF seleccionado:', file);
  }

  onSubmit(formValue: any) {
    const payload: Document = {
      name:         formValue.name,
      description:  formValue.description,
      status:       'Pending',
      creationDate: new Date(),
      language:     formValue.language.code,
      createdBy:    'admin',
      registeredBy: 'admin',
      registerDate: new Date(),
      updateDate:   new Date(),
      updatedBy:    'admin'
    } as Document;

    const formData = new FormData();
    Object.entries(payload).forEach(([key, val]) =>
      formData.append(key, val as string)
    );

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.documentService.createDocument(payload).subscribe({
      next: () => {
        this.alertService.showSuccess('El documento fue creado exitosamente', '¡Documento creado!');
        setTimeout(() => this.navigateBack(), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el documento', 'Error');
        console.error('Error al crear el documento', err);
      }
    });
  }

  onCancel() {
    this.navigateBack();
  }

  private navigateBack(): void {
    const target = this.returnTo || '/documents';
    this.router.navigateByUrl(target);
  }

  closeGuideModal(): void {
    this.showGuideModal = false;
  }

  startDocumentStep(): void {
    this.showGuideModal = false;
  }
}
