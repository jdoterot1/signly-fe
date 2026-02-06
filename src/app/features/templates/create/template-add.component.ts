// src/app/features/templates/create/template-add.component.ts
import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { TemplateService } from '../../../core/services/templates/template.service';
import type { CreateTemplateRequest, TemplateApi, TemplateField } from '../../../core/models/templates/template.model';
import { AlertService } from '../../../shared/alert/alert.service';
import { DocumentMapperComponent } from '../../document-mapper/document-mapper.component';
import { GuideModalComponent } from '../../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep } from '../../../shared/services/guide-flow/guide-flow.service';

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DocumentMapperComponent, GuideModalComponent],
  templateUrl: './template-add.component.html'
})
export class TemplateCreateComponent {
  @ViewChild(DocumentMapperComponent)
  private mapperComponent?: DocumentMapperComponent;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly stepForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]]
  });
  currentStep: 1 | 2 = 1;
  isSaving = false;
  isUploadingPdf = false;
  private readonly returnTo: string | null;
  private uploadedFile?: File;
  private pdfToUpload?: File;
  templateId: string | null = null;
  versions: Array<{ name: string; code: string }> = [];
  readonly versionControl = this.fb.control<string | null>(null, [Validators.required]);

  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  private readonly isGuidedFlow: boolean;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private guideFlow: GuideFlowService
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const guidedParam = this.route.snapshot.queryParamMap.get('guided');
    this.isGuidedFlow = guidedParam === '1' || guidedParam === 'true';
    if (this.isGuidedFlow) {
      this.guideSteps = this.guideFlow.getSteps('template');
      this.showGuideModal = true;
    }

    const templateIdParam = this.route.snapshot.queryParamMap.get('templateId');
    if (templateIdParam) {
      this.templateId = templateIdParam;
      // Start in step 2 when editing a template.
      this.currentStep = 2;
      const versionParam = this.normalizeVersion(this.route.snapshot.queryParamMap.get('templateVersion'));
      if (versionParam) {
        this.versionControl.setValue(versionParam, { emitEvent: false });
      }
      this.bootstrapExistingTemplate();
    }

    this.versionControl.valueChanges.subscribe(version => {
      if (!this.templateId || !version) {
        return;
      }
      this.loadTemplateVersion(version);
    });
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
    if (this.isSaving) {
      this.stepForm.markAllAsTouched();
      return;
    }

    if (this.stepForm.invalid) {
      this.stepForm.markAllAsTouched();
      return;
    }
    const raw = this.stepForm.getRawValue();
    const payload = {
      templateName: raw.name,
      description: raw.description || undefined
    };
    this.isSaving = true;

    if (!this.templateId) {
      this.templateService.createTemplate(payload as CreateTemplateRequest).subscribe({
        next: tpl => {
          this.templateId = tpl.templateId;
          const v = this.extractVersion(tpl.templateVersion) ?? this.normalizeVersion(String(tpl.version)) ?? '0001';
          this.versionControl.setValue(v, { emitEvent: false });
          this.loadHistory();
          this.finalizeTemplateSave();
        },
        error: err => {
          console.error('No se pudo crear la plantilla', err);
          this.alertService.showError('No se pudo crear la plantilla', 'Error');
        },
        complete: () => {
          this.isSaving = false;
        }
      });
      return;
    }

    this.templateService.updateTemplate(this.templateId, payload).subscribe({
      next: () => {
        this.finalizeTemplateSave();
      },
      error: err => {
        console.error('No se pudo actualizar la plantilla', err);
        this.alertService.showError('No se pudo guardar la plantilla.', 'Error');
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  private finalizeTemplateSave(): void {
    if (!this.templateId) {
      this.isSaving = false;
      return;
    }
    const version = this.versionControl.value || this.normalizeVersion('0001');
    if (!version) {
      this.isSaving = false;
      this.alertService.showError('Selecciona una versión para subir el archivo.', 'Error');
      return;
    }

    const file = this.pdfToUpload ?? this.uploadedFile;
    if (!file || !this.isSupportedTemplateFile(file)) {
      this.isSaving = false;
      this.alertService.showError('Debes subir un archivo válido (.pdf o .docx) para la plantilla.', 'Error');
      return;
    }

    const fields = this.buildTemplateFields();
    this.templateService.getTemplateUploadUrl(this.templateId, version).subscribe({
      next: res => {
        const headers = new HttpHeaders().set('Content-Type', file.type || 'application/octet-stream');
        this.http.put(res.uploadUrl, file, { headers, responseType: 'text' }).subscribe({
          next: () => {
            this.templateService.updateTemplateFields(this.templateId!, fields).subscribe({
              next: () => {
                this.alertService.showSuccess('Plantilla guardada correctamente', '¡Listo!');
                setTimeout(() => this.navigateAfterSave(), 900);
              },
              error: err => {
                console.error('No se pudieron guardar los campos', err);
                this.alertService.showError('Se subió el archivo, pero fallaron los campos.', 'Error');
              },
              complete: () => {
                this.isSaving = false;
              }
            });
          },
          error: err => {
            console.error('No se pudo subir el archivo', err);
            this.alertService.showError('No se pudo subir el archivo.', 'Error');
            this.isSaving = false;
          }
        });
      },
      error: err => {
        console.error('No se pudo generar el upload URL', err);
        this.alertService.showError('No se pudo generar el link de subida.', 'Error');
        this.isSaving = false;
      }
    });
  }

  private buildTemplateFields(): TemplateField[] {
    const mapped = this.mapperComponent?.getMappedFields() ?? [];
    return mapped.map((field, index) => ({
      page: String(field.page),
      x: this.toPixelString(field.x, field.pageWidth),
      y: this.toPixelString(field.y, field.pageHeight),
      width: this.toPixelString(field.width, field.pageWidth),
      height: this.toPixelString(field.height, field.pageHeight),
      fieldName: field.name,
      fieldType: field.type,
      fieldCode: String(index + 1)
    }));
  }

  private toPixelString(value: number, dimension: number): string {
    const safe = Number.isFinite(value) ? value : 0;
    const normalized = Math.min(Math.max(safe, 0), 1);
    const safeDimension = Number.isFinite(dimension) && dimension > 0 ? dimension : 1;
    return (normalized * safeDimension).toFixed(2);
  }

  onCancel(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    const target = this.returnTo || '/templates';
    this.router.navigateByUrl(target);
  }

  private navigateAfterSave(): void {
    if (this.isGuidedFlow) {
      const targetReturn = this.returnTo || '/dashboard';
      this.router.navigate(['/documents/create'], {
        queryParams: {
          guided: '1',
          guideStep: 'document',
          returnTo: targetReturn
        }
      });
      return;
    }
    this.navigateBack();
  }

  closeGuideModal(): void {
    this.showGuideModal = false;
  }

  startTemplateStep(): void {
    this.showGuideModal = false;
  }

  onFileSelected(file?: File): void {
    this.uploadedFile = file;
    if (file && !this.stepForm.get('name')?.dirty) {
      const suggestedName = file.name.replace(/\.[^.]+$/, '');
      this.stepForm.patchValue({ name: suggestedName });
    }
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.pdfToUpload = file ?? undefined;
    input.value = '';
  }

  downloadPdf(): void {
    if (!this.templateId) {
      this.alertService.showError('Primero crea la plantilla para poder descargar el PDF.', 'Error');
      return;
    }
    const version = this.versionControl.value;
    if (!version) {
      this.alertService.showError('Selecciona una versión', 'Error');
      return;
    }
    this.templateService.getTemplateDownloadUrl(this.templateId, version).subscribe({
      next: res => window.open(res.downloadUrl, '_blank', 'noopener,noreferrer'),
      error: err => {
        console.error('No se pudo generar el download URL', err);
        this.alertService.showError('No se pudo generar el link de descarga.', 'Error');
      }
    });
  }

  uploadPdf(): void {
    if (!this.templateId) {
      this.alertService.showError('Primero crea la plantilla para poder subir el PDF.', 'Error');
      return;
    }
    const version = this.versionControl.value;
    if (!version) {
      this.alertService.showError('Selecciona una versión', 'Error');
      return;
    }
    const file = this.pdfToUpload ?? this.uploadedFile;
    if (!file) {
      this.alertService.showError('Selecciona un archivo para subir.', 'Error');
      return;
    }
    if (!this.isSupportedTemplateFile(file)) {
      this.alertService.showError('El archivo a subir debe ser PDF o Word (.docx).', 'Error');
      return;
    }
    if (this.isUploadingPdf) {
      return;
    }
    this.isUploadingPdf = true;
    this.templateService.getTemplateUploadUrl(this.templateId, version).subscribe({
      next: res => {
        const headers = new HttpHeaders().set('Content-Type', file.type || 'application/octet-stream');
        this.http.put(res.uploadUrl, file, { headers, responseType: 'text' }).subscribe({
          next: () => {
            this.alertService.showSuccess('Archivo subido correctamente', '¡Archivo actualizado!');
            this.pdfToUpload = undefined;
          },
          error: err => {
            console.error('No se pudo subir el archivo al presigned URL', err);
            this.alertService.showError('No se pudo subir el archivo (revisa CORS/permisos).', 'Error');
          },
          complete: () => {
            this.isUploadingPdf = false;
          }
        });
      },
      error: err => {
        console.error('No se pudo generar el upload URL', err);
        this.alertService.showError('No se pudo generar el link de subida.', 'Error');
        this.isUploadingPdf = false;
      }
    });
  }

  openDocumentPicker(): void {
    this.mapperComponent?.openFilePicker();
  }

  get selectedFile(): File | undefined {
    return this.uploadedFile;
  }

  get selectedPdfName(): string {
    return this.pdfToUpload?.name || this.uploadedFile?.name || 'Sin PDF seleccionado';
  }

  private bootstrapExistingTemplate(): void {
    if (!this.templateId) {
      return;
    }
    this.loadHistory();
    // If version is already selected, load its data. Otherwise load last version.
    const version = this.versionControl.value;
    if (version) {
      this.loadTemplateVersion(version);
    } else {
      this.templateService.getTemplateDetail(this.templateId).subscribe({
        next: tpl => {
          const v = this.extractVersion(tpl.templateVersion) ?? this.normalizeVersion(String(tpl.version)) ?? null;
          if (v) {
            this.versionControl.setValue(v, { emitEvent: true });
          }
          this.stepForm.patchValue({
            name: tpl.templateName,
            description: tpl.description ?? ''
          });
        },
        error: err => {
          console.error('No se pudo cargar la plantilla', err);
        }
      });
    }
  }

  private loadHistory(): void {
    if (!this.templateId) {
      return;
    }
    this.templateService.getTemplateHistory(this.templateId).subscribe({
      next: history => {
        this.versions = this.buildVersionOptions(history);
        if (!this.versionControl.value && this.versions.length) {
          this.versionControl.setValue(this.versions[0].code, { emitEvent: true });
        }
      },
      error: err => {
        console.warn('No se pudo cargar el historial de versiones', err);
      }
    });
  }

  private loadTemplateVersion(version: string): void {
    if (!this.templateId) {
      return;
    }
    this.templateService.getTemplateVersion(this.templateId, version).subscribe({
      next: tpl => {
        // When switching versions, show name/description from that version in step 1.
        this.stepForm.patchValue({
          name: tpl.templateName,
          description: tpl.description ?? ''
        });
      },
      error: err => console.error('No se pudo cargar la versión del template', err)
    });
  }

  private buildVersionOptions(history: TemplateApi[]): Array<{ name: string; code: string }> {
    const versions = history
      .map(item => this.extractVersion(item.templateVersion))
      .filter((v): v is string => !!v)
      .map(v => ({ name: v, code: v }));
    const unique = Array.from(new Map(versions.map(v => [v.code, v])).values());
    unique.sort((a, b) => b.code.localeCompare(a.code));
    return unique;
  }

  private extractVersion(templateVersion: string | null | undefined): string | null {
    if (!templateVersion) {
      return null;
    }
    if (templateVersion.includes('#')) {
      const v = templateVersion.split('#')[1];
      return v?.trim() ? v.trim() : null;
    }
    return null;
  }

  private normalizeVersion(raw: string | null | undefined): string | null {
    if (!raw) {
      return null;
    }
    const normalized = raw.includes('#') ? raw.split('#')[1] : raw;
    const trimmed = normalized.trim();
    if (!trimmed) {
      return null;
    }
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      return String(Math.trunc(asNum)).padStart(4, '0');
    }
    return trimmed;
  }

  private isPdf(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  private isDocx(file: File): boolean {
    return (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    );
  }

  private isSupportedTemplateFile(file: File): boolean {
    return this.isPdf(file) || this.isDocx(file);
  }
}
