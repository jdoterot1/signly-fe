import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { TemplateService } from '../../../core/services/templates/template.service';
import type {
  TemplateApi,
  TemplateField,
  UpdateTemplateRequest
} from '../../../core/models/templates/template.model';
import { AlertService } from '../../../shared/alert/alert.service';

@Component({
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './template-edit.component.html'
})
export class TemplateEditComponent implements OnInit, OnDestroy {
  templateId = '';
  loading = true;
  saving = false;
  errorMessage = '';
  template?: TemplateApi;
  versions: Array<{ name: string; code: string }> = [];
  selectedFile?: File;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  form = this.fb.group({
    version: [null as string | null, [Validators.required]],
    templateName: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]]
  });

  fieldsForm = this.fb.group({
    fields: this.fb.array([] as any[])
  });

  private readonly subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('templateId');
        if (!id) {
          this.errorMessage = 'No se encontró el templateId.';
          this.loading = false;
          return;
        }
        this.templateId = id;
        this.fetch();
      })
    );

    this.subs.add(
      this.form.get('version')!.valueChanges.subscribe(version => {
        if (!version) {
          return;
        }
        this.loadVersion(version);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  cancel(): void {
    this.router.navigate(['/templates', this.templateId]);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.selectedFile = file ?? undefined;
    // reset input so the same file can be selected again
    input.value = '';
  }

  downloadPdf(): void {
    const version = this.form.get('version')!.value;
    if (!version) {
      this.alertService.showError('Selecciona una versión', 'Error');
      return;
    }
    this.templateService.getTemplateDownloadUrl(this.templateId, version).subscribe({
      next: res => window.open(res.downloadUrl, '_blank', 'noopener,noreferrer'),
      error: err => {
        console.error('No se pudo generar el download URL', err);
        this.alertService.showError('No se pudo generar el link de descarga', 'Error');
      }
    });
  }

  uploadPdf(): void {
    const version = this.form.get('version')!.value;
    const file = this.selectedFile;
    if (!version) {
      this.alertService.showError('Selecciona una versión', 'Error');
      return;
    }
    if (!file) {
      this.alertService.showError('Selecciona un archivo PDF', 'Error');
      return;
    }

    this.templateService.getTemplateUploadUrl(this.templateId, version).subscribe({
      next: res => {
        const headers = new HttpHeaders().set('Content-Type', file.type || 'application/pdf');
        this.http.put(res.uploadUrl, file, { headers, responseType: 'text' }).subscribe({
          next: () => {
            this.alertService.showSuccess('Archivo subido correctamente', '¡PDF actualizado!');
            this.selectedFile = undefined;
          },
          error: err => {
            console.error('No se pudo subir el PDF al presigned URL', err);
            this.alertService.showError('No se pudo subir el archivo (revisa CORS/permisos)', 'Error');
          }
        });
      },
      error: err => {
        console.error('No se pudo generar el upload URL', err);
        this.alertService.showError('No se pudo generar el link de subida', 'Error');
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpdateTemplateRequest = {
      templateName: raw.templateName as string,
      description: (raw.description as string) || undefined
    };

    this.saving = true;
    this.templateService.updateTemplate(this.templateId, payload).subscribe({
      next: () => {
        const fields = this.serializeFields();
        this.templateService.updateTemplateFields(this.templateId, fields).subscribe({
          next: () => {
            this.alertService.showSuccess('La plantilla fue actualizada exitosamente', '¡Plantilla actualizada!');
            setTimeout(() => this.router.navigate(['/templates', this.templateId]), 900);
          },
          error: err => {
            console.error('No se pudieron actualizar los campos', err);
            this.alertService.showError('Se actualizó la plantilla, pero falló la actualización de campos', 'Error');
          },
          complete: () => {
            this.saving = false;
          }
        });
      },
      error: err => {
        this.saving = false;
        const message = err instanceof Error ? err.message : 'No se pudo actualizar la plantilla.';
        this.alertService.showError(message, 'Error');
      }
    });
  }

  private fetch(): void {
    this.loading = true;
    this.errorMessage = '';
    this.template = undefined;

    this.templateService.getTemplateDetail(this.templateId).subscribe({
      next: tpl => {
        this.template = tpl;
        // Load history (for version selector) and fields.
        this.loadHistoryAndInitVersion(tpl);
      },
      error: err => {
        this.errorMessage = err instanceof Error ? err.message : 'No se pudo cargar la plantilla.';
        this.loading = false;
      }
    });
  }

  private loadHistoryAndInitVersion(tpl: TemplateApi): void {
    this.templateService.getTemplateHistory(this.templateId).subscribe({
      next: history => {
        this.versions = this.buildVersionOptions(history);
        const preferred = this.extractVersion(tpl.templateVersion) ?? this.versions[0]?.code ?? null;
        this.form.patchValue(
          {
            version: preferred,
            templateName: tpl.templateName,
            description: tpl.description ?? ''
          },
          { emitEvent: true }
        );
        this.loadFields();
        this.loading = false;
      },
      error: err => {
        console.warn('No se pudo cargar el historial', err);
        const preferred = this.extractVersion(tpl.templateVersion) ?? null;
        this.form.patchValue(
          {
            version: preferred,
            templateName: tpl.templateName,
            description: tpl.description ?? ''
          },
          { emitEvent: true }
        );
        this.loadFields();
        this.loading = false;
      }
    });
  }

  private loadVersion(version: string): void {
    this.templateService.getTemplateVersion(this.templateId, version).subscribe({
      next: tpl => {
        this.template = tpl;
        this.form.patchValue(
          {
            templateName: tpl.templateName,
            description: tpl.description ?? ''
          },
          { emitEvent: false }
        );
        this.loadFields();
      },
      error: err => {
        console.error('No se pudo cargar la versión del template', err);
      }
    });
  }

  private loadFields(): void {
    this.templateService.getTemplateFields(this.templateId).subscribe({
      next: fields => {
        this.setFields(fields);
      },
      error: err => {
        console.error('No se pudieron cargar los fields', err);
      }
    });
  }

  get fieldsArray(): FormArray {
    return this.fieldsForm.get('fields') as FormArray;
  }

  addField(): void {
    this.fieldsArray.push(
      this.fb.group({
        page: ['1', [Validators.required]],
        x: ['0', [Validators.required]],
        y: ['0', [Validators.required]],
        width: ['100', [Validators.required]],
        height: ['30', [Validators.required]],
        fieldName: ['', [Validators.required]],
        fieldType: ['sign', [Validators.required]],
        fieldCode: ['1', [Validators.required]]
      })
    );
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
  }

  private setFields(fields: TemplateField[]): void {
    while (this.fieldsArray.length) {
      this.fieldsArray.removeAt(0);
    }
    fields.forEach(f => {
      this.fieldsArray.push(
        this.fb.group({
          page: [String(f.page), [Validators.required]],
          x: [String(f.x), [Validators.required]],
          y: [String(f.y), [Validators.required]],
          width: [String(f.width), [Validators.required]],
          height: [String(f.height), [Validators.required]],
          fieldName: [f.fieldName, [Validators.required]],
          fieldType: [f.fieldType, [Validators.required]],
          fieldCode: [String(f.fieldCode), [Validators.required]]
        })
      );
    });
  }

  private serializeFields(): TemplateField[] {
    const raw = this.fieldsArray.getRawValue() as any[];
    return raw.map(f => ({
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      fieldCode: f.fieldCode
    }));
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
}
