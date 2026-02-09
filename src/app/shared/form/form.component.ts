// src/app/shared/form/form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleButton } from 'primeng/togglebutton';
import { PasswordModule } from 'primeng/password';
import { DatePicker } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';

import { FormConfig, FormField } from './form.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    ToggleButton,
    PasswordModule,
    DatePicker,
    TextareaModule
  ],
  templateUrl: './form.component.html'
})
export class FormComponent implements OnInit, OnChanges {
  @Input() config!: FormConfig;
  @Input() form!: FormGroup;
  @Input() initialData: any; // <-- NUEVO INPUT para precargar datos

  @Input() showImageUpload = false;
  @Input() extraTemplate: TemplateRef<unknown> | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() cancelLabel = 'Cancelar';
  @Output() fileSelected = new EventEmitter<File>();
  @Output() submitForm  = new EventEmitter<any>();
  @Output() cancelForm  = new EventEmitter<void>();

  imagePreview: string | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    if (!this.form) {
      this.form = this.buildFormGroup(this.config.fields);
    }

    // Cargar datos iniciales si existen
    if (this.initialData) {
      this.form.patchValue(this.initialData);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']?.currentValue && !changes['form'].previousValue && !this.form) {
      this.form = changes['form'].currentValue as FormGroup;
    }

    if (changes['initialData'] && this.form && this.initialData) {
      this.form.patchValue(this.initialData, { emitEvent: false });
    }
  }

  private buildFormGroup(fields: FormField[]): FormGroup {
    const group: any = {};
    fields.forEach(field => {
      const validators = [...(field.validators || [])];
      if (field.required) validators.push(Validators.required);

      if (field.type === 'group' && field.children) {
        group[field.key] = this.buildFormGroup(field.children);
      } else {
        group[field.key] = this.fb.control({ value: '', disabled: field.disabled ?? false }, validators);
      }
    });
    return this.fb.group(group);
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileSelected.emit(file);
      this.form.get('image')?.setValue(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.form.get('image')?.setValue(null);
    this.imagePreview = null;
    this.fileInput.nativeElement.value = '';
  }

  onSubmit() {
    if (this.form.valid) {
      this.submitForm.emit(this.form.getRawValue());
    } else {
      this.form.markAllAsTouched();
    }
  }

  getGroup(field: FormField): FormGroup {
    return this.form.get(field.key) as FormGroup;
  }
}
