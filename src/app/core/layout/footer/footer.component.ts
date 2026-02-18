import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../services/language/language.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  readonly languageService = inject(LanguageService);
  readonly currentYear = new Date().getFullYear();
  
  selectedLanguage: Language = this.languageService.currentLanguage();

  constructor() {
    // Sync selectedLanguage with languageService.currentLanguage() signal
    effect(() => {
      this.selectedLanguage = this.languageService.currentLanguage();
    });
  }

  onLanguageChange(lang: Language): void {
    this.languageService.setLanguage(lang);
  }
}
