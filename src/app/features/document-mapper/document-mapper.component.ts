import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  ElementRef,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { getDocument, GlobalWorkerOptions, TextItem } from 'pdfjs-dist/legacy/build/pdf';
import { FIELD_TYPES } from '../../core/constants/form-builder/field-types.constant';
import type { FormFieldType } from '../../core/models/form-builder/field.model';
import { DocumentMapperService } from '../../core/services/document-mapper/document-mapper.service';

const PDF_WORKER_SRC = 'assets/pdf.worker.min.mjs';
GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

interface PdfPageView {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
}

interface PdfEditableTextItem {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  text: string;
}

export interface DocumentMappedField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  required: boolean;
  helpText: string;
  options: string[];
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

@Component({
  selector: 'app-document-mapper',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-mapper.component.html',
  styleUrl: './document-mapper.component.css'
})
export class DocumentMapperComponent implements OnDestroy {
  @ViewChild('fileInput')
  private fileInputRef?: ElementRef<HTMLInputElement>;

  private docxEditorRef?: ElementRef<HTMLDivElement>;

  @ViewChild('docxEditor')
  set docxEditor(value: ElementRef<HTMLDivElement> | undefined) {
    this.docxEditorRef = value;
    if (value) {
      value.nativeElement.innerHTML = this.docxHtml;
    }
  }

  @ViewChildren('pageCanvas')
  private pageCanvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

  private readonly fb = inject(FormBuilder);
  private readonly mapperService = inject(DocumentMapperService);

  form = this.fb.nonNullable.group({
    documentName: ['', [Validators.required, Validators.maxLength(120)]]
  });

  loading = false;
  dropTargetPage: number | null = null;
  activePageNumber = 1;
  documentMode: 'pdf' | 'docx' | null = null;
  @Output() fileSelected = new EventEmitter<File | undefined>();

  selectedFile?: File;
  errorMessage = '';
  readonly fieldPalette = FIELD_TYPES;
  mappedFields: DocumentMappedField[] = [];
  selectedFieldId: string | null = null;
  isConfigOpen = true;
  pdfPages: PdfPageView[] = [];
  pdfTextItems: PdfEditableTextItem[] = [];
  docxHtml = '<p></p>';

  private draggedFieldType?: FormFieldType;
  private fieldCounter = 0;
  private pdfDocument: any | null = null;
  private renderSession = 0;
  private readonly targetPageWidth = 820;
  private readonly defaultFieldWidth = 0.22;
  private readonly defaultFieldHeight = 0.065;

  ngOnDestroy(): void {
    this.renderSession += 1;
    this.pdfDocument = null;
  }

  getMappedFields(): DocumentMappedField[] {
    return [...this.mappedFields];
  }

  onPaletteDragStart(event: DragEvent, type: FormFieldType): void {
    this.draggedFieldType = type;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type);
      event.dataTransfer.setData('application/x-signly-field', type);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onPaletteDragEnd(): void {
    this.draggedFieldType = undefined;
  }

  onPdfPageDragOver(event: DragEvent, pageNumber: number): void {
    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    event.preventDefault();
    this.dropTargetPage = pageNumber;
  }

