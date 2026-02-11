import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CameraPreviewComponent } from '../../../shared/components/camera-preview/camera-preview.component';

@Component({
  selector: 'app-process-dpi',
  standalone: true,
  imports: [CommonModule, RouterModule, CameraPreviewComponent],
  templateUrl: './process-dpi.component.html'
})
export class ProcessDpiComponent {
  readonly documentId: string;
  currentSide: 'front' | 'back' = 'front';

  constructor(private route: ActivatedRoute) {
    this.documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
  }

  setSide(side: 'front' | 'back'): void {
    this.currentSide = side;
  }

  get nextLink(): string {
    return this.documentId ? `/process/${this.documentId}/verify/facial` : '/process/demo/verify/facial';
  }

  get progressWidth(): string {
    return this.currentSide === 'front' ? '50%' : '100%';
  }

  get heading(): string {
    return this.currentSide === 'front' ? 'Captura del documento (Frente)' : 'Captura del documento (Trasera)';
  }
}
