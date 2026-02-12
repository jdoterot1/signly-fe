// src/app/features/documents/create/document-add.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { DocumentService } from '../../../core/services/documents/document.service';
import {
  CreateDocumentRequest,
  DocumentParticipantIdentity,
  DocumentSignatureMode
} from '../../../core/models/documents/document.model';
import { FormComponent } from '../../../shared/form/form.component';
import {
  DOCUMENT_CREATE_FORM_CONFIG,
  DOCUMENT_LANGUAGES,
  DOCUMENT_ORDER_MODES,
  DOCUMENT_SIGNATURE_MODES
} from '../../../core/constants/documents/create/documents-create.constant';

import { AlertService } from '../../../shared/alert/alert.service'; // ✅ Importar servicio
import { GuideModalComponent } from '../../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep } from '../../../shared/services/guide-flow/guide-flow.service';
import { TemplateService } from '../../../core/services/templates/template.service';
import type { TemplateApi } from '../../../core/models/templates/template.model';

interface DraftParticipant {
  displayName: string;
  signatureMode: DocumentSignatureMode[];
  policy: {
    attemptsMax: number;
    cooldownSeconds: number;
  };
  identity: DocumentParticipantIdentity;
}

@Component({
  selector: 'app-document-create',
  standalone: true,
  imports: [CommonModule, FormComponent, GuideModalComponent],
  templateUrl: './document-add.component.html'
})
export class DocumentCreateComponent implements OnInit, OnDestroy {
  formConfig = this.cloneFormConfig(DOCUMENT_CREATE_FORM_CONFIG);
  form: FormGroup;
  currentStep: 1 | 2 = 1;
  submitLabel = 'Continuar';
  cancelLabel = 'Cancelar';
  formInitialValues = {
    orderMode: DOCUMENT_ORDER_MODES[0],
    language: DOCUMENT_LANGUAGES[0],
    signatureMode: [DOCUMENT_SIGNATURE_MODES[0]],
    attemptsMax: '3',
    cooldownSeconds: '60'
  };
  participantsDraft: DraftParticipant[] = [];
  selectedFile?: File;
  private readonly returnTo: string | null;
  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  private readonly isGuidedFlow: boolean;
  private readonly subs = new Subscription();

  private templatesOptions: Array<{ name: string; code: string }> = [];
  private templateVersionOptions: Array<{ name: string; code: string }> = [];
  private preselectedTemplateId?: string;
  private preselectedTemplateVersion?: string;
  private prefillName?: string;
  private prefillDescription?: string;
  private readonly step1Keys = [
    'name',
    'description',
    'templateId',
    'templateVersion',
    'deadlineAt',
    'language',
    'signatureMode'
  ];
  private readonly step2Keys = [
    'participantName',
    'participantEmail',
    'participantPhone',
    'participantDocumentNumber',
    'attemptsMax',
    'cooldownSeconds'
  ];

