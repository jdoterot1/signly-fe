import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  EventEmitter,
  ElementRef,
  HostListener,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewEncapsulation,
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
  pageWidth: number;
  pageHeight: number;
  text: string;
  originalText: string;
  edited: boolean;
}

export interface DocumentPdfTextEdit {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pageWidth: number;
  pageHeight: number;
  text: string;
}

interface ApiTemplateFieldLike {
  page: number | string;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  fieldName: string;
  fieldType: string;
  fieldCode: number | string;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface FieldResizeState {
  fieldId: string;
  handle: ResizeHandle;
  pageElement: HTMLElement;
  anchorX: number;
  anchorY: number;
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
  styleUrl: './document-mapper.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DocumentMapperComponent implements OnDestroy, AfterViewChecked {
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
  private draggedFieldId: string | null = null;
  private fieldCounter = 0;
  private pdfDocument: any | null = null;
  private renderSession = 0;
  private initializedTextIds = new Set<string>();
  private readonly targetPageWidth = 820;
  private readonly defaultFieldWidth = 0.22;
  private readonly defaultFieldHeight = 0.065;
  private readonly minFieldWidth = 0.01;
  private readonly minFieldHeight = 0.01;
  private activeResize: FieldResizeState | null = null;

  private undoStack: DocumentMappedField[][] = [];
  private redoStack: DocumentMappedField[][] = [];
  private readonly maxHistorySize = 50;

  ngOnDestroy(): void {
    this.renderSession += 1;
    this.pdfDocument = null;
  }

  ngAfterViewChecked(): void {
    if (this.documentMode !== 'pdf' || !this.pdfTextItems.length) {
      return;
    }
    for (const item of this.pdfTextItems) {
      if (this.initializedTextIds.has(item.id)) {
        continue;
      }
      const el = document.querySelector(`[data-text-id="${item.id}"]`) as HTMLElement | null;
      if (el) {
        el.textContent = item.text;
        this.initializedTextIds.add(item.id);
      }
    }
  }

  trackTextItem(_index: number, item: PdfEditableTextItem): string {
    return item.id;
  }

  onPdfTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.stopPropagation();
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    if (!this.undoStack.length) {
      return;
    }
    this.redoStack.push([...this.mappedFields]);
    this.mappedFields = this.undoStack.pop()!;
    this.selectedFieldId = this.mappedFields.find(f => f.id === this.selectedFieldId)?.id ?? this.mappedFields[0]?.id ?? null;
  }

  redo(): void {
    if (!this.redoStack.length) {
      return;
    }
    this.undoStack.push([...this.mappedFields]);
    this.mappedFields = this.redoStack.pop()!;
    this.selectedFieldId = this.mappedFields.find(f => f.id === this.selectedFieldId)?.id ?? this.mappedFields[0]?.id ?? null;
  }

