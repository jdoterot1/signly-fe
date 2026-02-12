import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="themeService.toggle()"
      class="relative flex items-center justify-center rounded-full border border-brand bg-brand-surface-card p-2 transition hover:border-brand-primary"
      [attr.aria-label]="themeService.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      <!-- Sun icon (shown in dark mode) -->
      <svg
        *ngIf="themeService.theme() === 'dark'"
        class="w-5 h-5 text-brand-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <!-- Moon icon (shown in light mode) -->
      <svg
        *ngIf="themeService.theme() === 'light'"
        class="w-5 h-5 text-brand-ink-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  `
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
