// src/app/features/templates/create/template-add.component.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PDFDocument, rgb } from 'pdf-lib';

import { TemplateService } from '../../../core/services/templates/template.service';
import type { CreateTemplateRequest, TemplateApi, TemplateApiField, TemplateField } from '../../../core/models/templates/template.model';
import { AlertService } from '../../../shared/alert/alert.service';
import {
  DocumentMappedField,
  DocumentMapperComponent,
  DocumentPdfTextEdit,
  DocumentMapperValidationResult
} from '../../document-mapper/document-mapper.component';
import { GuideModalComponent } from '../../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep, GuideStepKey } from '../../../shared/services/guide-flow/guide-flow.service';

@Component({
  selector: 'app-template-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DocumentMapperComponent, GuideModalComponent],
  templateUrl: './template-add.component.html'
})
export class TemplateCreateComponent {
  @ViewChild('templateFileInput')
  private templateFileInputRef?: ElementRef<HTMLInputElement>;

  @ViewChild(DocumentMapperComponent)
  private mapperComponent?: DocumentMapperComponent;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly stepForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]]
  });
  currentStep: 1 | 2 = 1;
  isDocumentDragOver = false;
  documentFieldTouched = false;
  isSaving = false;
  isUploadingPdf = false;
  private readonly returnTo: string | null;
  private readonly isEditingExistingTemplate: boolean;
  private uploadedFile?: File;
  private pdfToUpload?: File;
  templateId: string | null = null;
  versions: Array<{ name: string; code: string }> = [];
  readonly versionControl = this.fb.control<string | null>({ value: null, disabled: true }, [Validators.required]);
  private versionLoadSession = 0;

  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  private readonly isGuidedFlow: boolean;
  private readonly guideStep: GuideStepKey;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private guideFlow: GuideFlowService
  ) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const guidedParam = this.route.snapshot.queryParamMap.get('guided');
    const guideStepParam = this.route.snapshot.queryParamMap.get('guideStep');
    this.isGuidedFlow = guidedParam === '1' || guidedParam === 'true';
    this.guideStep = guideStepParam === 'document' ? 'document' : 'template';
    if (this.isGuidedFlow && this.guideStep !== 'template') {
      this.guideSteps = this.guideFlow.getSteps(this.guideStep);
      this.showGuideModal = true;
    }

    const templateIdParam = this.route.snapshot.queryParamMap.get('templateId') ?? this.route.snapshot.paramMap.get('templateId');
    this.isEditingExistingTemplate = !!templateIdParam;
    if (templateIdParam) {
      this.templateId = templateIdParam;
      // Start in step 1 when editing so metadata can also be updated.
      this.currentStep = 1;
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

  private syncVersionControlState(): void {
    if (this.templateId && this.versions.length) {
      this.versionControl.enable({ emitEvent: false });
    } else {
      this.versionControl.disable({ emitEvent: false });
    }
  }

  goToStepTwo(): void {
    if (this.stepForm.invalid) {
      this.stepForm.markAllAsTouched();
      return;
    }
    if (this.canEditDocumentFile && !this.uploadedFile) {
      this.documentFieldTouched = true;
      return;
    }
    this.currentStep = 2;
    void this.syncFileWithMapper();
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
          this.syncVersionControlState();
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

  private async finalizeTemplateSave(): Promise<void> {
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
      this.alertService.showError('Debes subir un archivo PDF válido para la plantilla.', 'Error');
      return;
    }

    const mappedFields = this.mapperComponent?.getMappedFields() ?? [];
    const validations = this.mapperComponent?.validateMappedFields();
    if (validations?.hasIssues) {
      const shouldContinue = window.confirm(this.buildValidationConfirmMessage(validations));
      if (!shouldContinue) {
        this.isSaving = false;
        return;
      }
    }
    const editedTextItems = this.mapperComponent?.getEditedPdfTextItems() ?? [];
    const fields = this.buildTemplateFields(mappedFields);
    let fileToUpload = file;
    try {
      fileToUpload = await this.prepareFileForUpload(file, editedTextItems);
    } catch (error) {
      console.error('No se pudo preparar el archivo del template para guardar', error);
      this.alertService.showError('No se pudieron aplicar los cambios al documento antes de guardar.', 'Error');
      this.isSaving = false;
      return;
    }

    this.templateService.getTemplateUploadUrl(this.templateId, version).subscribe({
      next: res => {
        const headers = new HttpHeaders().set('Content-Type', fileToUpload.type || 'application/pdf');
        this.http.put(res.uploadUrl, fileToUpload, { headers, responseType: 'text' }).subscribe({
          next: () => this.saveFieldsAndFinish(fields),
          error: err => {
            console.error('No se pudo subir el archivo', err);
            this.alertService.showError('No se pudo subir el archivo.', 'Error');
            this.isSaving = false;
          }
        });
      },
      error: err => {
        const errorMsg: string = err?.message || err?.error?.message || '';
        const isAlreadyUploaded = errorMsg.toLowerCase().includes('already uploaded');
        if (isAlreadyUploaded) {
          const nextVersion = this.getNextVersionCode();
          this.templateService.getTemplateUploadUrl(this.templateId!, nextVersion).subscribe({
            next: nextRes => {
              const nextHeaders = new HttpHeaders().set('Content-Type', fileToUpload.type || 'application/pdf');
              this.http.put(nextRes.uploadUrl, fileToUpload, { headers: nextHeaders, responseType: 'text' }).subscribe({
                next: () => {
                  this.versionControl.setValue(nextVersion, { emitEvent: false });
                  this.saveFieldsAndFinish(fields);
                },
                error: uploadErr => {
                  console.error('No se pudo subir el archivo en la nueva versión', uploadErr);
                  this.alertService.showError('No se pudo actualizar el documento en una nueva versión.', 'Error');
                  this.isSaving = false;
                }
              });
            },
            error: versionErr => {
              console.error('No se pudo crear la siguiente versión para guardar el documento', versionErr);
              this.alertService.showError('No se pudo crear una nueva versión del template.', 'Error');
              this.isSaving = false;
            }
          });
          return;
        }
        console.error('No se pudo generar el upload URL', err);
        this.alertService.showError('No se pudo generar el link de subida.', 'Error');
        this.isSaving = false;
      }
    });
  }

  private saveFieldsAndFinish(fields: TemplateField[]): void {
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
  }

  private buildTemplateFields(mapped: DocumentMappedField[]): TemplateField[] {
    return mapped.map((field) => {
      const apiFieldType = this.mapFieldTypeForApi(field.type);
      return {
        page: String(field.page),
        x: this.toPixelString(field.x, field.pdfPageWidth),
        y: this.toPixelString(field.y, field.pdfPageHeight),
        width: this.toPixelString(field.width, field.pdfPageWidth),
        height: this.toPixelString(field.height, field.pdfPageHeight),
        fieldName: this.toApiFieldName(field.label, field.name),
        fieldType: apiFieldType,
        fieldCode: this.mapFieldCodeForApiType(apiFieldType)
      };
    });
  }

  private toApiFieldName(label: string, fallbackCode: string): string {
    const source = (label || fallbackCode || '').trim();
    if (!source) {
      return 'CAMPO';
    }
    const normalized = source
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'CAMPO';
  }

  private async prepareFileForUpload(file: File, editedTextItems: DocumentPdfTextEdit[]): Promise<File> {
    if (!this.isPdf(file) || !editedTextItems.length) {
      return file;
    }

    const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
    const pages = pdfDoc.getPages();

    // Persist text edits from the inline PDF editor (deletions/changes).
    for (const item of editedTextItems) {
      const page = pages[item.pageNumber - 1];
      if (!page) {
        continue;
      }

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const normalizedX = this.clamp(item.x / Math.max(item.pageWidth, 1), 0, 1);
      const normalizedY = this.clamp(item.y / Math.max(item.pageHeight, 1), 0, 1);
      const normalizedWidth = this.clamp(item.width / Math.max(item.pageWidth, 1), 0, 1);
      const normalizedHeight = this.clamp(item.height / Math.max(item.pageHeight, 1), 0, 1);

      const left = this.clamp(normalizedX * pageWidth - 1.5, 0, pageWidth);
      const top = this.clamp(normalizedY * pageHeight - 1.5, 0, pageHeight);
      const rectWidth = this.clamp(normalizedWidth * pageWidth + 3, 0, pageWidth - left);
      const rectHeight = this.clamp(normalizedHeight * pageHeight + 3, 0, pageHeight);
      const bottom = this.clamp(pageHeight - (top + rectHeight), 0, pageHeight);

      page.drawRectangle({
        x: left,
        y: bottom,
        width: rectWidth,
        height: rectHeight,
        color: rgb(1, 1, 1),
        opacity: 1
      });

      const nextText = (item.text || '').trim();
      if (nextText) {
        const sizeScale = pageHeight / Math.max(item.pageHeight, 1);
        const fontSize = this.clamp(item.fontSize * sizeScale, 6, 64);
        page.drawText(nextText, {
          x: left + 1,
          y: this.clamp(bottom + rectHeight - fontSize * 0.95, 0, pageHeight),
          size: fontSize,
          color: rgb(0, 0, 0)
        });
      }
    }

    const bytes = await pdfDoc.save();
    return new File([bytes], file.name, { type: file.type || 'application/pdf' });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private buildValidationConfirmMessage(result: DocumentMapperValidationResult): string {
    const lines: string[] = [
      'Se detectaron advertencias en los campos:',
      `- Fuera de página: ${result.summary.outOfBounds}`,
      `- Superpuestos: ${result.summary.overlaps}`,
      `- Nombres repetidos: ${result.summary.duplicateNames}`
    ];

    const firstIssues = result.issues.slice(0, 5).map(issue => `- ${issue.message}`);
    if (firstIssues.length) {
      lines.push('', 'Detalle:', ...firstIssues);
      if (result.issues.length > firstIssues.length) {
        lines.push(`- ... y ${result.issues.length - firstIssues.length} mas`);
      }
    }

    lines.push('', '¿Deseas continuar y guardar de todas formas?');
    return lines.join('\n');
  }

  private getNextVersionCode(): string {
    const fromHistory = this.versions
      .map(item => Number(item.code))
      .filter(num => Number.isFinite(num) && num > 0);
    const current = Number(this.versionControl.value);
    const maxVersion = Math.max(current || 0, ...fromHistory, 0);
    return String(Math.trunc(maxVersion + 1)).padStart(4, '0');
  }

  private mapFieldTypeForApi(type: string): 'text' | 'number' | 'sign' | 'img' {
    switch (type) {
      case 'number':
        return 'number';
      case 'file':
        return 'img';
      case 'sign':
        return 'sign';
      default:
        return 'text';
    }
  }

  private mapFieldCodeForApiType(type: 'text' | 'number' | 'sign' | 'img'): string {
    switch (type) {
      case 'text':
        return '1';
      case 'number':
        return '2';
      case 'sign':
        return '3';
      case 'img':
        return '4';
      default:
        return '1';
    }
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
      const targetReturn = this.returnTo || '/home';
      this.router.navigate(['/templates'], {
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
    this.documentFieldTouched = true;
    if (file && !this.stepForm.get('name')?.dirty) {
      const suggestedName = file.name.replace(/\.[^.]+$/, '');
      this.stepForm.patchValue({ name: suggestedName });
    }
  }

  async onTemplateFileSelected(event: Event): Promise<void> {
    if (!this.canEditDocumentFile) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await this.handleTemplateFileSelection(file);
    }
    input.value = '';
  }

  onTemplateFileDragOver(event: DragEvent): void {
    if (!this.canEditDocumentFile) {
      return;
    }
    event.preventDefault();
    this.isDocumentDragOver = true;
  }

  onTemplateFileDragLeave(event: DragEvent): void {
    if (!this.canEditDocumentFile) {
      return;
    }
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    this.isDocumentDragOver = false;
  }

  async onTemplateFileDrop(event: DragEvent): Promise<void> {
    if (!this.canEditDocumentFile) {
      return;
    }
    event.preventDefault();
    this.isDocumentDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    await this.handleTemplateFileSelection(file);
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
      this.alertService.showError('El archivo a subir debe ser PDF.', 'Error');
      return;
    }
    if (this.isUploadingPdf) {
      return;
    }
    this.isUploadingPdf = true;
    this.templateService.getTemplateUploadUrl(this.templateId, version).subscribe({
      next: res => {
        const headers = new HttpHeaders().set('Content-Type', file.type || 'application/pdf');
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
    if (!this.canEditDocumentFile) {
      return;
    }
    this.documentFieldTouched = true;
    this.templateFileInputRef?.nativeElement.click();
  }

  get selectedFile(): File | undefined {
    return this.uploadedFile;
  }

  get canEditDocumentFile(): boolean {
    return !this.isEditingExistingTemplate;
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
        this.syncVersionControlState();
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
    const session = ++this.versionLoadSession;
    this.templateService.getTemplateVersion(this.templateId, version).subscribe({
      next: tpl => {
        if (session !== this.versionLoadSession) {
          return;
        }
        // When switching versions, show name/description from that version in step 1.
        this.stepForm.patchValue({
          name: tpl.templateName,
          description: tpl.description ?? ''
        });
        this.loadDocumentAndFieldsForVersion(version, session, tpl.fields ?? []);
      },
      error: err => console.error('No se pudo cargar la versión del template', err)
    });
  }

  private loadDocumentAndFieldsForVersion(version: string, session: number, fieldsForVersion: TemplateApiField[]): void {
    if (!this.templateId) {
      return;
    }

    this.templateService.getTemplateDownloadUrl(this.templateId, version).subscribe({
      next: res => {
        void this.hydrateMapperFromDownload(res.downloadUrl, version, session, fieldsForVersion);
      },
      error: err => {
        console.error('No se pudo obtener el PDF de la versión para edición', err);
        void this.hydrateFieldsOnly(session, fieldsForVersion);
      }
    });
  }

  private async hydrateMapperFromDownload(
    downloadUrl: string,
    version: string,
    session: number,
    fieldsForVersion: TemplateApiField[]
  ): Promise<void> {
    if (!this.templateId) {
      return;
    }

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Descarga fallida (${response.status})`);
      }

      const blob = await response.blob();
      if (session !== this.versionLoadSession) {
        return;
      }

      const filenameBase = this.stepForm.controls.name.value?.trim() || this.templateId;
      const file = new File([blob], `${filenameBase}-${version}.pdf`, {
        type: blob.type || 'application/pdf'
      });

      const mapper = await this.waitForMapperComponent();
      if (!mapper || session !== this.versionLoadSession) {
        return;
      }

      await mapper.processFile(file);
      if (session !== this.versionLoadSession) {
        return;
      }

      mapper.loadMappedFieldsFromApi(fieldsForVersion as any);
    } catch (error) {
      console.error('No se pudo hidratar la versión del template en el mapper', error);
      await this.hydrateFieldsOnly(session, fieldsForVersion);
    }
  }

  private async hydrateFieldsOnly(session: number, fieldsForVersion: TemplateApiField[]): Promise<void> {
    const mapper = await this.waitForMapperComponent();
    if (!mapper || session !== this.versionLoadSession) {
      return;
    }
    mapper.loadMappedFieldsFromApi(fieldsForVersion as any);
  }

  private async waitForMapperComponent(maxAttempts = 40): Promise<DocumentMapperComponent | undefined> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (this.mapperComponent) {
        return this.mapperComponent;
      }
      await this.sleep(50);
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
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

  private isSupportedTemplateFile(file: File): boolean {
    return this.isPdf(file);
  }

  private async handleTemplateFileSelection(file: File): Promise<void> {
    this.documentFieldTouched = true;
    if (!this.isSupportedTemplateFile(file)) {
      this.alertService.showError('Solo se permiten archivos PDF.', 'Error');
      return;
    }
    this.onFileSelected(file);
    await this.syncFileWithMapper();
  }

  private async syncFileWithMapper(): Promise<void> {
    if (!this.uploadedFile) {
      return;
    }

    const mapper = await this.waitForMapperComponent();
    if (!mapper) {
      return;
    }

    const mapperFile = mapper.selectedFile;
    if (
      mapperFile &&
      mapperFile.name === this.uploadedFile.name &&
      mapperFile.size === this.uploadedFile.size &&
      mapperFile.lastModified === this.uploadedFile.lastModified
    ) {
      return;
    }

    const fileBackup = this.uploadedFile;
    try {
      await mapper.processFile(this.uploadedFile);
    } catch (error) {
      console.error('No se pudo procesar el PDF en el mapeador', error);
      this.alertService.showError('No se pudo procesar el PDF seleccionado.', 'Error');
    }
    // Restore the file if the mapper cleared it on error (via fileSelected emit).
    if (!this.uploadedFile && fileBackup) {
      this.uploadedFile = fileBackup;
    }
  }
}
