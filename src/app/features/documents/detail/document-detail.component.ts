import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DocumentService } from '../../../core/services/documents/document.service';
import type { DocumentApi } from '../../../core/models/documents/document.model';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-detail.component.html'
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  documentId = '';
  loading = true;
  errorMessage = '';
  document?: DocumentApi;

  private readonly subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('documentId');
        if (!id) {
          this.errorMessage = 'No se encontró el documentId.';
          this.loading = false;
          return;
        }
        this.documentId = id;
        this.fetch();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/documents']);
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

  participantsCount(): number {
    return this.document?.participants?.length ?? 0;
  }

  private fetch(): void {
    this.loading = true;
    this.errorMessage = '';
    this.document = undefined;

    this.documentService.getDocumentDetail(this.documentId).subscribe({
      next: doc => {
        this.document = doc;
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err instanceof Error ? err.message : 'No se pudo cargar el documento.';
        this.loading = false;
      }
    });
  }
}
