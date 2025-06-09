import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DocumentService } from '../../../core/services/documents/document.service';
import { Document } from '../../../core/models/documents/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './document-list.component.html'
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  filteredDocs: Document[] = [];

  // filtros y orden
  searchTerm = '';
  sortOption: 'newest' | 'oldest' = 'newest';

  // paginación
  currentPage = 1;
  pageSize = 8;
  totalPages = 0;
  totalItems = 0;
  pages: number[] = [];

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments() {
    this.documentService.getAllDocuments().subscribe(docs => {
      this.documents = docs;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let docs = [...this.documents];

    // 1) filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      docs = docs.filter(doc =>
        doc.name.toLowerCase().includes(term) ||
        (!!doc.description && doc.description.toLowerCase().includes(term)) ||
        doc.createdBy.toLowerCase().includes(term)
      );
    }

    // 2) orden
    docs.sort((a, b) =>
      this.sortOption === 'newest'
        ? b.creationDate.getTime() - a.creationDate.getTime()
        : a.creationDate.getTime() - b.creationDate.getTime()
    );

    // 3) paginación
    this.totalItems = docs.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredDocs = docs.slice(start, start + this.pageSize);
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

  deleteDocument(doc: Document): void {
    if (confirm(`¿Seguro que deseas eliminar "${doc.name}"?`)) {
      this.documentService.deleteDocument(doc.id).subscribe(() => {
        this.loadDocuments();
      });
    }
  }
}
