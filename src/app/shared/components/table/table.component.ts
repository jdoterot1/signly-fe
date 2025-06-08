// src/app/shared/components/table/table.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { TableColumn, TableData } from '../../models/table.model';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './table.component.html'
})
export class TableComponent<T = TableData> {
  @Input() columns: TableColumn<T>[] = [];
  @Input() data:    T[]              = [];
}
