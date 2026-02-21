import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import {
  FlowState,
  TemplateDownloadData,
  TemplateDownloadField,
  TemplateFieldPlacement,
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
  editable: boolean;
  placements: TemplateFieldPlacement[];
}

interface FieldPlacementView {
  key: string;
  field: FieldWithValue;
  placement: TemplateFieldPlacement;
}

@Component({
  selector: 'app-flow-template-sign',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-template-sign.component.html'
})
export class FlowTemplateSignComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pdfCanvas') pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfViewport') pdfViewport?: ElementRef<HTMLDivElement>;
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;

  processId = '';
  flowState: FlowState | null = null;
  currentStep: TemplateStep = 'loading';
  error: string | null = null;

  templateData: TemplateDownloadData | null = null;
  fields: FieldWithValue[] = [];
  currentPage = 1;
  totalPages = 1;
  pdfScale = 1;
  renderedPageWidth = 0;
  renderedPageHeight = 0;
  activeFieldCode: string | null = null;

  // Signature pad state
  isDrawing = false;
  signatureDataUrl: string | null = null;
  activeSignField: FieldWithValue | null = null;
  showSignaturePad = false;
  isSignatureEmpty = true;

  private pdfDoc: PDFDocumentProxy | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private subscriptions: Subscription[] = [];
  private resizeRenderTimeout: ReturnType<typeof setTimeout> | null = null;
  private signatureResizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private pageBaseSizeByNumber = new Map<number, { width: number; height: number }>();
  private readonly minPdfScale = 0.55;
  private readonly maxPdfScale = 1.35;

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

  @HostListener('window:resize')
  onWindowResize(): void {
    if ((this.currentStep === 'signing' || this.currentStep === 'submitting') && this.pdfDoc) {
      this.schedulePdfRerender();
    }

    if (this.showSignaturePad) {
      if (this.signatureResizeTimeout) {
        clearTimeout(this.signatureResizeTimeout);
      }
      this.signatureResizeTimeout = setTimeout(() => this.initSignatureCanvas(), 120);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.resizeRenderTimeout) {
      clearTimeout(this.resizeRenderTimeout);
    }
    if (this.signatureResizeTimeout) {
      clearTimeout(this.signatureResizeTimeout);
    }
    this.pdfDoc?.destroy();
  }

  private loadTemplate(): void {
    this.currentStep = 'loading';
    this.error = null;

    const sub = this.flowService.downloadTemplate(this.processId).subscribe({
      next: (data) => {
        this.templateData = data;
        this.fields = (data.fields || []).map(f => this.normalizeDownloadField(f));
        this.activeFieldCode = this.fields[0] ? this.getFieldCode(this.fields[0]) : null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.renderedPageWidth = 0;
        this.renderedPageHeight = 0;
        void this.loadPdf(data.downloadUrl);
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
      this.currentStep = 'loading';
      const loadingTask = getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.pageBaseSizeByNumber.clear();
      await this.renderPage(this.currentPage);
      await this.waitForNextPaint();
      this.currentStep = 'signing';
      this.schedulePdfRerender();
    } catch {
      this.error = 'Error al cargar el documento PDF.';
      this.currentStep = 'error';
    }
  }

  private async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.pdfCanvas?.nativeElement) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewportAtScaleOne = page.getViewport({ scale: 1 });
    this.pageBaseSizeByNumber.set(pageNum, {
      width: viewportAtScaleOne.width,
      height: viewportAtScaleOne.height
    });
    const nextScale = this.resolvePdfScale(viewportAtScaleOne.width);
    const viewport = page.getViewport({ scale: nextScale });

    const canvas = this.pdfCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    this.pdfScale = nextScale;
    this.renderedPageWidth = viewport.width;
    this.renderedPageHeight = viewport.height;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    void this.renderPage(page);
  }

  getFieldPlacementsForPage(page: number): FieldPlacementView[] {
    const views: FieldPlacementView[] = [];
    for (const field of this.fields) {
      field.placements.forEach((placement, index) => {
        if (this.toPositiveInteger(placement.page, 1) !== page) {
          return;
        }
        views.push({
          key: `${this.getFieldCode(field)}-${index}`,
          field,
          placement
        });
      });
    }
    return views;
  }

  getFieldStyle(placement: TemplateFieldPlacement): Record<string, string> {
    const pageNumber = this.toPositiveInteger(placement.page, this.currentPage);
    const baseSize = this.pageBaseSizeByNumber.get(pageNumber);
    const baseWidth = Math.max(baseSize?.width ?? this.renderedPageWidth ?? 1, 1);
    const baseHeight = Math.max(baseSize?.height ?? this.renderedPageHeight ?? 1, 1);
    const xScale = this.renderedPageWidth > 0 ? this.renderedPageWidth / baseWidth : 1;
    const yScale = this.renderedPageHeight > 0 ? this.renderedPageHeight / baseHeight : 1;
    return {
      left: `${this.toNumber(placement.x) * xScale}px`,
      top: `${this.toNumber(placement.y) * yScale}px`,
      width: `${this.toPositiveNumber(placement.width, 1) * xScale}px`,
      height: `${this.toPositiveNumber(placement.height, 1) * yScale}px`
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
    const type = (field.fieldType || '').trim().toLowerCase();
    return type === 'sign' || type === 'signature';
  }

  getPendingFieldsCount(): number {
    return this.fields.length - this.filledFieldsCount();
  }

  getFieldCode(field: TemplateDownloadField): string {
    const code = String(field.fieldCode ?? '').trim();
    if (code) {
      return code;
    }
    return `${field.fieldType}-${field.fieldName}`;
  }

  isActiveField(field: TemplateDownloadField): boolean {
    return this.activeFieldCode === this.getFieldCode(field);
  }

  markFieldAsActive(field: TemplateDownloadField): void {
    this.activeFieldCode = this.getFieldCode(field);
  }

  goToField(field: FieldWithValue, openSignature = false): void {
    this.markFieldAsActive(field);
    const targetPage = this.toPositiveInteger(field.placements[0]?.page, 1);
    if (targetPage !== this.currentPage) {
      this.currentPage = targetPage;
      void this.renderPage(targetPage);
    }
    if (openSignature && this.isSignField(field)) {
      this.openSignaturePad(field);
    }
  }

  goToNextPendingField(): void {
    const pending = this.fields.find(field => field.editable && !this.hasFieldValue(field));
    if (!pending) {
      return;
    }
    this.goToField(pending, this.isSignField(pending));
  }

  openSignaturePad(field: FieldWithValue): void {
    if (!field.editable) {
      return;
    }
    this.markFieldAsActive(field);
    this.activeSignField = field;
    this.showSignaturePad = true;
    this.signatureDataUrl = null;
    this.isSignatureEmpty = true;

    setTimeout(() => {
      this.initSignatureCanvas();
    }, 50);
  }

  private initSignatureCanvas(): void {
    if (!this.signatureCanvas?.nativeElement) return;

    const canvas = this.signatureCanvas.nativeElement;
    const cssWidth = Math.max(280, Math.floor(canvas.parentElement?.clientWidth || 500));
    const cssHeight = window.innerWidth < 640 ? 180 : 220;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(cssWidth * pixelRatio);
    canvas.height = Math.floor(cssHeight * pixelRatio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    this.signCtx = canvas.getContext('2d');

    if (this.signCtx) {
      this.signCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.signCtx.clearRect(0, 0, cssWidth, cssHeight);
      this.prepareSignatureBrush();
      this.isDrawing = false;
    }
  }

  onSignPointerDown(event: PointerEvent): void {
    if (!this.signCtx || !this.signatureCanvas?.nativeElement) return;
    this.isDrawing = true;
    this.isSignatureEmpty = false;
    const { x, y } = this.getSignaturePoint(event);
    const canvas = this.signatureCanvas.nativeElement;
    canvas.setPointerCapture(event.pointerId);

    this.signCtx.fillStyle = '#0f172a';
    this.signCtx.beginPath();
    this.signCtx.arc(x, y, 1.2, 0, Math.PI * 2);
    this.signCtx.fill();

    this.signCtx.beginPath();
    this.signCtx.moveTo(x, y);
  }

  onSignPointerMove(event: PointerEvent): void {
    if (!this.isDrawing || !this.signCtx) return;
    const { x, y } = this.getSignaturePoint(event);
    this.signCtx.lineTo(x, y);
    this.signCtx.stroke();
  }

  onSignPointerUp(event?: PointerEvent): void {
    this.isDrawing = false;
    if (!event || !this.signatureCanvas?.nativeElement) return;
    const canvas = this.signatureCanvas.nativeElement;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  clearSignature(): void {
    this.signatureDataUrl = null;
    this.isSignatureEmpty = true;
    this.initSignatureCanvas();
  }

  confirmSignature(): void {
    if (!this.signatureCanvas || !this.activeSignField || this.isSignatureEmpty) return;

    const canvas = this.signatureCanvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    // Extract base64 data without the data:image/png;base64, prefix
    const base64 = dataUrl.split(',')[1];

    this.activeSignField.value = base64;
    this.markFieldAsActive(this.activeSignField);
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
    if (this.isSignField(field)) {
      return !!field.value;
    }
    return !!field.value.trim();
  }

  onFieldInput(field: FieldWithValue, event: Event): void {
    if (!field.editable) {
      return;
    }
    const target = event.target as HTMLInputElement;
    field.value = target.value;
    this.markFieldAsActive(field);
  }

  allFieldsFilled(): boolean {
    return this.fields.every(f => {
      if (!f.editable) {
        return true;
      }
      return this.isSignField(f) ? !!f.value : !!f.value.trim();
    });
  }

  filledFieldsCount(): number {
    return this.fields.reduce((count, field) => count + (this.hasFieldValue(field) ? 1 : 0), 0);
  }

  submitTemplate(): void {
    if (!this.allFieldsFilled() || this.currentStep === 'submitting') return;

    this.currentStep = 'submitting';
    this.error = null;

    const submitFields: TemplateSubmitField[] = this.fields.map(f => ({
      editable: !!f.editable,
      fieldCode: String(f.fieldCode ?? '').trim() || this.resolveFallbackFieldCode(f.fieldType),
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      placements: f.placements.map(placement => ({
        height: this.toPositiveNumber(placement.height, 1),
        page: this.toPositiveInteger(placement.page, 1),
        width: this.toPositiveNumber(placement.width, 1),
        x: this.toNonNegativeNumber(placement.x, 0),
        y: this.toNonNegativeNumber(placement.y, 0)
      })),
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
    return Math.round(this.toNumber(value, fallback));
  }

  private toNumber(value: string | number, fallback = 0): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return parsed;
  }

  private toPositiveNumber(value: string | number, fallback = 1): number {
    const numeric = this.toNumber(value, fallback);
    return Math.max(numeric, fallback);
  }

  private toNonNegativeNumber(value: string | number, fallback = 0): number {
    const numeric = this.toNumber(value, fallback);
    return Math.max(numeric, 0);
  }

  private toPositiveInteger(value: string | number, fallback = 1): number {
    const integer = this.toInteger(value, fallback);
    return Math.max(integer, fallback);
  }

  private normalizeDownloadField(field: TemplateDownloadField): FieldWithValue {
    const placements = this.normalizePlacements(field);
    return {
      ...field,
      value: typeof field.value === 'string' ? field.value : '',
      editable: field.editable !== false,
      placements
    };
  }

  private normalizePlacements(field: TemplateDownloadField): TemplateFieldPlacement[] {
    if (Array.isArray(field.placements) && field.placements.length) {
      return field.placements.map(placement => ({
        height: this.toPositiveNumber(placement.height, 1),
        page: this.toPositiveInteger(placement.page, 1),
        width: this.toPositiveNumber(placement.width, 1),
        x: this.toNonNegativeNumber(placement.x, 0),
        y: this.toNonNegativeNumber(placement.y, 0)
      }));
    }

    return [
      {
        height: this.toPositiveNumber(field.height ?? 1, 1),
        page: this.toPositiveInteger(field.page ?? 1, 1),
        width: this.toPositiveNumber(field.width ?? 1, 1),
        x: this.toNonNegativeNumber(field.x ?? 0, 0),
        y: this.toNonNegativeNumber(field.y ?? 0, 0)
      }
    ];
  }

  private resolveFallbackFieldCode(fieldType: string): string {
    const type = (fieldType || '').trim().toLowerCase();
    if (type === 'sign' || type === 'signature') {
      return '3';
    }
    if (type === 'number') {
      return '2';
    }
    return '1';
  }

  private resolvePdfScale(pageWidthAtScaleOne: number): number {
    if (!pageWidthAtScaleOne) {
      return this.pdfScale;
    }

    const viewportWidth = this.pdfViewport?.nativeElement.clientWidth || 0;
    if (!viewportWidth) {
      return this.pdfScale;
    }

    const gutter = window.innerWidth < 640 ? 16 : 28;
    const availableWidth = Math.max(viewportWidth - gutter, 220);
    const fitScale = availableWidth / pageWidthAtScaleOne;
    return Math.min(this.maxPdfScale, Math.max(this.minPdfScale, fitScale));
  }

  private schedulePdfRerender(): void {
    if (!this.pdfDoc) {
      return;
    }

    if (this.resizeRenderTimeout) {
      clearTimeout(this.resizeRenderTimeout);
    }

    this.resizeRenderTimeout = setTimeout(() => {
      void this.renderPage(this.currentPage);
    }, 120);
  }

  private prepareSignatureBrush(): void {
    if (!this.signCtx) return;

    this.signCtx.strokeStyle = '#0f172a';
    this.signCtx.fillStyle = '#0f172a';
    this.signCtx.lineWidth = 2.4;
    this.signCtx.lineCap = 'round';
    this.signCtx.lineJoin = 'round';
  }

  private getSignaturePoint(event: PointerEvent): { x: number; y: number } {
    if (!this.signatureCanvas?.nativeElement) {
      return { x: 0, y: 0 };
    }

    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }
}
