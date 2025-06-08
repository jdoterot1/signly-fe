import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-detail.component.html'
})
export class DocumentDetailComponent implements OnInit {
  documentId!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('documentId')!;
  }
}