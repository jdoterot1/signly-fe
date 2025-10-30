import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

type PermissionActionType = 'create' | 'view' | 'edit' | 'delete';

export interface PermissionMatrixAction {
  action: PermissionActionType;
  permission: string;
}

export interface PermissionMatrixRow {
  key: string;
  label: string;
  section?: string;
  actions: PermissionMatrixAction[];
}

interface PermissionMatrixGroup {
  section: string;
  items: PermissionMatrixRow[];
}

@Component({
  selector: 'app-permission-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permission-matrix.component.html'
})
export class PermissionMatrixComponent implements OnChanges {
  @Input() rows: PermissionMatrixRow[] = [];
  @Input() value: string[] = [];
  @Input() showHeader = true;
  @Input() stickyHeader = true;
  @Input() maxHeight = '420px';

  @Output() valueChange = new EventEmitter<string[]>();

  readonly actionsOrder: PermissionActionType[] = ['create', 'view', 'edit', 'delete'];

  groupedRows: PermissionMatrixGroup[] = [];
  allPermissions: string[] = [];
  private selected = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.buildGroups();
      this.allPermissions = this.rows
        .flatMap(row => row.actions.map(action => action.permission))
        .filter((permission): permission is string => !!permission);
    }
    if (changes['value']) {
      this.selected = new Set(this.value || []);
    }
  }

  toggle(rowKey: string, action: PermissionActionType): void {
    const permission = this.getPermission(rowKey, action);
    if (!permission) {
      return;
    }

    if (this.selected.has(permission)) {
      this.selected.delete(permission);
    } else {
      this.selected.add(permission);
    }
    this.valueChange.emit(Array.from(this.selected));
  }

  selectAll(): void {
    this.selected = new Set(this.allPermissions);
    this.valueChange.emit(Array.from(this.selected));
  }

  deselectAll(): void {
    this.selected.clear();
    this.valueChange.emit([]);
  }

  isActive(rowKey: string, action: PermissionActionType): boolean {
    const permission = this.getPermission(rowKey, action);
    return permission ? this.selected.has(permission) : false;
  }

  trackByRow = (_: number, row: PermissionMatrixRow) => row.key;

  getCircleClass(rowKey: string, action: PermissionActionType): string {
    const base =
      'h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200 cursor-pointer';
    const active = this.isActive(rowKey, action);
    const color = this.getActionColor(action);

    if (!this.getPermission(rowKey, action)) {
      return `${base} cursor-not-allowed bg-gray-100 text-gray-300`;
    }

    return active
      ? `${base} ${color} text-white shadow-md`
      : `${base} border border-gray-300 text-gray-400 hover:border-gray-400`;
  }

  getMobileButtonClass(rowKey: string, action: PermissionActionType): string {
    const base =
      'flex-1 mx-1 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200';
    const active = this.isActive(rowKey, action);
    const color = this.getActionColor(action);

    if (!this.getPermission(rowKey, action)) {
      return `${base} cursor-not-allowed bg-gray-100 text-gray-300`;
    }

    return active
      ? `${base} ${color} text-white shadow`
      : `${base} border border-gray-300 text-gray-500`;
  }

  private getPermission(rowKey: string, action: PermissionActionType): string | undefined {
    const row = this.rows.find(item => item.key === rowKey);
    return row?.actions.find(a => a.action === action)?.permission;
  }

  private getActionColor(action: PermissionActionType): string {
    switch (action) {
      case 'create':
        return 'bg-yellow-500';
      case 'view':
        return 'bg-green-500';
      case 'edit':
        return 'bg-gray-800';
      case 'delete':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  private buildGroups(): void {
    const groupsMap = new Map<string, PermissionMatrixRow[]>();
    this.rows.forEach(row => {
      const section = row.section || 'General';
      if (!groupsMap.has(section)) {
        groupsMap.set(section, []);
      }
      groupsMap.get(section)!.push(row);
    });

    this.groupedRows = Array.from(groupsMap.entries()).map(([section, items]) => ({
      section,
      items
    }));
  }
}