  private pushHistory(): void {
    this.undoStack.push([...this.mappedFields]);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  getMappedFields(): DocumentMappedField[] {
    return [...this.mappedFields];
  }

  getEditedPdfTextItems(): DocumentPdfTextEdit[] {
    if (this.documentMode !== 'pdf') {
      return [];
    }

    return this.pdfTextItems
      .filter(item => item.edited)
      .map(item => ({
        pageNumber: item.pageNumber,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fontSize: item.fontSize,
        pageWidth: item.pageWidth,
        pageHeight: item.pageHeight,
        text: item.text
      }));
  }

  loadMappedFieldsFromApi(fields: ApiTemplateFieldLike[]): void {
    if (!fields.length) {
      this.mappedFields = [];
      this.selectedFieldId = null;
      this.fieldCounter = 0;
      this.undoStack = [];
      this.redoStack = [];
      return;
    }

    const next: DocumentMappedField[] = fields.map((field, index) => {
      const pageNumber = this.toPositiveInt(field.page, 1);
      const pageMeta = this.pdfPages.find(page => page.pageNumber === pageNumber);
      const pageWidth = pageMeta?.width ?? 1000;
      const pageHeight = pageMeta?.height ?? 1400;

      const widthPx = this.toNumber(field.width, 180);
      const heightPx = this.toNumber(field.height, 70);
      const xPx = this.toNumber(field.x, 0);
      const yPx = this.toNumber(field.y, 0);

      const normalizedWidth = this.clamp(widthPx / pageWidth, 0.01, 1);
      const normalizedHeight = this.clamp(heightPx / pageHeight, 0.01, 1);
      const normalizedX = this.clamp(xPx / pageWidth, 0, Math.max(1 - normalizedWidth, 0));
      const normalizedY = this.clamp(yPx / pageHeight, 0, Math.max(1 - normalizedHeight, 0));

      const name = this.normalizeFieldName(field.fieldName || `CAMPO_${index + 1}`) || `CAMPO_${index + 1}`;
      const type = this.mapApiFieldTypeToUi(field.fieldType);
      const suffix = this.toPositiveInt(field.fieldCode, index + 1);

      return {
        id: `field_api_${Date.now()}_${index}`,
        type,
        label: this.toDisplayLabel(name),
        name,
        required: false,
        helpText: '',
        options: [],
        page: pageNumber,
        x: normalizedX,
        y: normalizedY,
        width: normalizedWidth,
        height: normalizedHeight,
        pageWidth,
        pageHeight
      };
    });

    this.mappedFields = next;
    this.selectedFieldId = next[0]?.id ?? null;
    this.fieldCounter = next.length;
    this.undoStack = [];
    this.redoStack = [];
    this.stripUnderlyingPdfText(next);
  }

  onPaletteDragStart(event: DragEvent, type: FormFieldType): void {
    this.draggedFieldType = type;
    this.draggedFieldId = null;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type);
      event.dataTransfer.setData('application/x-signly-field', type);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onPaletteDragEnd(): void {
    this.draggedFieldType = undefined;
    this.draggedFieldId = null;
  }

  onChipDragStart(event: DragEvent, field: DocumentMappedField): void {
    event.stopPropagation();
    this.draggedFieldId = field.id;
    this.draggedFieldType = undefined;
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/x-signly-move', field.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onChipDragEnd(): void {
    this.draggedFieldId = null;
    this.draggedFieldType = undefined;
  }

  onPdfPageDragOver(event: DragEvent, pageNumber: number): void {
    if (this.draggedFieldId || this.getDragType(event)) {
      event.preventDefault();
      this.dropTargetPage = pageNumber;
    }
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
    event.preventDefault();
    this.dropTargetPage = null;
    const pageElement = event.currentTarget as HTMLElement | null;
    if (!pageElement) {
      return;
    }

    const moveId = this.draggedFieldId || event.dataTransfer?.getData('application/x-signly-move');
    if (moveId) {
      const point = this.getNormalizedPoint(event.clientX, event.clientY, pageElement);
      this.moveFieldToPage(moveId, pageNumber, point.x, point.y);
      this.draggedFieldId = null;
      return;
    }

    const type = this.getDragType(event);
    if (type) {
      const point = this.getNormalizedPoint(event.clientX, event.clientY, pageElement);
      this.placeFieldOnPage(type, pageNumber, point.x, point.y);
    }
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

  onResizeHandleMouseDown(event: MouseEvent, field: DocumentMappedField, handle: ResizeHandle): void {
    if (this.documentMode !== 'pdf') {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    const pageElement = target?.closest('.pdf-page') as HTMLElement | null;
    if (!pageElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.pushHistory();

    const right = this.clamp(field.x + field.width, 0, 1);
    const bottom = this.clamp(field.y + field.height, 0, 1);
    const anchorX = handle === 'nw' || handle === 'sw' ? right : field.x;
    const anchorY = handle === 'nw' || handle === 'ne' ? bottom : field.y;

    this.activeResize = {
      fieldId: field.id,
      handle,
      pageElement,
      anchorX,
      anchorY
    };
    this.selectedFieldId = field.id;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    const resizeState = this.activeResize;
    if (!resizeState) {
      return;
    }

    event.preventDefault();
    const point = this.getNormalizedPoint(event.clientX, event.clientY, resizeState.pageElement);
    this.applyResizeFromHandle(resizeState, point.x, point.y);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.activeResize) {
      return;
    }
    this.activeResize = null;
  }

  onPdfTextInput(itemId: string, event: Event): void {
    const value = (event.target as HTMLElement).innerText.replace(/\n/g, ' ');
    this.pdfTextItems = this.pdfTextItems.map(item =>
      item.id === itemId ? { ...item, text: value, edited: value !== item.originalText } : item
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

  onDocxDragOver(event: DragEvent): void {
    const type = this.getDragType(event);
    if (type) {
      event.preventDefault();
    }
  }

  onDocxDrop(event: DragEvent): void {
    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    event.preventDefault();
    this.placeFieldInDocx(type);
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
    this.initializedTextIds = new Set<string>();
    this.docxHtml = '<p></p>';
    this.pdfDocument = null;
    this.mappedFields = [];
    this.selectedFieldId = null;
    this.dropTargetPage = null;
    this.activePageNumber = 1;
    this.undoStack = [];
    this.redoStack = [];
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
      const min = metric === 'width' ? 0.01 : 0.01;
      const max = metric === 'width' ? 0.9 : 0.5;
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
    this.pushHistory();
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
    this.pushHistory();
    this.mappedFields = [...this.mappedFields, field];
    this.selectedFieldId = field.id;
    this.activePageNumber = pageNumber;
  }

  private moveFieldToPage(fieldId: string, pageNumber: number, x: number, y: number): void {
    const existing = this.mappedFields.find(f => f.id === fieldId);
    if (!existing) {
      return;
    }
    const page = this.pdfPages.find(item => item.pageNumber === pageNumber);
    if (!page) {
      return;
    }
    const normalizedX = this.clamp(x - existing.width / 2, 0, 1 - existing.width);
    const normalizedY = this.clamp(y - existing.height / 2, 0, 1 - existing.height);
    this.pushHistory();
    this.mappedFields = this.mappedFields.map(f =>
      f.id === fieldId
        ? { ...f, page: pageNumber, x: normalizedX, y: normalizedY, pageWidth: page.width, pageHeight: page.height }
        : f
    );
    this.selectedFieldId = fieldId;
    this.activePageNumber = pageNumber;
  }

  private placeFieldInDocx(type: FormFieldType): void {
    const size = this.getDefaultFieldSize(type);
    const fieldsOnDocx = this.mappedFields.length;
    const y = this.clamp(0.12 + fieldsOnDocx * 0.06, 0, 0.92);
    const field = this.createMappedField(type, 1, 0.08, y, size.width, size.height, 1000, 1400);
    this.pushHistory();
    this.mappedFields = [...this.mappedFields, field];
    this.selectedFieldId = field.id;
    this.insertDocxPlaceholder(this.buildPlaceholderFromName(field.name));
  }

  private updateSelectedField(patch: Partial<DocumentMappedField>): void {
    if (!this.selectedFieldId) {
      return;
    }
    this.pushHistory();
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

  private applyResizeFromHandle(state: FieldResizeState, pointerX: number, pointerY: number): void {
    const minW = this.minFieldWidth;
    const minH = this.minFieldHeight;
    const maxX = 1;
    const maxY = 1;

    let x = state.anchorX;
    let y = state.anchorY;
    let width = minW;
    let height = minH;

    switch (state.handle) {
      case 'nw': {
        x = this.clamp(pointerX, 0, state.anchorX - minW);
        y = this.clamp(pointerY, 0, state.anchorY - minH);
        width = this.clamp(state.anchorX - x, minW, maxX - x);
        height = this.clamp(state.anchorY - y, minH, maxY - y);
        break;
      }
      case 'ne': {
        const right = this.clamp(pointerX, state.anchorX + minW, maxX);
        y = this.clamp(pointerY, 0, state.anchorY - minH);
        x = state.anchorX;
        width = this.clamp(right - x, minW, maxX - x);
        height = this.clamp(state.anchorY - y, minH, maxY - y);
        break;
      }
      case 'sw': {
        x = this.clamp(pointerX, 0, state.anchorX - minW);
        const bottom = this.clamp(pointerY, state.anchorY + minH, maxY);
        y = state.anchorY;
        width = this.clamp(state.anchorX - x, minW, maxX - x);
        height = this.clamp(bottom - y, minH, maxY - y);
        break;
      }
      case 'se':
      default: {
        const right = this.clamp(pointerX, state.anchorX + minW, maxX);
        const bottom = this.clamp(pointerY, state.anchorY + minH, maxY);
        x = state.anchorX;
        y = state.anchorY;
        width = this.clamp(right - x, minW, maxX - x);
        height = this.clamp(bottom - y, minH, maxY - y);
        break;
      }
    }

    this.mappedFields = this.mappedFields.map(field =>
      field.id === state.fieldId ? { ...field, x, y, width, height } : field
    );
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
    this.undoStack = [];
    this.redoStack = [];
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
    this.initializedTextIds = new Set<string>();
    this.docxHtml = '<p></p>';
    this.activePageNumber = pages[0]?.pageNumber ?? 1;
    this.dropTargetPage = null;
    this.mappedFields = [];
    this.selectedFieldId = null;
    this.fieldCounter = 0;
    this.undoStack = [];
    this.redoStack = [];

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
        pageWidth,
        pageHeight,
        text: value,
        originalText: value,
        edited: false
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

  private toNumber(value: number | string | null | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toPositiveInt(value: number | string | null | undefined, fallback: number): number {
    const parsed = Math.trunc(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return parsed;
  }

  private mapApiFieldTypeToUi(fieldType: string): FormFieldType {
    switch ((fieldType || '').toLowerCase()) {
      case 'number':
        return 'number';
      case 'sign':
        return 'sign';
      case 'img':
        return 'file';
      case 'text':
      default:
        return 'string';
    }
  }

  private toDisplayLabel(fieldName: string): string {
    return fieldName
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private stripUnderlyingPdfText(fields: DocumentMappedField[]): void {
    if (this.documentMode !== 'pdf' || !this.pdfTextItems.length || !fields.length) {
      return;
    }

    const placeholderSet = new Set(
      fields.map(field => `{{${field.name}}}`.replace(/\s+/g, '').toUpperCase())
    );

    this.pdfTextItems = this.pdfTextItems.filter(item => {
      const normalizedText = (item.text || '').replace(/\s+/g, '').toUpperCase();
      if (placeholderSet.has(normalizedText)) {
        return false;
      }

      const overlappingField = fields.find(field => {
        if (field.page !== item.pageNumber) {
          return false;
        }
        const fieldRect = {
          x: field.x * field.pageWidth,
          y: field.y * field.pageHeight,
          width: field.width * field.pageWidth,
          height: field.height * field.pageHeight
        };
        return this.rectOverlapRatio(item, fieldRect) > 0.35;
      });

      return !overlappingField;
    });
  }

  private rectOverlapRatio(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): number {
    const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const intersection = xOverlap * yOverlap;
    if (intersection <= 0) {
      return 0;
    }

    const minArea = Math.min(a.width * a.height, b.width * b.height);
    if (minArea <= 0) {
      return 0;
    }

    return intersection / minArea;
  }
}
