import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  EventEmitter,
  ElementRef,
  HostListener,
  Input,
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
  pdfWidth: number;
  pdfHeight: number;
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

export type DocumentMapperValidationType = 'out_of_bounds' | 'overlap' | 'duplicate_name';

export interface DocumentMapperValidationIssue {
  type: DocumentMapperValidationType;
  message: string;
  fieldIds: string[];
  page: number | null;
}

export interface DocumentMapperValidationResult {
  hasIssues: boolean;
  issues: DocumentMapperValidationIssue[];
  summary: {
    outOfBounds: number;
    overlaps: number;
    duplicateNames: number;
  };
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
  pdfPageWidth: number;
  pdfPageHeight: number;
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
  @Input() allowDocx = true;
  @Input() allowFileReplace = true;

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
  fileDropActive = false;
  dropTargetPage: number | null = null;
  activePageNumber = 1;
  documentMode: 'pdf' | 'docx' | null = null;
  @Output() fileSelected = new EventEmitter<File | undefined>();

  selectedFile?: File;
  errorMessage = '';
  readonly fieldPalette = FIELD_TYPES;
  mappedFields: DocumentMappedField[] = [];
  selectedFieldId: string | null = null;
  selectedFieldIds = new Set<string>();
  isConfigOpen = true;
  pdfPages: PdfPageView[] = [];
  pdfTextItems: PdfEditableTextItem[] = [];
  docxHtml = '<p></p>';

