import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { ThemeService } from './core/services/theme/theme.service';
import { LanguageService } from './core/services/language/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingOverlayComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Signly';
  private themeService = inject(ThemeService);
  private languageService = inject(LanguageService);

  ngOnInit(): void {
    // Ensure language is initialized from localStorage or browser preference
    this.languageService.setLanguage(this.languageService.currentLanguage());
  }
}