  constructor(
    private documentService: DocumentService,
    private templateService: TemplateService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService, // ✅ Inyectar servicio
    private guideFlow: GuideFlowService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(500)]],
      templateId: [null, [Validators.required]],
      templateVersion: [null, [Validators.required]],
      orderMode: [DOCUMENT_ORDER_MODES[0], [Validators.required]],
      deadlineAt: [null],
      language: [DOCUMENT_LANGUAGES[0]],
      signatureMode: [[DOCUMENT_SIGNATURE_MODES[0]], [Validators.required]],
      participantName: ['', [Validators.maxLength(120)]],
      participantEmail: [''],
      participantPhone: [''],
      participantDocumentNumber: [''],
      attemptsMax: ['3'],
      cooldownSeconds: ['60']
    });

    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const guidedParam = this.route.snapshot.queryParamMap.get('guided');
    this.isGuidedFlow = guidedParam === '1' || guidedParam === 'true';
    if (this.isGuidedFlow) {
      this.guideSteps = this.guideFlow.getSteps('document');
      this.showGuideModal = true;
    }
  }

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.preselectedTemplateId = query.get('templateId') ?? undefined;
    const rawVersion = query.get('templateVersion') ?? undefined;
    this.preselectedTemplateVersion = this.normalizeVersion(rawVersion);
    this.prefillName = query.get('name') ?? undefined;
    this.prefillDescription = query.get('description') ?? undefined;
    if (this.prefillName && !this.form.get('name')!.value) {
      this.form.patchValue({ name: this.prefillName }, { emitEvent: false });
    }
    if (this.prefillDescription && !this.form.get('description')!.value) {
      this.form.patchValue({ description: this.prefillDescription }, { emitEvent: false });
    }

    this.loadTemplates();
    this.subs.add(
      this.form.get('templateId')!.valueChanges.subscribe(value => {
        const templateId = this.readSelectValue(value);
        if (!templateId) {
          this.setTemplateVersions([]);
          return;
        }
        this.loadTemplateVersions(templateId);
      })
    );

    this.subs.add(
      this.form.get('signatureMode')!.valueChanges.subscribe(value => {
        const modes = this.readMultiSelectValues(value) as DocumentSignatureMode[];
        this.applySignatureModeRules(modes);
      })
    );

    const initialModes = this.readMultiSelectValues(this.form.get('signatureMode')!.value) as DocumentSignatureMode[];
    this.applySignatureModeRules(initialModes);

    this.setMinDateForDeadline();
    this.applyStepState();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onFileSelected(file: File) {
    this.selectedFile = file;
    console.log('Archivo PDF seleccionado:', file);
  }

  onSubmit(formValue: any) {
    if (this.currentStep === 1) {
      this.goToStepTwo();
      return;
    }
    const orderMode = this.readSelectValue(formValue.orderMode);
    const signatureModes = this.readMultiSelectValues(formValue.signatureMode) as DocumentSignatureMode[];
    const language = this.readSelectValue(formValue.language);
    const templateId = this.readSelectValue(formValue.templateId);
    const templateVersion = this.readSelectValue(formValue.templateVersion);

    if (!templateId || !templateVersion) {
      this.alertService.showError('Selecciona template y versión', 'Error');
      return;
    }
    const inlineParticipant = this.buildParticipantFromForm(formValue, signatureModes);
    const participants: DraftParticipant[] = [...this.participantsDraft];
    if (inlineParticipant) {
      participants.push(inlineParticipant);
    }
    if (!participants.length) {
      this.alertService.showError('Debes agregar al menos un participante.', 'Error');
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (formValue.name) {
      metadata['name'] = formValue.name;
    }
    if (formValue.description) {
      metadata['description'] = formValue.description;
    }
    if (language) {
      metadata['language'] = language;
    }

    const payload: CreateDocumentRequest = {
      templateId,
      templateVersion,
      orderMode: orderMode || 'PARALLEL',
      deadlineAt: this.normalizeDate(formValue.deadlineAt),
      participants,
      flowPolicy: { onParticipantFail: 'CANCEL_FLOW' },
      metadata: Object.keys(metadata).length ? metadata : undefined
    };

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
    if (this.currentStep === 2) {
      this.currentStep = 1;
      this.applyStepState();
      return;
    }
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

  addParticipant(): void {
    const raw = this.form.getRawValue();
    const signatureModes = this.readMultiSelectValues(raw.signatureMode) as DocumentSignatureMode[];
    const participant = this.buildParticipantFromForm(raw, signatureModes);
    if (!participant) {
      return;
    }
    this.participantsDraft = [...this.participantsDraft, participant];
    this.form.patchValue(
      {
        participantName: '',
        participantEmail: '',
        participantPhone: '',
        participantDocumentNumber: ''
      },
      { emitEvent: false }
    );
  }

  removeParticipant(index: number): void {
    if (index < 0 || index >= this.participantsDraft.length) {
      return;
    }
    this.participantsDraft = this.participantsDraft.filter((_, i) => i !== index);
  }

  private readSelectValue(value: any): string | undefined {
    if (!value) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.code ?? undefined;
  }

  private readMultiSelectValues(value: any): string[] {
    if (!value) {
      return [];
    }
    const values = Array.isArray(value) ? value : [value];
    return values
      .map(item => this.readSelectValue(item))
      .filter((item): item is string => !!item);
  }

  private normalizeDate(value: any): string | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    return undefined;
  }

  private parseNumber(value: any, fallback: number): number {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  private loadTemplates(): void {
    this.templateService.listTemplates().subscribe({
      next: templates => {
        const sorted = [...templates].sort((a, b) => {
          const aTs = Date.parse(a.updatedAt || a.createdAt || '');
          const bTs = Date.parse(b.updatedAt || b.createdAt || '');
          const aSafe = Number.isFinite(aTs) ? aTs : 0;
          const bSafe = Number.isFinite(bTs) ? bTs : 0;
          return bSafe - aSafe;
        });
        this.templatesOptions = sorted.map(t => ({
          name: t.templateName,
          code: t.templateId
        }));
        this.setFormOptions('templateId', this.templatesOptions);

        const hasSelected = !!this.form.get('templateId')!.value;
        if (hasSelected) {
          return;
        }

        if (this.preselectedTemplateId) {
          const match = this.templatesOptions.find(o => o.code === this.preselectedTemplateId);
          if (match) {
            this.form.get('templateId')!.setValue(match, { emitEvent: true });
            return;
          }
        }

        // fallback: first template
        if (this.templatesOptions.length) {
          this.form.get('templateId')!.setValue(this.templatesOptions[0], { emitEvent: true });
        }
      },
      error: err => {
        console.error('No se pudieron cargar los templates', err);
      }
    });
  }

  private loadTemplateVersions(templateId: string): void {
    this.templateService.getTemplateHistory(templateId).subscribe({
      next: history => {
        const versions = this.buildVersionOptions(history);
        this.setTemplateVersions(versions);
      },
      error: err => {
        console.error('No se pudo cargar el historial del template', err);
        this.setTemplateVersions([]);
      }
    });
  }

  private setTemplateVersions(options: Array<{ name: string; code: string }>): void {
    this.templateVersionOptions = options;
    this.setFormOptions('templateVersion', options);

    // Prefer a preselected version (from query params) once.
    if (this.preselectedTemplateVersion) {
      const match = options.find(o => o.code === this.preselectedTemplateVersion);
      if (match) {
        this.form.get('templateVersion')!.setValue(match, { emitEvent: false });
        this.preselectedTemplateVersion = undefined;
        return;
      }
      this.preselectedTemplateVersion = undefined;
    }

    const current = this.form.get('templateVersion')!.value;
    const currentCode = this.readSelectValue(current);
    const stillValid = !!currentCode && options.some(o => o.code === currentCode);
    if (!stillValid) {
      this.form.get('templateVersion')!.setValue(options[0] ?? null, { emitEvent: false });
    }
  }

  private buildVersionOptions(history: TemplateApi[]): Array<{ name: string; code: string }> {
    const parsed = history
      .map(item => {
        const v = this.extractVersion(item);
        return v ? { name: v, code: v } : null;
      })
      .filter((v): v is { name: string; code: string } => !!v);

    // Unique + sort desc (latest first)
    const unique = Array.from(new Map(parsed.map(v => [v.code, v])).values());
    unique.sort((a, b) => b.code.localeCompare(a.code));
    return unique;
  }

  private extractVersion(item: TemplateApi): string | null {
    const raw = item.templateVersion;
    if (typeof raw === 'string' && raw.includes('#')) {
      const v = raw.split('#')[1];
      return v?.trim() ? v.trim() : null;
    }
    const num = Number(item.version);
    if (Number.isFinite(num) && num > 0) {
      return String(Math.trunc(num)).padStart(4, '0');
    }
    return null;
  }

  private normalizeVersion(raw: string | undefined): string | undefined {
    if (!raw) {
      return undefined;
    }
    const normalized = raw.includes('#') ? raw.split('#')[1] : raw;
    const trimmed = normalized.trim();
    if (!trimmed) {
      return undefined;
    }
    // If it's numeric, normalize to 4 digits (0001, 0002, ...)
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      return String(Math.trunc(asNum)).padStart(4, '0');
    }
    return trimmed;
  }

  private setFormOptions(fieldKey: string, options: Array<{ name: string; code: string }>): void {
    this.formConfig = this.cloneFormConfig(this.formConfig);
    const target = this.formConfig.fields.find((f: any) => f.key === fieldKey);
    if (target) {
      target.options = options;
    }
  }

  private setFormHidden(fieldKey: string, hidden: boolean): void {
    this.formConfig = this.cloneFormConfig(this.formConfig);
    const target = this.formConfig.fields.find((f: any) => f.key === fieldKey);
    if (target) {
      target.hidden = hidden;
    }
  }

  private setMinDateForDeadline(): void {
    this.formConfig = this.cloneFormConfig(this.formConfig);
    const target = this.formConfig.fields.find((f: any) => f.key === 'deadlineAt');
    if (target) {
      const today = new Date();
      today.setSeconds(0, 0);
      target.minDate = today;
      target.showTime = true;
      target.hourFormat = '24';
      target.dateFormat = 'yy-mm-dd';
    }
  }

  private applyStepState(): void {
    const step1 = this.currentStep === 1;
    this.submitLabel = step1 ? 'Continuar' : 'Crear documento';
    this.cancelLabel = step1 ? 'Cancelar' : 'Regresar';

    this.step1Keys.forEach(key => {
      this.setFormHidden(key, !step1);
      this.setControlEnabled(key, step1);
    });
    this.step2Keys.forEach(key => {
      this.setFormHidden(key, step1);
      this.setControlEnabled(key, !step1);
    });

    const modes = this.readMultiSelectValues(this.form.get('signatureMode')!.value) as DocumentSignatureMode[];
    this.applySignatureModeRules(modes);
  }

  private goToStepTwo(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.currentStep = 2;
    this.applyStepState();
  }

  private setControlEnabled(fieldKey: string, enabled: boolean): void {
    const control = this.form.get(fieldKey);
    if (!control) {
      return;
    }
    if (enabled) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  private setFieldRequired(fieldKey: string, required: boolean, extraValidators: ValidatorFn[] = []): void {
    const control = this.form.get(fieldKey);
    if (!control) {
      return;
    }
    const validators = required ? [Validators.required, ...extraValidators] : [...extraValidators];
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private applySignatureModeRules(modes: DocumentSignatureMode[] = []): void {
    if (this.currentStep === 1) {
      this.setFormHidden('participantEmail', true);
      this.setFormHidden('participantPhone', true);
      this.setFormHidden('participantDocumentNumber', true);
      return;
    }
    const selected = modes.length ? modes : (['SIGNATURE_EMAIL'] as DocumentSignatureMode[]);
    const isEmail = selected.includes('SIGNATURE_EMAIL');
    const isSms = selected.includes('SIGNATURE_SMS');
    const isWhatsapp = selected.includes('SIGNATURE_WHATSAPP');
    const isBio = selected.some(mode => this.isBiometricMode(mode));

    this.setFormHidden('participantEmail', !isEmail && !isBio);
    this.setFormHidden('participantPhone', !isSms && !isWhatsapp && !isBio);
    this.setFormHidden('participantDocumentNumber', !isBio);

    this.setFieldRequired('participantEmail', isEmail, [Validators.email] as any);
    this.setFieldRequired('participantPhone', isSms || isWhatsapp);
    this.setFieldRequired('participantDocumentNumber', isBio);
  }

  private isBiometricMode(mode?: DocumentSignatureMode): boolean {
    return mode === 'SIGNATURE_BIOMETRIC' || mode === 'SIGNATURE_BIOMETRIC_PLUS';
  }

  private buildParticipantFromForm(formValue: any, signatureModes: DocumentSignatureMode[]): DraftParticipant | null {
    const name = (formValue.participantName ?? '').trim();
    const email = (formValue.participantEmail ?? '').trim();
    const phone = (formValue.participantPhone ?? '').trim();
    const documentNumber = (formValue.participantDocumentNumber ?? '').trim();
    const selectedModes = signatureModes.length ? signatureModes : (['SIGNATURE_EMAIL'] as DocumentSignatureMode[]);

    if (!name && !email && !phone && !documentNumber) {
      return null;
    }
    if (!name) {
      this.alertService.showError('El nombre del participante es obligatorio.', 'Error');
      return null;
    }
    if (!selectedModes.length) {
      this.alertService.showError('Debes seleccionar al menos un modo de firma.', 'Error');
      return null;
    }

    const requiresEmail = selectedModes.includes('SIGNATURE_EMAIL');
    const requiresPhone = selectedModes.includes('SIGNATURE_SMS') || selectedModes.includes('SIGNATURE_WHATSAPP');
    const requiresDocument = selectedModes.some(mode => this.isBiometricMode(mode));

    if (requiresEmail && !email) {
      this.alertService.showError('El correo es obligatorio por los modos seleccionados.', 'Error');
      return null;
    }
    if (requiresPhone && !phone) {
      this.alertService.showError('El teléfono es obligatorio por los modos seleccionados.', 'Error');
      return null;
    }
    if (requiresDocument && !documentNumber) {
      this.alertService.showError('El documento es obligatorio para firma biométrica.', 'Error');
      return null;
    }
    if (requiresDocument && !email && !phone) {
      this.alertService.showError('Para biometría debes tener al menos email o teléfono.', 'Error');
      return null;
    }

    const attemptsMax = this.parseNumber(formValue.attemptsMax, 3);
    const cooldownSeconds = this.parseNumber(formValue.cooldownSeconds, 60);
    const identity: DocumentParticipantIdentity = {};
    if (email) {
      identity.email = email;
    }
    if (phone) {
      identity.phone = phone;
    }
    if (documentNumber) {
      identity.documentNumber = documentNumber;
    }

    return {
      displayName: name,
      signatureMode: selectedModes,
      policy: {
        attemptsMax,
        cooldownSeconds
      },
      identity
    };
  }

  private cloneFormConfig(config: any): any {
    return {
      ...config,
      fields: config.fields.map((f: any) => ({ ...f, options: f.options ? [...f.options] : undefined }))
    };
  }
}
