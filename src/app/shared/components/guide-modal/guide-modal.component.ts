import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { GuideStep } from '../../services/guide-flow/guide-flow.service';

@Component({
  selector: 'app-guide-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './guide-modal.component.html'
})
export class GuideModalComponent {
  @Input() title = 'Guia interactiva';
  @Input() subtitle = '';
  @Input() steps: GuideStep[] = [];
  @Input() primaryLabel = 'Empezar';
  @Input() secondaryLabel = 'Ahora no';

  @Output() primary = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  onPrimary(): void {
    this.primary.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
