// src/app/shared/table/table.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TableModel,
  TableConfig,
  TableColumn,
  TableCellAction,
} from './table.model';
import { TableFiltersModalComponent } from './table-filters-modal.component';

interface TableState<T> {
  filteredData: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pages: number[];
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TableFiltersModalComponent],
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<T = any> implements OnChanges {
  @Input() model!: TableModel<T>;
  @Output() selectionChange = new EventEmitter<T[]>();
  @Output() create        = new EventEmitter<void>();

  searchTerm = '';
  // valores de filtro aplicados
  columnFilters: Record<string, string> = {};
  // control modal de filtros
  isFiltersModalOpen = false;
  modalColumnFilters: Record<string, string> = {};

  // status interno: orden, paginado, datos filtrados
  state: {
    sortBy?: string;
    sortDir: 'asc' | 'desc';
    data: TableState<T>;
  } = {
    sortBy: undefined,
    sortDir: 'asc',
    data: { filteredData: [], currentPage: 1, totalPages: 0, totalItems: 0, pages: [] },
  };

  // selección de filas
  selectAll = false;
  private selected = new Set<T>();

  // statusClasses con colores más suaves pero aún definidos
  statusClasses: Record<string, string> = {
    Pending: 'bg-[#E35D5D]',         // rojo medio
    'In Progress': 'bg-[#FFB347]',   // naranja medio
    Completed: 'bg-[#4FD1A5]',       // verde medio
    Active: 'bg-[#4FD1A5]',          // verde medio
    Inactive: 'bg-[#E35D5D]',        // rojo medio
    Unresolved: 'bg-[#FFB347]',      // naranja medio
    Pendiente: 'bg-[#FFB347]',
    Pagada: 'bg-[#4FD1A5]',
    Emitida: 'bg-[#3366FF]',
    Cancelada: 'bg-[#E35D5D]',
    Fallida: 'bg-[#E35D5D]',
  };


  ngOnChanges(changes: SimpleChanges): void {
    if ('model' in changes) {
      this.resetState();
      this.applyFilters();
    }
  }

  // getters rápidos
  get config(): TableConfig {
    return this.model.tableConfig;
  }
  get columns(): TableColumn[] {
    return this.model.columns;
  }
  get filterableColumns(): TableColumn[] {
    return this.columns.filter(col => (col.visible ?? true) && col.columnType !== 'action');
  }
  get data(): T[] {
    return this.model.data;
  }
  get sortLabel(): string {
    return this.state.sortDir === 'asc' ? 'Newest' : 'Oldest';
  }

  // alterna orden asc/desc
  onSortToggle(): void {
    this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  // muestra/oculta la fila de inputs de filtro
  openFiltersModal(): void {
    this.modalColumnFilters = { ...this.columnFilters };
    this.isFiltersModalOpen = true;
  }

  closeFiltersModal(): void {
    this.isFiltersModalOpen = false;
  }

  applyFiltersFromModal(): void {
    this.columnFilters = { ...this.modalColumnFilters };
    this.resetState();
    this.applyFilters();
    this.closeFiltersModal();
  }

  clearModalFilters(): void {
    this.modalColumnFilters = {};
  }

  clearAllFilters(): void {
    this.modalColumnFilters = {};
    this.columnFilters = {};
    this.resetState();
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return Object.values(this.columnFilters).some(value => !!value?.toString().trim());
  }

  private resetState(): void {
    this.state.data.currentPage = 1;
    this.selectAll = false;
    this.selected.clear();
    this.emitSelection();
  }

  applyFilters(): void {
    let list = [...this.data];

    // 1) búsqueda global
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        this.columns.some(c =>
          String((r as any)[c.key]).toLowerCase().includes(term)
        )
      );
    }

    // 2) filtros por columna
    Object.entries(this.columnFilters).forEach(([key, val]) => {
      const term = val?.toString().toLowerCase().trim();
      if (term) {
        list = list.filter(r =>
          String((r as any)[key]).toLowerCase().includes(term)
        );
      }
    });

    // 3) ordenamiento
    if (this.state.sortBy) {
      const key = this.state.sortBy;
      list.sort((a, b) => {
        const aRaw = (a as any)[key];
        const bRaw = (b as any)[key];
        const aNum = parseFloat(aRaw);
        const bNum = parseFloat(bRaw);
        let cmp: number;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          cmp = aNum - bNum;
        } else {
          cmp = String(aRaw ?? '').localeCompare(String(bRaw ?? ''));
        }
        return this.state.sortDir === 'asc' ? cmp : -cmp;
      });
    }

    // 4) paginación
    const total = list.length;
    const perPage = this.config.pageSize;
    const totalPages = Math.ceil(total / perPage) || 1;
    const current = Math.max(1, Math.min(this.state.data.currentPage, totalPages));
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = (current - 1) * perPage;
    const sliced = list.slice(start, start + perPage);

    this.state.data = {
      filteredData: sliced,
      currentPage: current,
      totalPages,
      totalItems: total,
      pages,
    };
  }

  onSearchTermChange(): void {
    this.resetState();
    this.applyFilters();
  }

  onSortOptionChange(column: TableColumn): void {
    if (!column.sortable) return;
    if (this.state.sortBy === column.key) {
      this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortBy = column.key;
      this.state.sortDir = 'asc';
    }
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.state.data.totalPages) return;
    this.state.data.currentPage = page;
    this.applyFilters();
  }
  prevPage(): void {
    if (this.state.data.currentPage > 1) {
      this.goToPage(this.state.data.currentPage - 1);
    }
  }
  nextPage(): void {
    if (this.state.data.currentPage < this.state.data.totalPages) {
      this.goToPage(this.state.data.currentPage + 1);
    }
  }

  toggleRow(row: T): void {
    if (this.selected.has(row)) {
      this.selected.delete(row);
    } else {
      if (this.config.rowSelectionMode === 'single') {
        this.selected.clear();
      }
      this.selected.add(row);
    }
    this.updateSelectAllState();
    this.emitSelection();
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.selected.clear();
    if (this.selectAll) {
      this.state.data.filteredData.forEach(r => this.selected.add(r));
    }
    this.emitSelection();
  }

  isSelected(row: T): boolean {
    return this.selected.has(row);
  }

  private updateSelectAllState(): void {
    this.selectAll =
      this.state.data.filteredData.every(r => this.selected.has(r)) &&
      this.state.data.filteredData.length > 0;
  }

  private emitSelection(): void {
    this.selectionChange.emit(Array.from(this.selected));
  }

  onCreate(): void {
    this.create.emit();
  }

  onActionClick(action: TableCellAction, row: T, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    action.handler(row);
  }

  trackByFn(index: number, row: T): any {
    const cfg = this.model?.tableConfig;
    const key = cfg?.trackByField;
    return cfg && key && (row as any)[key] != null ? (row as any)[key] : index;
  }

  getCellValue(row: T, key: string): any {
    return (row as any)?.[key];
  }

  visibleColumnsCount(): number {
    return this.columns.filter(c => c.visible ?? true).length;
  }

  isActionDisabled(action: TableCellAction, row: T): boolean {
    return typeof action.disabled === 'function'
      ? action.disabled(row)
      : !!action.disabled;
  }
}
