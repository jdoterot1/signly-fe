import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-process-preview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './process-preview.component.html'
})
export class ProcessPreviewComponent {
  readonly documentId: string;

  constructor(private route: ActivatedRoute) {
    this.documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
  }

  get nextLink(): string {
    return this.documentId ? `/process/${this.documentId}/complete` : '/process/demo/complete';
  }
}
