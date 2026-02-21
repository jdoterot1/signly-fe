// src/app/features/documents/create/document-add.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { DocumentService } from '../../../core/services/documents/document.service';
import {
  CreateDocumentRequest,
  DocumentParticipantPrefillField,
  DocumentParticipantIdentity,
  DocumentSignatureMode
} from '../../../core/models/documents/document.model';
import { FormComponent } from '../../../shared/form/form.component';
import {
  DOCUMENT_CREATE_FORM_CONFIG,
  DOCUMENT_LANGUAGES,
  DOCUMENT_ORDER_MODES,
  DOCUMENT_PHONE_COUNTRY_CODES,
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
  prefill?: DocumentParticipantPrefillField[];
  signaturelessFlow?: boolean;
}

const NO_DIGITS_PATTERN = /^[^\d]*$/;
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  submitLabel = '';
  cancelLabel = '';
  formInitialValues = {
    orderMode: DOCUMENT_ORDER_MODES[0],
    language: DOCUMENT_LANGUAGES[0],
    signatureMode: [DOCUMENT_SIGNATURE_MODES[0]],
    participantPhoneCountry: DOCUMENT_PHONE_COUNTRY_CODES[0],
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
  templateFieldNames: string[] = [];
  participantUsePrefill = false;
  participantPrefillValues: Record<string, string> = {};
  participantPrefillEditable: Record<string, boolean> = {};
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
    'participantPhoneCountry',
    'participantPhone',
    'participantDocumentNumber',
    'participantSignaturelessFlow',
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
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(NO_DIGITS_PATTERN)]],
      description: ['', [Validators.maxLength(500)]],
      templateId: [null, [Validators.required]],
      templateVersion: [null, [Validators.required]],
      orderMode: [DOCUMENT_ORDER_MODES[0], [Validators.required]],
      deadlineAt: [null, [Validators.required]],
      language: [DOCUMENT_LANGUAGES[0]],
      signatureMode: [[DOCUMENT_SIGNATURE_MODES[0]], [Validators.required]],
      participantName: ['', [Validators.maxLength(120)]],
      participantEmail: ['', [Validators.email]],
      participantPhoneCountry: [DOCUMENT_PHONE_COUNTRY_CODES[0]],
      participantPhone: [''],
      participantDocumentNumber: [''],
      participantSignaturelessFlow: [false],
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
    this.submitLabel = this.translate.instant('DOCUMENTS.CREATE.CONTINUE');
    this.cancelLabel = this.translate.instant('DOCUMENTS.CREATE.CANCEL');
    this.form.get('participantSignaturelessFlow')?.setValue(false, { emitEvent: false });

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
          this.templateFieldNames = [];
          this.resetParticipantPrefillState();
          return;
        }
        this.loadTemplateVersions(templateId);
      })
    );
    this.subs.add(
      this.form.get('templateVersion')!.valueChanges.subscribe(() => {
        this.refreshTemplateFieldNames();
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
    this.setFieldRequiredIndicator('participantName', true);
    this.setFieldRequiredIndicator('participantPhoneCountry', true);
    this.setFieldRequiredIndicator('participantPhone', true);
    this.setFieldRequiredIndicator('attemptsMax', true);
    this.setFieldRequiredIndicator('cooldownSeconds', true);
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
    const language = this.readSelectValue(formValue.language) || this.translate.instant('DOCUMENTS.CREATE.DEFAULT_LANGUAGE');
    const templateId = this.readSelectValue(formValue.templateId);
    const templateVersion = this.readSelectValue(formValue.templateVersion);

    if (!templateId || !templateVersion) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.ERROR_SELECT_TEMPLATE'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return;
    }
    const inlineParticipant = this.buildParticipantFromForm(formValue, signatureModes);
    const participants: DraftParticipant[] = [...this.participantsDraft];
    const hasInlineParticipantData = this.hasInlineParticipantData(formValue);
    if (hasInlineParticipantData) {
      if (!inlineParticipant) {
        return;
      }
      participants.push(inlineParticipant);
    }
    if (!participants.length) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.MIN_PARTICIPANT'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (formValue.name) {
      metadata['name'] = formValue.name;
    }
    if (formValue.description) {
      metadata['description'] = formValue.description;
    }
    metadata['language'] = language;

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
        this.alertService.showSuccess(this.translate.instant('DOCUMENTS.CREATE.SUCCESS_MSG'), this.translate.instant('DOCUMENTS.CREATE.SUCCESS_TITLE'));
        setTimeout(() => this.navigateBack(), 2600);
      },
      error: (err: any) => {
        const isInsufficientCredits = err?.status === 402 || err?.code === 'insufficient_credits';
        if (isInsufficientCredits) {
          this.alertService.showError(
            this.translate.instant('DOCUMENTS.CREATE.ERROR_INSUFFICIENT_CREDITS'),
            this.translate.instant('DOCUMENTS.CREATE.ERROR_INSUFFICIENT_CREDITS_TITLE')
          );
          setTimeout(() => this.navigateToCreditsPurchase(), 1800);
          return;
        }
        this.alertService.showError(err?.message || this.translate.instant('DOCUMENTS.CREATE.ERROR_MSG'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
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

  private navigateToCreditsPurchase(): void {
    this.router.navigate(['/administration/pricing']);
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
      if (!this.hasInlineParticipantData(raw)) {
        this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.ERROR_PARTICIPANT_INCOMPLETE'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      }
      return;
    }
    this.participantsDraft = [...this.participantsDraft, participant];
    this.alertService.showSuccess(this.translate.instant('DOCUMENTS.CREATE.PARTICIPANT_ADDED_MSG'), this.translate.instant('DOCUMENTS.CREATE.PARTICIPANT_ADDED_TITLE'));
    this.form.patchValue(
      {
        participantName: '',
        participantEmail: '',
        participantPhoneCountry: DOCUMENT_PHONE_COUNTRY_CODES[0],
        participantPhone: '',
        participantDocumentNumber: '',
        participantSignaturelessFlow: false
      },
      { emitEvent: false }
    );
    this.resetParticipantPrefillState();
  }

  removeParticipant(index: number): void {
    if (index < 0 || index >= this.participantsDraft.length) {
      return;
    }
    this.participantsDraft = this.participantsDraft.filter((_, i) => i !== index);
    this.alertService.showSuccess(this.translate.instant('DOCUMENTS.CREATE.PARTICIPANT_REMOVED_MSG'), this.translate.instant('DOCUMENTS.CREATE.PARTICIPANT_REMOVED_TITLE'));
  }

  hasParticipantDraftInForm(): boolean {
    return this.hasInlineParticipantData(this.form.getRawValue());
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
        this.refreshTemplateFieldNames();
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
    this.refreshTemplateFieldNames();
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
    this.submitLabel = step1 ? this.translate.instant('DOCUMENTS.CREATE.CONTINUE') : this.translate.instant('DOCUMENTS.CREATE.CREATE_DOCUMENT');
    this.cancelLabel = step1 ? this.translate.instant('DOCUMENTS.CREATE.CANCEL') : this.translate.instant('DOCUMENTS.CREATE.GO_BACK');

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
    const documentName = (this.form.get('name')?.value ?? '').toString().trim();
    if (/\d/.test(documentName)) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.ERROR_DOC_NAME_NO_DIGITS'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      this.form.get('name')?.markAsTouched();
      return;
    }
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
    this.setFieldRequiredIndicator(fieldKey, required);
    const validators = [...extraValidators];
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private applySignatureModeRules(modes: DocumentSignatureMode[] = []): void {
    if (this.currentStep === 1) {
      this.setFormHidden('participantEmail', true);
      this.setFormHidden('participantPhoneCountry', true);
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
    this.setFormHidden('participantPhoneCountry', false);
    this.setFormHidden('participantPhone', false);
    this.setFormHidden('participantDocumentNumber', !isBio);

    this.setFieldRequired('participantEmail', isEmail, [Validators.email] as any);
    this.setFieldRequired('participantPhoneCountry', true);
    this.setFieldRequired('participantPhone', true);
    this.setFieldRequired('participantDocumentNumber', isBio);
  }

  private isBiometricMode(mode?: DocumentSignatureMode): boolean {
    return mode === 'SIGNATURE_BIOMETRIC' || mode === 'SIGNATURE_BIOMETRIC_PLUS';
  }

  private buildParticipantFromForm(formValue: any, signatureModes: DocumentSignatureMode[]): DraftParticipant | null {
    const name = (formValue.participantName ?? '').trim();
    const email = (formValue.participantEmail ?? '').trim();
    const phoneCountry = this.readSelectValue(formValue.participantPhoneCountry) || '+57';
    const phoneRaw = (formValue.participantPhone ?? '').trim();
    const phoneDigits = phoneRaw.replace(/\D+/g, '');
    const phone = phoneDigits ? `${phoneCountry}${phoneDigits}` : '';
    const documentNumber = (formValue.participantDocumentNumber ?? '').trim();
    const selectedModes = signatureModes.length ? signatureModes : (['SIGNATURE_EMAIL'] as DocumentSignatureMode[]);

    const signaturelessFlow = false;
    const prefill = this.buildParticipantPrefill();

    if (!name && !email && !phone && !documentNumber && !prefill.length) {
      return null;
    }
    if (!name) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.NAME_REQUIRED'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (/\d/.test(name)) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.ERROR_PARTICIPANT_NAME_NO_DIGITS'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (!selectedModes.length) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.SIGN_MODE_REQUIRED'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (email && !SIMPLE_EMAIL_PATTERN.test(email)) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.ERROR_INVALID_EMAIL'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }

    const requiresEmail = selectedModes.includes('SIGNATURE_EMAIL');
    const requiresPhone = true;
    const requiresDocument = selectedModes.some(mode => this.isBiometricMode(mode));

    if (requiresEmail && !email) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.EMAIL_REQUIRED'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (requiresPhone && !phone) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.PHONE_REQUIRED'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (requiresDocument && !documentNumber) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.DOC_REQUIRED'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
      return null;
    }
    if (requiresDocument && !email && !phone) {
      this.alertService.showError(this.translate.instant('DOCUMENTS.CREATE.VALIDATION.BIO_CONTACT'), this.translate.instant('DOCUMENTS.CREATE.ERROR_TITLE'));
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
      identity,
      prefill: prefill.length ? prefill : undefined,
      signaturelessFlow
    };
  }

  private hasInlineParticipantData(formValue: any): boolean {
    return !!(
      (formValue.participantName ?? '').toString().trim() ||
      (formValue.participantEmail ?? '').toString().trim() ||
      (formValue.participantPhone ?? '').toString().trim() ||
      (formValue.participantDocumentNumber ?? '').toString().trim() ||
      this.buildParticipantPrefill().length > 0
    );
  }

  onParticipantUsePrefillChange(enabled: boolean): void {
    this.participantUsePrefill = enabled;
    if (!enabled) {
      return;
    }
    this.syncPrefillStateWithTemplateFields();
  }

  onParticipantPrefillValueChange(fieldName: string, value: string): void {
    this.participantPrefillValues[fieldName] = value;
  }

  onParticipantPrefillEditableChange(fieldName: string, editable: boolean): void {
    this.participantPrefillEditable[fieldName] = editable;
  }

  getParticipantPrefillValue(fieldName: string): string {
    return this.participantPrefillValues[fieldName] ?? '';
  }

  getParticipantPrefillEditable(fieldName: string): boolean {
    return !!this.participantPrefillEditable[fieldName];
  }

  private setFieldRequiredIndicator(fieldKey: string, required: boolean): void {
    this.formConfig = this.cloneFormConfig(this.formConfig);
    const target = this.formConfig.fields.find((f: any) => f.key === fieldKey);
    if (target) {
      target.required = required;
    }
  }

  private cloneFormConfig(config: any): any {
    return {
      ...config,
      fields: config.fields.map((f: any) => ({ ...f, options: f.options ? [...f.options] : undefined }))
    };
  }

  private refreshTemplateFieldNames(): void {
    const templateId = this.readSelectValue(this.form.get('templateId')?.value);
    const templateVersion = this.readSelectValue(this.form.get('templateVersion')?.value);
    if (!templateId || !templateVersion) {
      this.templateFieldNames = [];
      this.syncPrefillStateWithTemplateFields();
      return;
    }

    this.templateService.getTemplateVersion(templateId, templateVersion).subscribe({
      next: template => {
        this.templateFieldNames = this.extractTemplateFieldNames(template.fields ?? []);
        this.syncPrefillStateWithTemplateFields();
      },
      error: err => {
        console.warn('No se pudieron cargar los campos del template para prefill', err);
        this.templateFieldNames = [];
        this.syncPrefillStateWithTemplateFields();
      }
    });
  }

  private extractTemplateFieldNames(fields: unknown[]): string[] {
    const names = new Set<string>();

    fields.forEach(field => {
      if (!field || typeof field !== 'object') {
        return;
      }
      const source = field as { fieldName?: unknown; fieldType?: unknown };
      if (this.isSignTemplateFieldType(source.fieldType)) {
        return;
      }
      const fieldName = source.fieldName;
      if (typeof fieldName === 'string' && fieldName.trim()) {
        names.add(fieldName.trim());
      }
    });

    return Array.from(names.values());
  }

  private isSignTemplateFieldType(fieldType: unknown): boolean {
    if (typeof fieldType !== 'string') {
      return false;
    }
    const normalized = fieldType.trim().toLowerCase();
    return normalized === 'sign' || normalized === 'signature';
  }

  private syncPrefillStateWithTemplateFields(): void {
    const allowed = new Set(this.templateFieldNames);

    Object.keys(this.participantPrefillValues).forEach(key => {
      if (!allowed.has(key)) {
        delete this.participantPrefillValues[key];
      }
    });

    Object.keys(this.participantPrefillEditable).forEach(key => {
      if (!allowed.has(key)) {
        delete this.participantPrefillEditable[key];
      }
    });

    this.templateFieldNames.forEach(fieldName => {
      if (!(fieldName in this.participantPrefillValues)) {
        this.participantPrefillValues[fieldName] = '';
      }
      if (!(fieldName in this.participantPrefillEditable)) {
        this.participantPrefillEditable[fieldName] = false;
      }
    });
  }

  private buildParticipantPrefill(): DocumentParticipantPrefillField[] {
    if (!this.participantUsePrefill) {
      return [];
    }

    return this.templateFieldNames
      .map(fieldName => ({
        fieldName,
        value: (this.participantPrefillValues[fieldName] ?? '').trim(),
        editable: !!this.participantPrefillEditable[fieldName]
      }))
      .filter(item => item.value.length > 0);
  }

  private resetParticipantPrefillState(): void {
    this.participantUsePrefill = false;
    this.participantPrefillValues = {};
    this.participantPrefillEditable = {};
  }
}
