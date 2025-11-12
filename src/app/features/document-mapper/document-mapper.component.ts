import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';

import {
  DocumentMapperService,
  DocumentConversionResult
} from '../../core/services/document-mapper/document-mapper.service';
import { FIELD_TYPES } from '../../core/constants/form-builder/field-types.constant';
import type { FormFieldType } from '../../core/models/form-builder/field.model';

type QuillToolbar =
  | string
  | Record<string, unknown>
  | (string | Record<string, unknown>)[];

@Component({
  selector: 'app-document-mapper',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-mapper.component.html',
  styleUrl: './document-mapper.component.css'
})
export class DocumentMapperComponent implements OnDestroy {
  private quillEditorRef?: ElementRef<HTMLDivElement>;

  @ViewChild('quillEditor')
  set quillEditor(value: ElementRef<HTMLDivElement> | undefined) {
    if (value?.nativeElement === this.quillEditorRef?.nativeElement) {
      return;
    }

    this.destroyQuill();
    this.quillEditorRef = value;

    if (this.quillEditorRef) {
      this.initQuill();
    }
  }

  private readonly fb = inject(FormBuilder);
  private readonly mapperService = inject(DocumentMapperService);
  private readonly sanitizer = inject(DomSanitizer);

  form = this.fb.nonNullable.group({
    documentName: ['', [Validators.required, Validators.maxLength(120)]]
  });

  loading = false;
  dragActive = false;
  selectedFile?: File;
  conversionWarnings: string[] = [];
  metadata?: DocumentConversionResult['metadata'];
  previewHtml?: SafeHtml;
  errorMessage = '';
  editorDropActive = false;

