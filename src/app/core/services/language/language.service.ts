import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';

export type Language = 'es' | 'en';

export interface LanguageOption {
  code: Language;
  label: string;
}

const STORAGE_KEY = 'signly-language';
const DEFAULT_LANGUAGE: Language = 'es';
const SUPPORTED_LANGUAGES: Language[] = ['es', 'en'];

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English (US)' },
];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLanguage = signal<Language>(this.getInitialLanguage());
  readonly languages = LANGUAGE_OPTIONS;

  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private translate: TranslateService,
    private primeng: PrimeNG
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.translate.addLangs(SUPPORTED_LANGUAGES);
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);

    effect(() => {
      this.applyLanguage(this.currentLanguage());
    });
  }

  setLanguage(lang: Language): void {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      this.currentLanguage.set(lang);
    }
  }

  toggle(): void {
    const next = this.currentLanguage() === 'es' ? 'en' : 'es';
    this.currentLanguage.set(next);
  }

  get currentLabel(): string {
    return LANGUAGE_OPTIONS.find(l => l.code === this.currentLanguage())?.label ?? '';
  }

  private getInitialLanguage(): Language {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;

    const browserLang = navigator.language?.split('-')[0] as Language;
    if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;

    return DEFAULT_LANGUAGE;
  }

  private applyLanguage(lang: Language): void {
    this.translate.use(lang);
    this.updatePrimeNGLocale(lang);

    if (!this.isBrowser) return;

    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }

  private updatePrimeNGLocale(lang: Language): void {
    if (lang === 'es') {
      this.primeng.setTranslation({
        dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        dayNamesMin: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
        monthNames: [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ],
        monthNamesShort: [
          'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
        ],
        today: 'Hoy',
        clear: 'Limpiar',
        accept: 'Aceptar',
        reject: 'Rechazar',
        emptyMessage: 'No hay resultados',
        emptyFilterMessage: 'No hay resultados',
      });
    } else {
      this.primeng.setTranslation({
        dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        monthNames: [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ],
        monthNamesShort: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ],
        today: 'Today',
        clear: 'Clear',
        accept: 'Accept',
        reject: 'Reject',
        emptyMessage: 'No results found',
        emptyFilterMessage: 'No results found',
      });
    }
  }
}