  private draggedFieldType?: FormFieldType;
  private draggedFieldId: string | null = null;
  private draggedFieldIds: string[] = [];
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
    this.syncSelectionAfterFieldsChange();
  }

  redo(): void {
    if (!this.redoStack.length) {
      return;
    }
    this.undoStack.push([...this.mappedFields]);
    this.mappedFields = this.redoStack.pop()!;
    this.syncSelectionAfterFieldsChange();
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

  get selectedFields(): DocumentMappedField[] {
    if (!this.selectedFieldIds.size) {
      return [];
    }
    return this.mappedFields.filter(field => this.selectedFieldIds.has(field.id));
  }

  get hasSelection(): boolean {
    return this.selectedFieldIds.size > 0;
  }

  get hasMultiSelection(): boolean {
    return this.selectedFieldIds.size > 1;
  }

  get canAlignSelection(): boolean {
    return this.groupSelectedFieldsByPage(2).length > 0;
  }

  get canDistributeSelection(): boolean {
    return this.groupSelectedFieldsByPage(3).length > 0;
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

  validateMappedFields(): DocumentMapperValidationResult {
    const issues: DocumentMapperValidationIssue[] = [];
    let outOfBounds = 0;
    let overlaps = 0;
    let duplicateNames = 0;

    for (const field of this.mappedFields) {
      if (this.isOutOfBounds(field)) {
        outOfBounds += 1;
        issues.push({
          type: 'out_of_bounds',
          message: `Campo "${field.label || field.name}" fuera del área válida en página ${field.page}.`,
          fieldIds: [field.id],
          page: field.page
        });
      }
    }

    const groupedByName = new Map<string, DocumentMappedField[]>();
    for (const field of this.mappedFields) {
      const key = this.normalizeFieldName(field.name || field.label || 'CAMPO') || 'CAMPO';
      const list = groupedByName.get(key) ?? [];
      list.push(field);
      groupedByName.set(key, list);
    }
    for (const [key, group] of groupedByName.entries()) {
      if (group.length < 2) {
        continue;
      }
      duplicateNames += 1;
      issues.push({
        type: 'duplicate_name',
        message: `Código de campo repetido: "${key}" (${group.length} veces).`,
        fieldIds: group.map(field => field.id),
        page: null
      });
    }

    for (let i = 0; i < this.mappedFields.length; i++) {
      const a = this.mappedFields[i];
      for (let j = i + 1; j < this.mappedFields.length; j++) {
        const b = this.mappedFields[j];
        if (a.page !== b.page) {
          continue;
        }
        if (!this.hasOverlap(a, b)) {
          continue;
        }
        overlaps += 1;
        issues.push({
          type: 'overlap',
          message: `Campos superpuestos en página ${a.page}: "${a.label || a.name}" y "${b.label || b.name}".`,
          fieldIds: [a.id, b.id],
          page: a.page
        });
      }
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      summary: {
        outOfBounds,
        overlaps,
        duplicateNames
      }
    };
  }

  loadMappedFieldsFromApi(fields: ApiTemplateFieldLike[]): void {
    if (!fields.length) {
      this.mappedFields = [];
      this.setSelection([]);
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
      const pdfPageWidth = pageMeta?.pdfWidth ?? pageWidth;
      const pdfPageHeight = pageMeta?.pdfHeight ?? pageHeight;

      const widthPx = this.toNumber(field.width, 180);
      const heightPx = this.toNumber(field.height, 70);
      const xPx = this.toNumber(field.x, 0);
      const yPx = this.toNumber(field.y, 0);

      const normalizedWidth = this.clamp(widthPx / pdfPageWidth, 0.01, 1);
      const normalizedHeight = this.clamp(heightPx / pdfPageHeight, 0.01, 1);
      const normalizedX = this.clamp(xPx / pdfPageWidth, 0, Math.max(1 - normalizedWidth, 0));
      const normalizedY = this.clamp(yPx / pdfPageHeight, 0, Math.max(1 - normalizedHeight, 0));

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
        pageHeight,
        pdfPageWidth,
        pdfPageHeight
      };
    });

    this.mappedFields = next;
    this.setSelection(next[0] ? [next[0].id] : []);
    this.fieldCounter = next.length;
    this.undoStack = [];
    this.redoStack = [];
    this.stripUnderlyingPdfText(next);
  }

  onPaletteDragStart(event: DragEvent, type: FormFieldType): void {
    this.draggedFieldType = type;
    this.draggedFieldId = null;
    this.draggedFieldIds = [];
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type);
      event.dataTransfer.setData('application/x-signly-field', type);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onPaletteDragEnd(): void {
    this.draggedFieldType = undefined;
    this.draggedFieldId = null;
    this.draggedFieldIds = [];
  }

  onChipDragStart(event: DragEvent, field: DocumentMappedField): void {
    event.stopPropagation();
    if (!this.isFieldSelected(field.id)) {
      this.setSelection([field.id]);
    }
    const selectedIds = this.selectedFields.map(item => item.id);
    this.draggedFieldId = field.id;
    this.draggedFieldIds = selectedIds.length ? selectedIds : [field.id];
    this.draggedFieldType = undefined;
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/x-signly-move', field.id);
      event.dataTransfer.setData('application/x-signly-move-group', JSON.stringify(this.draggedFieldIds));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onChipDragEnd(): void {
    this.draggedFieldId = null;
    this.draggedFieldIds = [];
    this.draggedFieldType = undefined;
  }

  onPdfPageDragOver(event: DragEvent, pageNumber: number): void {
    if (this.draggedFieldId || this.draggedFieldIds.length || this.getDragType(event)) {
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
    const moveGroup = this.getDraggedFieldIds(event);
    if (moveId) {
      const point = this.getNormalizedPoint(event.clientX, event.clientY, pageElement);
      if (moveGroup.length > 1) {
        this.moveFieldGroupToPage(moveGroup, moveId, pageNumber, point.x, point.y);
      } else {
        this.moveFieldToPage(moveId, pageNumber, point.x, point.y);
      }
      this.draggedFieldId = null;
      this.draggedFieldIds = [];
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
    this.selectField(fieldId, event);
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
    this.setSelection([field.id]);
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
      } else if (this.allowDocx && this.isDocx(file)) {
        this.documentMode = 'docx';
        await this.loadDocx(file);
      } else {
        throw new Error(this.allowDocx ? 'Solo se permiten archivos PDF o Word (.docx).' : 'Solo se permiten archivos PDF.');
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
      this.setSelection([]);
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
    this.setSelection([]);
    this.dropTargetPage = null;
    this.activePageNumber = 1;
    this.undoStack = [];
    this.redoStack = [];
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  openFilePicker(): void {
    if (!this.allowFileReplace) {
      return;
    }
    this.fileInputRef?.nativeElement.click();
  }

  get fileInputAccept(): string {
    return this.allowDocx
      ? '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : '.pdf,application/pdf';
  }

  get fileUploadHint(): string {
    return this.allowDocx
      ? 'Carga un PDF o Word para iniciar el mapeo y edición.'
      : 'Carga un PDF para iniciar el mapeo y edición.';
  }

  get loadButtonLabel(): string {
    return this.allowDocx ? 'Cargar archivo' : 'Cargar PDF';
  }

  onFileDragOver(event: DragEvent): void {
    if (!this.allowFileReplace) {
      return;
    }
    if (!this.hasDraggedFiles(event)) {
      return;
    }
    event.preventDefault();
    this.fileDropActive = true;
  }

  onFileDragLeave(event: DragEvent): void {
    if (!this.allowFileReplace) {
      return;
    }
    if (!this.hasDraggedFiles(event)) {
      return;
    }
    const currentTarget = event.currentTarget as HTMLElement | null;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    this.fileDropActive = false;
  }

  async onFileDrop(event: DragEvent): Promise<void> {
    if (!this.allowFileReplace) {
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    event.preventDefault();
    this.fileDropActive = false;
    await this.processFile(file);
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

  selectField(fieldId: string, event?: MouseEvent): void {
    const isToggle = !!event && (event.ctrlKey || event.metaKey);
    if (isToggle) {
      if (this.selectedFieldIds.has(fieldId)) {
        this.setSelection(this.selectedFields.map(field => field.id).filter(id => id !== fieldId));
      } else {
        this.setSelection([...this.selectedFields.map(field => field.id), fieldId]);
      }
      return;
    }
    this.setSelection([fieldId]);
  }

  isFieldSelected(fieldId: string): boolean {
    return this.selectedFieldIds.has(fieldId);
  }

  get selectedField(): DocumentMappedField | undefined {
    return this.selectedFields[0];
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
    this.removeFieldsByIds([fieldId]);
  }

  removeSelectedFields(): void {
    this.removeFieldsByIds(this.selectedFields.map(field => field.id));
  }

  private removeFieldsByIds(fieldIds: string[]): void {
    const toRemove = new Set(fieldIds.filter(Boolean));
    if (!toRemove.size) {
      return;
    }

    this.pushHistory();
    this.mappedFields = this.mappedFields.filter(field => !toRemove.has(field.id));
    this.syncSelectionAfterFieldsChange();
  }

  duplicateField(fieldId: string): void {
    if (this.hasMultiSelection && this.selectedFieldIds.has(fieldId)) {
      this.duplicateSelectedFields();
      return;
    }

    const original = this.mappedFields.find(field => field.id === fieldId);
    if (!original) {
      return;
    }

    const suffix = ++this.fieldCounter;
    const copyName = this.buildDuplicateFieldName(original.name, suffix);
    const copyLabel = this.buildDuplicateFieldLabel(original.label, suffix);
    const copyId = `field_${Date.now()}_${suffix}`;

    const copy: DocumentMappedField = {
      ...original,
      id: copyId,
      label: copyLabel,
      name: copyName,
      x: this.clamp(original.x + 0.02, 0, 1 - original.width),
      y: this.clamp(original.y + 0.02, 0, 1 - original.height)
    };

    this.pushHistory();
    this.mappedFields = [...this.mappedFields, copy];
    this.setSelection([copy.id]);
    this.activePageNumber = copy.page;
  }

  duplicateSelectedFields(): void {
    const originals = this.selectedFields;
    if (!originals.length) {
      return;
    }

    this.pushHistory();
    const scopeFields: DocumentMappedField[] = [...this.mappedFields];
    const copies: DocumentMappedField[] = originals.map(original => {
      const suffix = ++this.fieldCounter;
      const copyName = this.buildDuplicateFieldName(original.name, suffix, scopeFields);
      const copyLabel = this.buildDuplicateFieldLabel(original.label, suffix, scopeFields);
      const copy: DocumentMappedField = {
        ...original,
        id: `field_${Date.now()}_${suffix}`,
        label: copyLabel,
        name: copyName,
        x: this.clamp(original.x + 0.02, 0, 1 - original.width),
        y: this.clamp(original.y + 0.02, 0, 1 - original.height)
      };
      scopeFields.push(copy);
      return copy;
    });

    this.mappedFields = [...this.mappedFields, ...copies];
    this.setSelection(copies.map(field => field.id));
    this.activePageNumber = copies[0]?.page ?? this.activePageNumber;
  }

  setRequiredForSelected(required: boolean): void {
    const selected = this.selectedFields;
    if (!selected.length) {
      return;
    }
    this.pushHistory();
    const selectedIds = new Set(selected.map(field => field.id));
    this.mappedFields = this.mappedFields.map(field =>
      selectedIds.has(field.id) ? { ...field, required } : field
    );
  }

  alignSelected(mode: 'left' | 'center' | 'right' | 'top'): void {
    const groups = this.groupSelectedFieldsByPage(2);
    if (!groups.length) {
      return;
    }

    const patches = new Map<string, Partial<DocumentMappedField>>();
    for (const group of groups) {
      if (mode === 'left') {
        const left = Math.min(...group.map(field => field.x));
        group.forEach(field => patches.set(field.id, { x: this.clamp(left, 0, 1 - field.width) }));
        continue;
      }

      if (mode === 'center') {
        const minLeft = Math.min(...group.map(field => field.x));
        const maxRight = Math.max(...group.map(field => field.x + field.width));
        const center = (minLeft + maxRight) / 2;
        group.forEach(field => patches.set(field.id, { x: this.clamp(center - field.width / 2, 0, 1 - field.width) }));
        continue;
      }

      if (mode === 'right') {
        const right = Math.max(...group.map(field => field.x + field.width));
        group.forEach(field => patches.set(field.id, { x: this.clamp(right - field.width, 0, 1 - field.width) }));
        continue;
      }

      const top = Math.min(...group.map(field => field.y));
      group.forEach(field => patches.set(field.id, { y: this.clamp(top, 0, 1 - field.height) }));
    }

    this.applyFieldPatches(patches);
  }

  distributeSelected(direction: 'horizontal' | 'vertical'): void {
    const groups = this.groupSelectedFieldsByPage(3);
    if (!groups.length) {
      return;
    }

    const patches = new Map<string, Partial<DocumentMappedField>>();
    for (const group of groups) {
      if (direction === 'horizontal') {
        const sorted = [...group].sort((a, b) => a.x - b.x);
        const start = sorted[0].x;
        const end = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
        const totalSize = sorted.reduce((sum, field) => sum + field.width, 0);
        const gap = Math.max((end - start - totalSize) / (sorted.length - 1), 0);

        let cursor = start;
        for (const field of sorted) {
          patches.set(field.id, { x: this.clamp(cursor, 0, 1 - field.width) });
          cursor += field.width + gap;
        }
        continue;
      }

      const sorted = [...group].sort((a, b) => a.y - b.y);
      const start = sorted[0].y;
      const end = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
      const totalSize = sorted.reduce((sum, field) => sum + field.height, 0);
      const gap = Math.max((end - start - totalSize) / (sorted.length - 1), 0);

      let cursor = start;
      for (const field of sorted) {
        patches.set(field.id, { y: this.clamp(cursor, 0, 1 - field.height) });
        cursor += field.height + gap;
      }
    }

    this.applyFieldPatches(patches);
  }

  supportsOptions(type: FormFieldType): boolean {
    return type === 'select' || type === 'radio' || type === 'multiselect';
  }

  getOptionsText(field: DocumentMappedField): string {
    return field.options.join(', ');
  }

  private setSelection(fieldIds: string[]): void {
    const ids = new Set(fieldIds.filter(Boolean));
    const ordered = this.mappedFields.filter(field => ids.has(field.id)).map(field => field.id);
    this.selectedFieldIds = new Set(ordered);
    this.selectedFieldId = ordered[0] ?? null;
  }

  private syncSelectionAfterFieldsChange(): void {
    const currentIds = this.selectedFields.map(field => field.id);
    if (currentIds.length) {
      this.setSelection(currentIds);
      return;
    }

    if (this.selectedFieldId && this.mappedFields.some(field => field.id === this.selectedFieldId)) {
      this.setSelection([this.selectedFieldId]);
      return;
    }

    this.setSelection(this.mappedFields[0] ? [this.mappedFields[0].id] : []);
  }

  private groupSelectedFieldsByPage(minCount = 1): DocumentMappedField[][] {
    const grouped = new Map<number, DocumentMappedField[]>();
    for (const field of this.selectedFields) {
      const list = grouped.get(field.page) ?? [];
      list.push(field);
      grouped.set(field.page, list);
    }
    return Array.from(grouped.values()).filter(group => group.length >= minCount);
  }

  private applyFieldPatches(patches: Map<string, Partial<DocumentMappedField>>): void {
    if (!patches.size) {
      return;
    }
    this.pushHistory();
    this.mappedFields = this.mappedFields.map(field => {
      const patch = patches.get(field.id);
      return patch ? { ...field, ...patch } : field;
    });
    this.syncSelectionAfterFieldsChange();
  }

  private getDraggedFieldIds(event?: DragEvent): string[] {
    if (this.draggedFieldIds.length) {
      return [...this.draggedFieldIds];
    }
    const raw = event?.dataTransfer?.getData('application/x-signly-move-group');
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(item => typeof item === 'string');
    } catch {
      return [];
    }
  }

  private isOutOfBounds(field: DocumentMappedField): boolean {
    return (
      field.width <= 0 ||
      field.height <= 0 ||
      field.x < 0 ||
      field.y < 0 ||
      field.x + field.width > 1 ||
      field.y + field.height > 1
    );
  }

  private hasOverlap(a: DocumentMappedField, b: DocumentMappedField): boolean {
    const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return xOverlap > 0 && yOverlap > 0;
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

  private buildDuplicateFieldName(
    baseName: string,
    fallbackSuffix: number,
    scopeFields: DocumentMappedField[] = this.mappedFields
  ): string {
    const normalized = this.normalizeFieldName(baseName) || `CAMPO_${fallbackSuffix}`;
    const match = normalized.match(/^(.*?)(?:_(\d+))?$/);
    const base = (match?.[1] || normalized).trim() || `CAMPO_${fallbackSuffix}`;
    const escapedBase = this.escapeRegExp(base);
    const pattern = new RegExp(`^${escapedBase}(?:_(\\d+))?$`);

    let max = 1;
    for (const field of scopeFields) {
      const current = this.normalizeFieldName(field.name);
      const currentMatch = current.match(pattern);
      if (!currentMatch) {
        continue;
      }

      const num = Number(currentMatch[1] ?? 1);
      if (Number.isFinite(num) && num > max) {
        max = num;
      }
    }

    return `${base}_${max + 1}`;
  }

  private buildDuplicateFieldLabel(
    baseLabel: string,
    fallbackSuffix: number,
    scopeFields: DocumentMappedField[] = this.mappedFields
  ): string {
    const normalized = (baseLabel || '').trim() || `Campo ${fallbackSuffix}`;
    const match = normalized.match(/^(.*?)(?:\s+(\d+))?$/);
    const base = (match?.[1] || normalized).trim() || `Campo`;
    const escapedBase = this.escapeRegExp(base);
    const pattern = new RegExp(`^${escapedBase}(?:\\s+(\\d+))?$`, 'i');

    let max = 1;
    for (const field of scopeFields) {
      const label = (field.label || '').trim();
      const labelMatch = label.match(pattern);
      if (!labelMatch) {
        continue;
      }

      const num = Number(labelMatch[1] ?? 1);
      if (Number.isFinite(num) && num > max) {
        max = num;
      }
    }

    return `${base} ${max + 1}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private createMappedField(
    type: FormFieldType,
    page: number,
    x: number,
    y: number,
    width: number,
    height: number,
    pageWidth: number,
    pageHeight: number,
    pdfPageWidth: number,
    pdfPageHeight: number
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
      pageHeight,
      pdfPageWidth,
      pdfPageHeight
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
      page.height,
      page.pdfWidth,
      page.pdfHeight
    );
    this.pushHistory();
    this.mappedFields = [...this.mappedFields, field];
    this.setSelection([field.id]);
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
        ? {
            ...f,
            page: pageNumber,
            x: normalizedX,
            y: normalizedY,
            pageWidth: page.width,
            pageHeight: page.height,
            pdfPageWidth: page.pdfWidth,
            pdfPageHeight: page.pdfHeight
          }
        : f
    );
    this.setSelection([fieldId]);
    this.activePageNumber = pageNumber;
  }

  private moveFieldGroupToPage(
    fieldIds: string[],
    anchorFieldId: string,
    pageNumber: number,
    x: number,
    y: number
  ): void {
    const ids = new Set(fieldIds);
    const group = this.mappedFields.filter(field => ids.has(field.id));
    if (group.length < 2) {
      this.moveFieldToPage(anchorFieldId, pageNumber, x, y);
      return;
    }

    const anchor = group.find(field => field.id === anchorFieldId) ?? group[0];
    const page = this.pdfPages.find(item => item.pageNumber === pageNumber);
    if (!anchor || !page) {
      return;
    }

    const anchorX = this.clamp(x - anchor.width / 2, 0, 1 - anchor.width);
    const anchorY = this.clamp(y - anchor.height / 2, 0, 1 - anchor.height);

    const patches = new Map<string, Partial<DocumentMappedField>>();
    for (const field of group) {
      const deltaX = field.x - anchor.x;
      const deltaY = field.y - anchor.y;
      patches.set(field.id, {
        page: pageNumber,
        x: this.clamp(anchorX + deltaX, 0, 1 - field.width),
        y: this.clamp(anchorY + deltaY, 0, 1 - field.height),
        pageWidth: page.width,
        pageHeight: page.height,
        pdfPageWidth: page.pdfWidth,
        pdfPageHeight: page.pdfHeight
      });
    }

    this.applyFieldPatches(patches);
    this.setSelection(group.map(field => field.id));
    this.activePageNumber = pageNumber;
  }

  private placeFieldInDocx(type: FormFieldType): void {
    const size = this.getDefaultFieldSize(type);
    const fieldsOnDocx = this.mappedFields.length;
    const y = this.clamp(0.12 + fieldsOnDocx * 0.06, 0, 0.92);
    const field = this.createMappedField(type, 1, 0.08, y, size.width, size.height, 1000, 1400, 1000, 1400);
    this.pushHistory();
    this.mappedFields = [...this.mappedFields, field];
    this.setSelection([field.id]);
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
    this.setSelection([]);
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
    const pdf = await this.loadPdfDocument(new Uint8Array(arrayBuffer));
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
        pdfWidth: baseViewport.width,
        pdfHeight: baseViewport.height,
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
    this.setSelection([]);
    this.fieldCounter = 0;
    this.undoStack = [];
    this.redoStack = [];

    await this.waitForCanvasElements(pages.length);
    await this.renderPdfPages(currentSession);
  }

  private async loadPdfDocument(data: Uint8Array): Promise<any> {
    try {
      const loadingTask = getDocument({ data });
      return await loadingTask.promise;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const isWorkerIssue =
        message.includes('worker') ||
        message.includes('setting up fake worker') ||
        message.includes('api version') ||
        message.includes('module script');

      if (!isWorkerIssue) {
        throw error;
      }

      const fallbackTask = getDocument({
        data,
        disableWorker: true
      } as any);
      return fallbackTask.promise;
    }
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

  private hasDraggedFiles(event: DragEvent): boolean {
    if (!event.dataTransfer) {
      return false;
    }
    return Array.from(event.dataTransfer.types).includes('Files');
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
