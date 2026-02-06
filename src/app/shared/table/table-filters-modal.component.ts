import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TableColumn } from './table.model';

@Component({
  selector: 'app-table-filters-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-filters-modal.component.html'
})
export class TableFiltersModalComponent {
  @Input() visible = false;
  @Input() columns: TableColumn[] = [];
  @Input() values: Record<string, string> = {};
  @Input() hasActiveFilters = false;

  @Output() close = new EventEmitter<void>();
  @Output() clearFields = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() apply = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onClearFields(): void {
    this.clearFields.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onApply(): void {
    this.apply.emit();
  }

  trackByKey(index: number, column: TableColumn): string {
    return column.key ?? `${index}`;
  }
}