  private pendingHtml = '';
  private quill?: Quill;
  private readonly toolbarOptions: QuillToolbar[] = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ];

  private readonly textChangeHandler = () => {
    if (!this.quill) {
      return;
    }
    const html = this.quill.root.innerHTML;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  };
  readonly fieldPalette = FIELD_TYPES;
  private draggedFieldType?: FormFieldType;

  ngOnDestroy(): void {
    this.destroyQuill();
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
    if (!this.canHandleDrop(event)) {
      return;
    }
    event.preventDefault();
    this.editorDropActive = true;
    this.updateCursorFromEvent(event);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onEditorDragLeave(event: DragEvent): void {
    if (!this.belongsToEditor(event)) {
      this.editorDropActive = false;
    }
  }

  onEditorDrop(event: DragEvent): void {
    if (!this.canHandleDrop(event)) {
      return;
    }
    event.preventDefault();
    this.editorDropActive = false;

    const type = this.getDragType(event);
    if (!type) {
      return;
    }
    const dropIndex = this.updateCursorFromEvent(event);
    this.insertFieldPlaceholder(type, dropIndex);
  }

  onPaletteClick(type: FormFieldType): void {
    this.insertFieldPlaceholder(type);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
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
    this.conversionWarnings = [];

    try {
      this.selectedFile = file;
      const suggestedName = file.name.replace(/\.[^.]+$/, '');
      this.form.patchValue({ documentName: suggestedName });

      const result = await this.mapperService.convertFileToHtml(file);
      this.metadata = result.metadata;
      this.conversionWarnings = result.warnings;
      this.setEditorContent(result.content);
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo procesar el archivo.';
      this.selectedFile = undefined;
    } finally {
      this.loading = false;
    }
  }

  clearDocument(): void {
    this.selectedFile = undefined;
    this.conversionWarnings = [];
    this.metadata = undefined;
    this.errorMessage = '';
    this.form.reset();
    this.setEditorContent('<p></p>');
  }

  downloadHtml(): void {
    const name = this.form.controls.documentName.value?.trim() || 'documento-mapeado';
    const html = this.quill?.root.innerHTML ?? '';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private initQuill(): void {
    if (!this.quillEditorRef) {
      return;
    }

    this.quill = new Quill(this.quillEditorRef.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: this.toolbarOptions,
        history: {
          delay: 1500,
          maxStack: 150,
          userOnly: true
        }
      }
    });

    this.quill.on('text-change', this.textChangeHandler);

    if (this.pendingHtml) {
      this.setEditorContent(this.pendingHtml);
      this.pendingHtml = '';
    } else {
      this.setEditorContent('<p></p>');
    }
  }

  private destroyQuill(): void {
    if (!this.quill) {
      return;
    }

    this.quill.off('text-change', this.textChangeHandler);
    this.quill = undefined;
  }

  private setEditorContent(html: string): void {
    if (!this.quill) {
      this.pendingHtml = html;
      return;
    }

    const delta = this.quill.clipboard.convert({ html: html || '<p></p>' });
    this.quill.setContents(delta, 'silent');
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(
      this.quill.root.innerHTML
    );
  }

  private canHandleDrop(event: DragEvent): boolean {
    const type = this.getDragType(event);
    return Boolean(type && this.quill && this.isEventInsideEditor(event));
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

  private belongsToEditor(event: DragEvent): boolean {
    if (!this.quillEditorRef) {
      return false;
    }
    const target = (event.relatedTarget ?? event.target) as Node | null;
    return !!target && this.quillEditorRef.nativeElement.contains(target);
  }

  private isEventInsideEditor(event: DragEvent): boolean {
    if (!this.quillEditorRef) {
      return false;
    }
    const target = event.target as Node | null;
    return !!target && this.quillEditorRef.nativeElement.contains(target);
  }

  private insertFieldPlaceholder(type: FormFieldType, atIndex?: number): void {
    if (!this.quill) {
      this.pendingHtml = `${this.pendingHtml}${this.buildPlaceholderSpan(type)}`;
      return;
    }

    const placeholder = this.buildPlaceholder(type);
    const index = atIndex ?? this.quill.getSelection(true)?.index ?? this.quill.getLength();
    this.quill.focus();
    this.quill.insertText(
      index,
      placeholder,
      {
        bold: true,
        color: '#4338ca',
        background: '#eef2ff'
      },
      Quill.sources.USER
    );
    this.quill.setSelection(index + placeholder.length, 0, 'silent');
  }

  private buildPlaceholder(type: FormFieldType): string {
    const item = this.fieldPalette.find(ft => ft.type === type);
    const slug = this.slugify(item?.label || type);
    return `{{${slug}}}`;
  }

  private buildPlaceholderSpan(type: FormFieldType): string {
    const placeholder = this.buildPlaceholder(type);
    return `<strong style="color:#4338ca;background:#eef2ff;">${placeholder}</strong>`;
  }

  private updateCursorFromEvent(event: DragEvent): number | undefined {
    if (!this.quill) {
      return undefined;
    }

    const nativeRange = this.getNativeRangeFromPoint(event);
    if (!nativeRange) {
      return undefined;
    }

    const root = this.quill.root;
    if (!root.contains(nativeRange.startContainer)) {
      return undefined;
    }

    const selectionModule = this.quill.getModule('selection') as {
      setNativeRange: (
        startNode: Node,
        startOffset: number,
        endNode?: Node,
        endOffset?: number
      ) => void;
    };

    selectionModule?.setNativeRange(
      nativeRange.startContainer,
      nativeRange.startOffset,
      nativeRange.startContainer,
      nativeRange.startOffset
    );

    return this.quill.getSelection(true)?.index;
  }

  private getNativeRangeFromPoint(event: DragEvent): Range | null {
    const doc = this.quill?.root.ownerDocument || document;
    const anyDoc = doc as any;
    if (typeof anyDoc.caretRangeFromPoint === 'function') {
      return anyDoc.caretRangeFromPoint(event.clientX, event.clientY) ?? null;
    }

    if (typeof anyDoc.caretPositionFromPoint === 'function') {
      const position = anyDoc.caretPositionFromPoint(event.clientX, event.clientY);
      if (position) {
        const range = doc.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
        return range;
      }
    }

    return null;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