  onPdfPageDragLeave(event: DragEvent, pageNumber: number): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    if (this.dropTargetPage === pageNumber) {
      this.dropTargetPage = null;
    }
  }

  onPdfPageDrop(event: DragEvent, pageNumber: number): void {
    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    event.preventDefault();
    this.dropTargetPage = null;
    const pageElement = event.currentTarget as HTMLElement | null;
    if (!pageElement) {
      return;
    }

    const point = this.getNormalizedPoint(event.clientX, event.clientY, pageElement);
    this.placeFieldOnPage(type, pageNumber, point.x, point.y);
  }

  onPaletteClick(type: FormFieldType): void {
    if (this.documentMode === 'docx') {
      this.placeFieldInDocx(type);
      return;
    }

    if (!this.pdfPages.length) {
      this.errorMessage = 'Primero carga un documento para poder insertar campos.';
      return;
    }
    const page = this.activePageNumber || this.pdfPages[0].pageNumber;
    const fieldsOnPage = this.mappedFields.filter(field => field.page === page).length;
    const offsetY = this.clamp(0.18 + fieldsOnPage * 0.08, 0.12, 0.88);
    this.placeFieldOnPage(type, page, 0.5, offsetY);
  }

  onPdfPageClick(pageNumber: number): void {
    this.activePageNumber = pageNumber;
  }

  onFieldChipClick(event: MouseEvent, fieldId: string): void {
    event.stopPropagation();
    this.selectField(fieldId);
  }

  onPdfTextInput(itemId: string, event: Event): void {
    const value = (event.target as HTMLElement).innerText.replace(/\n/g, ' ');
    this.pdfTextItems = this.pdfTextItems.map(item =>
      item.id === itemId ? { ...item, text: value } : item
    );
  }

  getTextItemsForPage(pageNumber: number): PdfEditableTextItem[] {
    return this.pdfTextItems.filter(item => item.pageNumber === pageNumber);
  }

  getTextItemStyle(item: PdfEditableTextItem): Record<string, string> {
    return {
      left: `${item.x}px`,
      top: `${item.y}px`,
      width: `${item.width}px`,
      minHeight: `${item.height}px`,
      fontSize: `${item.fontSize}px`
    };
  }

  onDocxInput(): void {
    const editor = this.docxEditorRef?.nativeElement;
    if (!editor) {
      return;
    }
    this.docxHtml = editor.innerHTML;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await this.processFile(file);
      input.value = '';
    }
  }

  async processFile(file: File): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.selectedFile = file;
      this.fileSelected.emit(file);
      const suggestedName = file.name.replace(/\.[^.]+$/, '');
      this.form.patchValue({ documentName: suggestedName });

      if (this.isPdf(file)) {
        this.documentMode = 'pdf';
        await this.loadPdf(file);
      } else if (this.isDocx(file)) {
        this.documentMode = 'docx';
        await this.loadDocx(file);
      } else {
        throw new Error('Solo se permiten archivos PDF o Word (.docx).');
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo procesar el archivo.';
      this.selectedFile = undefined;
      this.fileSelected.emit(undefined);
      this.documentMode = null;
      this.pdfPages = [];
      this.pdfTextItems = [];
      this.docxHtml = '<p></p>';
      this.mappedFields = [];
      this.selectedFieldId = null;
      this.pdfDocument = null;
    } finally {
      this.loading = false;
    }
  }

  clearDocument(): void {
    this.renderSession += 1;
    this.selectedFile = undefined;
    this.fileSelected.emit(undefined);
    this.errorMessage = '';
    this.form.reset();
    this.documentMode = null;
    this.pdfPages = [];
    this.pdfTextItems = [];
    this.docxHtml = '<p></p>';
    this.pdfDocument = null;
    this.mappedFields = [];
    this.selectedFieldId = null;
    this.dropTargetPage = null;
    this.activePageNumber = 1;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  getFieldsForPage(pageNumber: number): DocumentMappedField[] {
    return this.mappedFields.filter(field => field.page === pageNumber);
  }

  getFieldStyle(field: DocumentMappedField): Record<string, string> {
    return {
      left: `${field.x * 100}%`,
      top: `${field.y * 100}%`,
      width: `${field.width * 100}%`,
      height: `${field.height * 100}%`
    };
  }

  buildPlaceholderPreview(value: string): string {
    return this.buildPlaceholderFromName(value);
  }

  buildPlaceholderFromName(name: string): string {
    const slug = this.normalizeFieldName(name);
    return `{{${slug || 'CAMPO'}}}`;
  }

  selectField(fieldId: string): void {
    this.selectedFieldId = fieldId;
  }

  get selectedField(): DocumentMappedField | undefined {
    return this.mappedFields.find(field => field.id === this.selectedFieldId);
  }

  updateSelectedFieldLabel(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateSelectedField({ label: value });
  }

  updateSelectedFieldName(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const normalized = this.normalizeFieldName(raw);
    this.updateSelectedField({ name: normalized });
  }

  toggleSelectedFieldRequired(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateSelectedField({ required: checked });
  }

  updateSelectedFieldOptions(event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value;
    const options = raw
      .split(',')
      .map(option => option.trim())
      .filter(Boolean);
    this.updateSelectedField({ options });
  }

  updateSelectedFieldHelp(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateSelectedField({ helpText: value });
  }

  updateSelectedFieldMetric(metric: 'x' | 'y' | 'width' | 'height', event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const normalized = this.clamp(parsed / 100, 0, 1);
    const current = this.selectedField;
    if (!current) {
      return;
    }

    if (metric === 'width' || metric === 'height') {
      const min = metric === 'width' ? 0.08 : 0.035;
      const max = metric === 'width' ? 0.8 : 0.3;
      const size = this.clamp(normalized, min, max);
      if (metric === 'width') {
        const nextX = this.clamp(current.x, 0, 1 - size);
        this.updateSelectedField({ width: size, x: nextX });
      } else {
        const nextY = this.clamp(current.y, 0, 1 - size);
        this.updateSelectedField({ height: size, y: nextY });
      }
      return;
    }

    if (metric === 'x') {
      const nextX = this.clamp(normalized, 0, 1 - current.width);
      this.updateSelectedField({ x: nextX });
      return;
    }

    const nextY = this.clamp(normalized, 0, 1 - current.height);
    this.updateSelectedField({ y: nextY });
  }

  getMetricPercent(field: DocumentMappedField, metric: 'x' | 'y' | 'width' | 'height'): string {
    return (field[metric] * 100).toFixed(2);
  }

  removeField(fieldId: string): void {
    this.mappedFields = this.mappedFields.filter(field => field.id !== fieldId);
    if (this.selectedFieldId === fieldId) {
      this.selectedFieldId = this.mappedFields[0]?.id ?? null;
    }
  }

  supportsOptions(type: FormFieldType): boolean {
    return type === 'select' || type === 'radio' || type === 'multiselect';
  }

  getOptionsText(field: DocumentMappedField): string {
    return field.options.join(', ');
  }

  private getDragType(event: DragEvent): FormFieldType | undefined {
    const data =
      event.dataTransfer?.getData('application/x-signly-field') ||
      event.dataTransfer?.getData('text/plain') ||
      this.draggedFieldType;
    if (!data) {
      return undefined;
    }
    return this.fieldPalette.find(item => item.type === data)?.type;
  }

  private normalizeFieldName(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private createMappedField(
    type: FormFieldType,
    page: number,
    x: number,
    y: number,
    width: number,
    height: number,
    pageWidth: number,
    pageHeight: number
  ): DocumentMappedField {
    const palette = this.fieldPalette.find(item => item.type === type);
    const base = palette?.label || type;
    const suffix = ++this.fieldCounter;
    const name = this.normalizeFieldName(`${base}_${suffix}`) || `CAMPO_${suffix}`;
    return {
      id: `field_${Date.now()}_${suffix}`,
      type,
      label: palette?.label || 'Nuevo campo',
      name,
      required: false,
      helpText: '',
      options: [],
      page,
      x,
      y,
      width,
      height,
      pageWidth,
      pageHeight
    };
  }

  private placeFieldOnPage(type: FormFieldType, pageNumber: number, x: number, y: number): void {
    const page = this.pdfPages.find(item => item.pageNumber === pageNumber);
    if (!page) {
      return;
    }
    const size = this.getDefaultFieldSize(type);
    const normalizedX = this.clamp(x - size.width / 2, 0, 1 - size.width);
    const normalizedY = this.clamp(y - size.height / 2, 0, 1 - size.height);
    const field = this.createMappedField(
      type,
      pageNumber,
      normalizedX,
      normalizedY,
      size.width,
      size.height,
      page.width,
      page.height
    );
    this.mappedFields = [...this.mappedFields, field];
    this.selectedFieldId = field.id;
    this.activePageNumber = pageNumber;
  }

  private placeFieldInDocx(type: FormFieldType): void {
    const size = this.getDefaultFieldSize(type);
    const fieldsOnDocx = this.mappedFields.length;
    const y = this.clamp(0.12 + fieldsOnDocx * 0.06, 0, 0.92);
    const field = this.createMappedField(type, 1, 0.08, y, size.width, size.height, 1000, 1400);
    this.mappedFields = [...this.mappedFields, field];
    this.selectedFieldId = field.id;
    this.insertDocxPlaceholder(this.buildPlaceholderFromName(field.name));
  }

  private updateSelectedField(patch: Partial<DocumentMappedField>): void {
    if (!this.selectedFieldId) {
      return;
    }
    this.mappedFields = this.mappedFields.map(field =>
      field.id === this.selectedFieldId ? { ...field, ...patch } : field
    );
  }

  private getDefaultFieldSize(type: FormFieldType): { width: number; height: number } {
    switch (type) {
      case 'textarea':
        return { width: 0.3, height: 0.11 };
      case 'date':
      case 'datetime':
        return { width: 0.18, height: 0.06 };
      case 'radio':
      case 'multiselect':
      case 'select':
        return { width: 0.24, height: 0.07 };
      default:
        return { width: this.defaultFieldWidth, height: this.defaultFieldHeight };
    }
  }

  private getNormalizedPoint(clientX: number, clientY: number, element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { x: 0.5, y: 0.5 };
    }
    const x = this.clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = this.clamp((clientY - rect.top) / rect.height, 0, 1);
    return { x, y };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private async loadDocx(file: File): Promise<void> {
    const result = await this.mapperService.convertFileToHtml(file);
    this.renderSession += 1;
    this.pdfDocument = null;
    this.pdfPages = [];
    this.pdfTextItems = [];
    this.activePageNumber = 1;
    this.dropTargetPage = null;
    this.mappedFields = [];
    this.selectedFieldId = null;
    this.fieldCounter = 0;
    this.docxHtml = result.content?.trim() ? result.content : '<p></p>';
    await this.sleep(0);
    if (this.docxEditorRef?.nativeElement) {
      this.docxEditorRef.nativeElement.innerHTML = this.docxHtml;
    }
  }

  private async loadPdf(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    this.renderSession += 1;
    const currentSession = this.renderSession;
    const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    if (currentSession !== this.renderSession) {
      return;
    }

    const pages: PdfPageView[] = [];
    const textItems: PdfEditableTextItem[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = this.targetPageWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      pages.push({
        pageNumber,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        scale
      });
      textItems.push(
        ...this.mapPdfTextItems(
          textContent.items,
          pageNumber,
          scale,
          baseViewport.height,
          Math.round(viewport.width),
          Math.round(viewport.height)
        )
      );
    }

    if (currentSession !== this.renderSession) {
      return;
    }

    this.pdfDocument = pdf;
    this.pdfPages = pages;
    this.pdfTextItems = textItems;
    this.docxHtml = '<p></p>';
    this.activePageNumber = pages[0]?.pageNumber ?? 1;
    this.dropTargetPage = null;
    this.mappedFields = [];
    this.selectedFieldId = null;
    this.fieldCounter = 0;

    await this.waitForCanvasElements(pages.length);
    await this.renderPdfPages(currentSession);
  }

  private async waitForCanvasElements(expected: number): Promise<void> {
    if (expected === 0) {
      return;
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      if ((this.pageCanvasRefs?.length ?? 0) === expected) {
        return;
      }
      await this.sleep(16);
    }
  }

  private async renderPdfPages(session: number): Promise<void> {
    if (!this.pdfDocument || !this.pageCanvasRefs) {
      return;
    }

    const canvases = this.pageCanvasRefs.toArray();
    for (const pageView of this.pdfPages) {
      if (session !== this.renderSession || !this.pdfDocument) {
        return;
      }

      const canvas = canvases[pageView.pageNumber - 1]?.nativeElement;
      if (!canvas) {
        continue;
      }

      const page = await this.pdfDocument.getPage(pageView.pageNumber);
      const viewport = page.getViewport({ scale: pageView.scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) {
        continue;
      }

      await page.render({ canvasContext: context, viewport } as any).promise;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  private insertDocxPlaceholder(placeholder: string): void {
    const editor = this.docxEditorRef?.nativeElement;
    if (!editor) {
      return;
    }

    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(document.createTextNode(placeholder));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        this.docxHtml = editor.innerHTML;
        return;
      }
    }

    editor.appendChild(document.createTextNode(` ${placeholder}`));
    this.docxHtml = editor.innerHTML;
  }

  private mapPdfTextItems(
    items: unknown[],
    pageNumber: number,
    scale: number,
    pageHeightBase: number,
    pageWidth: number,
    pageHeight: number
  ): PdfEditableTextItem[] {
    const result: PdfEditableTextItem[] = [];
    let itemIndex = 0;

    for (const item of items) {
      if (!this.isTextItem(item)) {
        continue;
      }

      const value = item.str ?? '';
      if (!value.trim()) {
        continue;
      }

      const transform = (item.transform ?? []) as number[];
      const offsetX = Number(transform[4] ?? 0) * scale;
      const offsetY = (pageHeightBase - Number(transform[5] ?? 0)) * scale;
      const fontSize = this.clamp(Math.abs(Number(transform[3] ?? 10)) * scale, 8, 40);
      const widthRaw = Number(item.width ?? 0) * scale;
      const width = Math.max(widthRaw, value.length * fontSize * 0.45, 10);
      const height = Math.max(fontSize * 1.2, 12);
      const x = this.clamp(offsetX, 0, Math.max(pageWidth - width, 0));
      const y = this.clamp(offsetY - height * 0.8, 0, Math.max(pageHeight - height, 0));

      result.push({
        id: `text_${pageNumber}_${itemIndex++}`,
        pageNumber,
        x,
        y,
        width,
        height,
        fontSize,
        text: value
      });
    }

    return result;
  }

  private isTextItem(item: unknown): item is TextItem {
    return Boolean(item && typeof (item as TextItem).str === 'string');
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
}
