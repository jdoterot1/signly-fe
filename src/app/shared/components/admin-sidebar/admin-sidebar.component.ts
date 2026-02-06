import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export interface AdminSidebarItem {
  label: string;
  icon?: string;
}

export interface AdminSidebarSection {
  label: string;
  items: AdminSidebarItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.component.html'
})
export class AdminSidebarComponent implements OnChanges {
  @Input() ownerName = '';
  @Input() accountId = '';
  @Input() sections: AdminSidebarSection[] = [];
  @Input() selectedOption = '';

  @Output() optionSelected = new EventEmitter<string>();

  openSections: Record<string, boolean> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sections']) {
      this.buildOpenSections();
    }
  }

  selectOption(label: string): void {
    this.optionSelected.emit(label);
  }

  toggleSection(section: AdminSidebarSection): void {
    this.openSections[section.label] = !this.openSections[section.label];
  }

  isSectionOpen(section: AdminSidebarSection): boolean {
    return this.openSections[section.label];
  }

  isOptionSelected(label: string): boolean {
    return this.selectedOption === label;
  }

  private buildOpenSections(): void {
    this.openSections = this.sections.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.label] = true;
      return acc;
    }, {});
  }
}
