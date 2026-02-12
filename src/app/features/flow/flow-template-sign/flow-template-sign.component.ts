import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import {
  FlowState,
  TemplateDownloadData,
  TemplateDownloadField,
  TemplateSubmitField
} from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

const PDF_WORKER_SRC = 'assets/pdf.worker.min.mjs';
GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

type TemplateStep = 'loading' | 'signing' | 'submitting' | 'success' | 'error';

interface FieldWithValue extends TemplateDownloadField {
  value: string;
}

@Component({
  selector: 'app-flow-template-sign',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-template-sign.component.html'
})
export class FlowTemplateSignComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;

  processId = '';
  flowState: FlowState | null = null;
  currentStep: TemplateStep = 'loading';
  error: string | null = null;

  templateData: TemplateDownloadData | null = null;
  fields: FieldWithValue[] = [];
  currentPage = 1;
  totalPages = 1;
  pdfScale = 1.5;

  // Signature pad state
  isDrawing = false;
  signatureDataUrl: string | null = null;
  activeSignField: FieldWithValue | null = null;
  showSignaturePad = false;

  private pdfDoc: PDFDocumentProxy | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();

    const token = this.flowService.getFlowToken();
    if (!this.processId || !this.flowState || !token) {
      this.router.navigate(['/flow', this.processId || 'invalid']);
      return;
    }

    this.loadTemplate();
  }

  ngAfterViewInit(): void {
    // Signature canvas setup happens when pad is opened
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.pdfDoc?.destroy();
  }

  private loadTemplate(): void {
    this.currentStep = 'loading';
    this.error = null;

    const sub = this.flowService.downloadTemplate(this.processId).subscribe({
      next: (data) => {
        this.templateData = data;
        this.fields = (data.fields || []).map(f => ({ ...f, value: '' }));
        this.currentStep = 'signing';
        this.loadPdf(data.downloadUrl);
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al cargar la plantilla del documento.';
        this.currentStep = 'error';
      }
    });

    this.subscriptions.push(sub);
  }

  private async loadPdf(url: string): Promise<void> {
    try {
      const loadingTask = getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.renderPage(this.currentPage);
    } catch {
      this.error = 'Error al cargar el documento PDF.';
      this.currentStep = 'error';
    }
  }

  private async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.pdfCanvas) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.pdfScale });

    const canvas = this.pdfCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderPage(page);
  }

  getFieldsForPage(page: number): FieldWithValue[] {
    return this.fields.filter(f => this.toInteger(f.page, 1) === page);
  }

  getFieldStyle(field: TemplateDownloadField): Record<string, string> {
    return {
      left: `${this.toInteger(field.x)}px`,
      top: `${this.toInteger(field.y)}px`,
      width: `${this.toPositiveInteger(field.width, 1)}px`,
      height: `${this.toPositiveInteger(field.height, 1)}px`
    };
  }

  getFieldDisplayName(field: TemplateDownloadField): string {
    const raw = (field.fieldName || '').trim();
    if (!raw) {
      return 'Campo';
    }
    const formatted = raw
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
    return formatted || raw;
  }

  isSignField(field: TemplateDownloadField): boolean {
    return field.fieldType === 'sign' || field.fieldType === 'signature';
  }

  openSignaturePad(field: FieldWithValue): void {
    this.activeSignField = field;
    this.showSignaturePad = true;
    this.signatureDataUrl = null;

    setTimeout(() => {
      this.initSignatureCanvas();
    }, 50);
  }

  private initSignatureCanvas(): void {
    if (!this.signatureCanvas) return;

    const canvas = this.signatureCanvas.nativeElement;
    canvas.width = 500;
    canvas.height = 200;
    this.signCtx = canvas.getContext('2d');

    if (this.signCtx) {
      this.signCtx.fillStyle = '#ffffff';
      this.signCtx.fillRect(0, 0, canvas.width, canvas.height);
      this.signCtx.strokeStyle = '#1e293b';
      this.signCtx.lineWidth = 2.5;
      this.signCtx.lineCap = 'round';
      this.signCtx.lineJoin = 'round';
    }
  }

  onSignMouseDown(event: MouseEvent): void {
    if (!this.signCtx) return;
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.signCtx.beginPath();
    this.signCtx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  onSignMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.signCtx) return;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.signCtx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    this.signCtx.stroke();
  }

  onSignMouseUp(): void {
    this.isDrawing = false;
  }

  onSignTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (!this.signCtx) return;
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.signCtx.beginPath();
    this.signCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  onSignTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.signCtx) return;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.signCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.signCtx.stroke();
  }

  onSignTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.isDrawing = false;
  }

  clearSignature(): void {
    this.signatureDataUrl = null;
    this.initSignatureCanvas();
  }

  confirmSignature(): void {
    if (!this.signatureCanvas || !this.activeSignField) return;

    const canvas = this.signatureCanvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    // Extract base64 data without the data:image/png;base64, prefix
    const base64 = dataUrl.split(',')[1];

    this.activeSignField.value = base64;
    this.signatureDataUrl = dataUrl;
    this.showSignaturePad = false;
    this.activeSignField = null;
  }

  cancelSignature(): void {
    this.showSignaturePad = false;
    this.activeSignField = null;
    this.signatureDataUrl = null;
  }

  hasFieldValue(field: FieldWithValue): boolean {
    return !!field.value;
  }

  onFieldInput(field: FieldWithValue, event: Event): void {
    const target = event.target as HTMLInputElement;
    field.value = target.value;
  }

  allFieldsFilled(): boolean {
    return this.fields.every(f => !!f.value);
  }

  submitTemplate(): void {
    if (!this.allFieldsFilled() || this.currentStep === 'submitting') return;

    this.currentStep = 'submitting';
    this.error = null;

    const submitFields: TemplateSubmitField[] = this.fields.map(f => ({
      fieldCode: f.fieldCode,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      height: this.toPositiveInteger(f.height, 1),
      page: this.toPositiveInteger(f.page, 1),
      width: this.toPositiveInteger(f.width, 1),
      x: this.toPositiveInteger(f.x, 0),
      y: this.toPositiveInteger(f.y, 0),
      value: f.value
    }));

    const sub = this.flowService.submitTemplate(this.processId, { fields: submitFields }).subscribe({
      next: () => {
        this.currentStep = 'success';
        setTimeout(() => this.navigateToNextStep(), 1400);
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al enviar la firma.';
        this.currentStep = 'signing';
      }
    });

    this.subscriptions.push(sub);
  }

  private navigateToNextStep(): void {
    this.router.navigate(['/flow', this.processId, 'complete']);
  }

  retry(): void {
    this.error = null;
    this.loadTemplate();
  }

  goBack(): void {
    this.router.navigate(['/flow', this.processId]);
  }

  private toInteger(value: string | number, fallback = 0): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.round(parsed);
  }

  private toPositiveInteger(value: string | number, fallback = 1): number {
    const integer = this.toInteger(value, fallback);
    return Math.max(integer, fallback);
  }
}
