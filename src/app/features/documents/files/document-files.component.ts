import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-files',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-files.component.html'
})
export class DocumentFilesComponent implements OnInit {
  documentId!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('documentId')!;
  }
}