import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CameraPreviewComponent } from '../../../shared/components/camera-preview/camera-preview.component';

@Component({
  selector: 'app-process-facial',
  standalone: true,
  imports: [CommonModule, RouterModule, CameraPreviewComponent],
  templateUrl: './process-facial.component.html'
})
export class ProcessFacialComponent {
  readonly documentId: string;

  constructor(private route: ActivatedRoute) {
    this.documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
  }

  get nextLink(): string {
    return this.documentId ? `/process/${this.documentId}/preview` : '/process/demo/preview';
  }
}
