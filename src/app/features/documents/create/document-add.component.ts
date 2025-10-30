// src/app/features/documents/create/document-add.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { DocumentService } from '../../../core/services/documents/document.service';
import { Document } from '../../../core/models/documents/document.model';
import { FormComponent } from '../../../shared/form/form.component';
import { DOCUMENT_CREATE_FORM_CONFIG } from '../../../core/constants/documents/create/documents-create.constant';

import { AlertService } from '../../../shared/alert/alert.service'; // ✅ Importar servicio

@Component({
  selector: 'app-document-create',
  standalone: true,
  imports: [FormComponent],
  templateUrl: './document-add.component.html'
})
export class DocumentCreateComponent {
  formConfig = DOCUMENT_CREATE_FORM_CONFIG;
  selectedFile?: File;

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private alertService: AlertService // ✅ Inyectar servicio
  ) {}

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
        setTimeout(() => this.router.navigate(['/documents']), 2600);
      },
      error: err => {
        this.alertService.showError('No se pudo crear el documento', 'Error');
        console.error('Error al crear el documento', err);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/documents']);
  }
}
