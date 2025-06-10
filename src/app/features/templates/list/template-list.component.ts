import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterModule }      from '@angular/router';
import { FormsModule }       from '@angular/forms';

import { TemplateService }   from '../../../core/services/templates/template.service';
import { Template }          from '../../../core/models/templates/template.model';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './template-list.component.html'
})
export class TemplateListComponent implements OnInit {
  templates: Template[] = [];
  filteredTemplates: Template[] = [];

  // filters & sort
  searchTerm = '';
  sortOption: 'newest' | 'oldest' = 'newest';

  // pagination
  currentPage = 1;
  pageSize = 8;
  totalPages = 0;
  totalItems = 0;
  pages: number[] = [];

  constructor(private templateService: TemplateService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  private loadTemplates() {
    this.templateService.getAllTemplates().subscribe(list => {
      this.templates = list;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let list = [...this.templates];

    // 1) search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(term) ||
        (!!t.description && t.description.toLowerCase().includes(term)) ||
        t.createdBy.toLowerCase().includes(term)
      );
    }

    // 2) sort
    list.sort((a, b) =>
      this.sortOption === 'newest'
        ? b.creationDate.getTime() - a.creationDate.getTime()
        : a.creationDate.getTime() - b.creationDate.getTime()
    );

    // 3) pagination
    this.totalItems  = list.length;
    this.totalPages  = Math.ceil(this.totalItems / this.pageSize);
    this.pages       = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredTemplates = list.slice(startIndex, startIndex + this.pageSize);
  }

  onSearchTermChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortOptionChange(option: 'newest' | 'oldest'): void {
    this.sortOption = option;
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  deleteTemplate(tpl: Template): void {
    if (confirm(`¿Seguro que deseas eliminar "${tpl.name}"?`)) {
      this.templateService.deleteTemplate(tpl.id).subscribe(() => {
        this.loadTemplates();
      });
    }
  }
}
