import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-detail-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-detail-shell.component.html'
})
export class AdminDetailShellComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() backLink: string | null = null;
  @Input() backLabel = 'Volver';
}

