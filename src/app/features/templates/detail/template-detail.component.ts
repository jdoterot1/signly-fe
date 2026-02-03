import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { TemplateService } from '../../../core/services/templates/template.service';
import type { TemplateApi, TemplateField } from '../../../core/models/templates/template.model';

@Component({
  selector: 'app-template-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-detail.component.html'
})
export class TemplateDetailComponent implements OnInit, OnDestroy {
  templateId = '';
  loading = true;
  errorMessage = '';

  template?: TemplateApi;
  history: TemplateApi[] = [];
  fields: TemplateField[] = [];

  private readonly subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService
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
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/templates']);
  }

  goEdit(): void {
    this.router.navigate(['/templates', this.templateId, 'edit']);
  }

  goCreateDocument(): void {
    const tpl = this.template;
    const version = tpl ? this.versionShort(tpl.templateVersion) : null;
    this.router.navigate(['/documents/create'], {
      queryParams: {
        returnTo: '/templates',
        templateId: this.templateId,
        templateVersion: version && version !== 'N/A' ? version : undefined,
        name: tpl?.templateName,
        description: tpl?.description ?? undefined
      }
    });
  }

  downloadPdf(version?: string | null): void {
    const v = version && version !== 'N/A' ? version : this.versionShort(this.template?.templateVersion);
    if (!v || v === 'N/A') {
      return;
    }
    this.templateService.getTemplateDownloadUrl(this.templateId, v).subscribe({
      next: res => {
        window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      },
      error: err => {
        console.error('No se pudo generar el download URL', err);
      }
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return value;
    }
    return dt.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  versionShort(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }
    if (value.includes('#')) {
      return value.split('#')[1] || value;
    }
    return value;
  }

  private fetch(): void {
    this.loading = true;
    this.errorMessage = '';
    this.template = undefined;
    this.history = [];
    this.fields = [];

    this.templateService.getTemplateDetail(this.templateId).subscribe({
      next: tpl => {
        this.template = tpl;
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err instanceof Error ? err.message : 'No se pudo cargar la plantilla.';
        this.loading = false;
      }
    });

    this.templateService.getTemplateHistory(this.templateId).subscribe({
      next: history => {
        // Latest first by version suffix (best-effort)
        this.history = [...history].sort((a, b) =>
          this.versionShort(b.templateVersion).localeCompare(this.versionShort(a.templateVersion))
        );
      },
      error: err => {
        // history is nice-to-have; don't block the page
        console.warn('No se pudo cargar el historial de la plantilla', err);
      }
    });

    this.templateService.getTemplateFields(this.templateId).subscribe({
      next: fields => {
        this.fields = fields;
      },
      error: err => {
        console.warn('No se pudieron cargar los fields de la plantilla', err);
      }
    });
  }
}
