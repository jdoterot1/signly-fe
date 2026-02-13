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
import { TooltipModule } from 'primeng/tooltip';
import {
  TableModel,
  TableConfig,
  TableColumn,
  TableCellAction,
} from './table.model';
import { TableFiltersModalComponent } from './table-filters-modal.component';
import { IconComponent } from "../icon/icon.component";

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
  imports: [CommonModule, FormsModule, TooltipModule, TableFiltersModalComponent, IconComponent],
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
    sortDir: 'desc',
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
    Completado: 'bg-[#4FD1A5]', 
    Active: 'bg-[#4FD1A5]',          // verde medio
    Inactive: 'bg-[#E35D5D]',        // rojo medio
    Unresolved: 'bg-[#FFB347]',      // naranja medio
    Pendiente: 'bg-[#FFB347]',
    Pagada: 'bg-[#4FD1A5]',
    Emitida: 'bg-[#3366FF]',
    Cancelada: 'bg-[#E35D5D]',
    Fallida: 'bg-[#E35D5D]',
    Creado: 'bg-emerald-100 text-emerald-800',
    'En proceso': 'bg-amber-100 text-amber-800',
    Cancelado: 'bg-rose-100 text-rose-800',
    Expirado: 'bg-slate-200 text-slate-700',
    CREATED: 'bg-emerald-100 text-emerald-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-sky-100 text-sky-800',
    CANCELLED: 'bg-rose-100 text-rose-800',
    EXPIRED: 'bg-slate-200 text-slate-700',
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
    return this.state.sortDir === 'desc' ? 'Más recientes' : 'Más antiguos';
  }

  // alterna orden asc/desc
  onSortToggle(): void {
    if (!this.state.sortBy) {
      const preferredColumn = this.columns.find(
        col => (col.visible ?? true) && col.sortable && col.key === 'creationDate'
      );
      const fallbackSortable = this.columns.find(col => (col.visible ?? true) && col.sortable);
      this.state.sortBy = preferredColumn?.key ?? fallbackSortable?.key;
      this.state.sortDir = 'desc';
      this.applyFilters();
      return;
    }
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
        const cmp = this.compareValues(aRaw, bRaw, key);
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
      this.state.sortDir = 'desc';
    }
    this.applyFilters();
  }

  private compareValues(aRaw: unknown, bRaw: unknown, key: string): number {
    const aDate = this.toTimestamp(aRaw, key);
    const bDate = this.toTimestamp(bRaw, key);
    if (Number.isFinite(aDate) && Number.isFinite(bDate)) {
      return aDate - bDate;
    }

    const aNum = Number(aRaw);
    const bNum = Number(bRaw);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return aNum - bNum;
    }

    return String(aRaw ?? '').localeCompare(String(bRaw ?? ''), 'es', { sensitivity: 'base' });
  }

  private toTimestamp(value: unknown, key: string): number {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value !== 'string') {
      return Number.NaN;
    }

    const raw = value.trim();
    if (!raw) {
      return Number.NaN;
    }

    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    // Handles es-CO date strings: dd/mm/yyyy or dd/mm/yyyy, hh:mm
    const esDateMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}))?$/);
    if (esDateMatch) {
      const [, dd, mm, yyyy, hh = '00', min = '00'] = esDateMatch;
      const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0, 0);
      return dt.getTime();
    }

    if (key.toLowerCase().includes('date')) {
      return Number.NaN;
    }

    return Number.NaN;
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

  columnMinWidth(col: TableColumn): string {
    if (col.width?.trim()) {
      return col.width;
    }

    if (col.columnType === 'action') {
      return '120px';
    }

    switch (col.key) {
      case 'status':
        return '120px';
      case 'creationDate':
      case 'updatedAt':
      case 'date':
        return '150px';
      case 'description':
        return '220px';
      case 'createdBy':
      case 'actor':
      case 'resource':
      case 'path':
        return '180px';
      default:
        return '150px';
    }
  }

  truncateLimitForKey(key: string): number | null {
    switch (key) {
      case 'description':
      case 'createdBy':
        return 10;
      case 'path':
      case 'actor':
      case 'resource':
        return 10;
      default:
        return null;
    }
  }

  isTruncatableKey(key: string): boolean {
    return this.truncateLimitForKey(key) !== null;
  }

  asText(value: unknown): string {
    return value == null ? '' : String(value);
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
