import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CameraPreviewComponent } from '../../../shared/components/camera-preview/camera-preview.component';

@Component({
  selector: 'app-process-biometric',
  standalone: true,
  imports: [CommonModule, RouterModule, CameraPreviewComponent],
  templateUrl: './process-biometric.component.html'
})
export class ProcessBiometricComponent {
  readonly documentId: string;

  constructor(private route: ActivatedRoute) {
    this.documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
  }

  get nextLink(): string {
    return this.documentId ? `/process/${this.documentId}/verify/dpi` : '/process/demo/verify/dpi';
  }
}
