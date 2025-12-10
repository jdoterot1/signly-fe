import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  EventEmitter,
  Output,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DocumentMapperService } from '../../core/services/document-mapper/document-mapper.service';
import { FIELD_TYPES } from '../../core/constants/form-builder/field-types.constant';
import type { FormFieldType } from '../../core/models/form-builder/field.model';

@Component({
  selector: 'app-document-mapper',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-mapper.component.html',
  styleUrl: './document-mapper.component.css'
})
export class DocumentMapperComponent implements OnDestroy {
  private editorCanvas?: ElementRef<HTMLDivElement>;

  @ViewChild('fileInput')
  private fileInputRef?: ElementRef<HTMLInputElement>;

  @ViewChild('editorCanvas')
  set editorCanvasRef(value: ElementRef<HTMLDivElement> | undefined) {
    if (value === this.editorCanvas) {
      return;
    }
    this.editorCanvas = value;
    if (this.editorCanvas) {
      this.renderDocumentHtml();
    }
  }

  private readonly fb = inject(FormBuilder);
  private readonly mapperService = inject(DocumentMapperService);

  form = this.fb.nonNullable.group({
    documentName: ['', [Validators.required, Validators.maxLength(120)]]
  });

  loading = false;
  editorDropActive = false;
  @Output() fileSelected = new EventEmitter<File | undefined>();

  selectedFile?: File;
  errorMessage = '';
  readonly fieldPalette = FIELD_TYPES;

  private documentHtml = '<p></p>';
  private currentRange?: Range | null;
  private draggedFieldType?: FormFieldType;

  ngOnDestroy(): void {
    // Nothing to clean up for now
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

  onEditorDragOver(event: DragEvent): void {
    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    event.preventDefault();
    this.editorDropActive = true;
    const range = this.getRangeFromPoint(event.clientX, event.clientY);
    if (range) {
      this.currentRange = range;
    }
  }

  onEditorDragLeave(event: DragEvent): void {
    if (!this.isEventInsideEditor(event)) {
      this.editorDropActive = false;
    }
  }

  onEditorDrop(event: DragEvent): void {
    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    event.preventDefault();
    this.editorDropActive = false;
    const dropRange = this.getRangeFromPoint(event.clientX, event.clientY);
    if (dropRange) {
      this.currentRange = dropRange;
    }
    this.insertFieldPlaceholder(type);
  }

  onPaletteClick(type: FormFieldType): void {
    this.insertFieldPlaceholder(type);
  }

  onEditorInput(): void {
    this.captureSelection();
    this.syncDocumentHtml();
  }

  onEditorSelectionChange(): void {
    this.captureSelection();
  }

  onEditorFocus(): void {
    this.captureSelection();
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

      const result = await this.mapperService.convertFileToHtml(file);
      this.setEditorContent(result.content);
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo procesar el archivo.';
      this.selectedFile = undefined;
      this.fileSelected.emit(undefined);
      this.setEditorContent('<p></p>');
    } finally {
      this.loading = false;
    }
  }

  clearDocument(): void {
    this.selectedFile = undefined;
    this.fileSelected.emit(undefined);
    this.errorMessage = '';
    this.form.reset();
    this.documentHtml = '<p></p>';
    this.renderDocumentHtml();
    this.currentRange = undefined;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  downloadHtml(): void {
    const name = this.form.controls.documentName.value?.trim() || 'documento-mapeado';
    const html = this.editorCanvas?.nativeElement.innerHTML ?? this.documentHtml;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  private setEditorContent(html: string): void {
    this.documentHtml = html && html.trim().length ? html : '<p></p>';
    this.renderDocumentHtml();
    this.captureSelection();
    this.syncDocumentHtml();
  }

  private renderDocumentHtml(): void {
    if (!this.editorCanvas) {
      return;
    }
    this.editorCanvas.nativeElement.innerHTML = this.documentHtml;
  }

  private captureSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.currentRange = undefined;
      return;
    }
    const range = selection.getRangeAt(0);
    if (this.editorCanvas?.nativeElement.contains(range.commonAncestorContainer)) {
      this.currentRange = range;
    }
  }

  private syncDocumentHtml(): void {
    if (this.editorCanvas) {
      this.documentHtml = this.editorCanvas.nativeElement.innerHTML;
    }
  }

  private insertFieldPlaceholder(type: FormFieldType): void {
    const placeholder = document.createElement('span');
    placeholder.textContent = this.buildPlaceholder(type);
    placeholder.className = 'placeholder-chip';
    this.insertNodeAtRange(placeholder);
  }

  private insertNodeAtRange(node: Node): void {
    const editorElement = this.editorCanvas?.nativeElement;
    if (!editorElement) {
      return;
    }

    editorElement.focus({ preventScroll: true });

    let range = this.currentRange;
    if (!range || !editorElement.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false);
    }

    range.deleteContents();
    range.insertNode(node);
    this.placeCaretAfter(node);
    this.syncDocumentHtml();
  }

  private placeCaretAfter(node: Node): void {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.currentRange = range;
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

  private getRangeFromPoint(x: number, y: number): Range | null {
    const doc = this.editorCanvas?.nativeElement.ownerDocument || document;
    const anyDoc = doc as any;
    if (typeof anyDoc.caretRangeFromPoint === 'function') {
      return anyDoc.caretRangeFromPoint(x, y) ?? null;
    }
    if (typeof anyDoc.caretPositionFromPoint === 'function') {
      const position = anyDoc.caretPositionFromPoint(x, y);
      if (position) {
        const range = doc.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
        return range;
      }
    }
    return null;
  }

  private isEventInsideEditor(event: DragEvent): boolean {
    const editorElement = this.editorCanvas?.nativeElement;
    if (!editorElement) {
      return false;
    }
    const target = (event.relatedTarget ?? event.target) as Node | null;
    return !!target && editorElement.contains(target);
  }

  private buildPlaceholder(type: FormFieldType): string {
    const item = this.fieldPalette.find(ft => ft.type === type);
    const slug = (item?.label || type)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `{{${slug}}}`;
  }
}
