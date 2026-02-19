import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  FlowHelpService,
  type HelpContext,
  type HelpTab,
  type HelpCategory,
  type HelpSection,
  type HelpTip,
} from '../../../../core/services/flow/flow-help.service';

@Component({
  selector: 'app-flow-help-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flow-help-modal.component.html',
  styleUrls: ['./flow-help-modal.component.css'],
})
export class FlowHelpModalComponent implements OnInit, OnChanges {
  @Input() context!: HelpContext;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  tabs: HelpTab[] = [];
  activeTabCategory: HelpCategory = 'biometric';
  expandedSections = new Set<string>();
  currentCardIndex = 0;

  icons: Record<string, string> = {
    biometric: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m-4 12h2a2 2 0 0 0 2-2v-2M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>
  `,
    otp: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.987 5.431a3.3 3.3 0 0 0-.429-1.417a3.7 3.7 0 0 0-1.656-1.526a27 27 0 0 0-2.854-.998c-.628-.22-1.247-.39-1.866-.539c-.918-.18-1.836-.34-2.794-.529a12.4 12.4 0 0 0-2.494-.399a3.54 3.54 0 0 0-1.776.5a4.75 4.75 0 0 0-1.816 2.045a15 15 0 0 0-1.058 3.741a7 7 0 0 0-.17 1.936c.036.468.194.92.46 1.307c.217.297.5.54.828.709q1.057.44 2.165.728a.3.3 0 0 0 .36-.17a.29.29 0 0 0-.17-.359c-.52-.19-1.208-.34-1.796-.609a2 2 0 0 1-.898-.658c-.19-.3-.297-.644-.31-.998a6.3 6.3 0 0 1 .2-1.736A14 14 0 0 1 9.02 2.947A3.86 3.86 0 0 1 10.547 1.3a2.65 2.65 0 0 1 1.347-.279c.777.068 1.546.212 2.295.429c.938.2 1.846.38 2.744.599q.892.216 1.756.529q1.399.37 2.744.908c.503.232.924.611 1.207 1.087c.205.39.304.827.29 1.267c-.013.491-.077.98-.19 1.457A8.1 8.1 0 0 1 21.144 11a2.48 2.48 0 0 1-2.265.698c-.809-.12-1.577-.359-2.375-.509c-.21 0-.42-.08-.639-.1s-.449-.11-.688-.129a1 1 0 0 0-.48 0a4.4 4.4 0 0 0-1.097.638c-.728.55-1.387 1.298-1.995 1.836c-.08.07-.41.19-.639.35l.05-2.225a.3.3 0 0 0-.32-.3a.31.31 0 0 0-.309.32l-.16 2.185q-.008.367.06.728a.42.42 0 0 0 .3.28a.9.9 0 0 0 .629-.17q.424-.27.798-.609c.559-.449 1.127-.998 1.736-1.536a4.2 4.2 0 0 1 1.257-.739l.788.15l2.994.678a3.35 3.35 0 0 0 3.083-.908a9.06 9.06 0 0 0 1.926-4.15a6.8 6.8 0 0 0 .19-2.056"/><path d="M12.353 17.165q-.093-.596-.25-1.177a.32.32 0 0 0-.399-.22a.32.32 0 0 0-.21.39c.08.309.17.828.25 1.356c.08.53.14 1.058.16 1.377a2.54 2.54 0 0 1-.808 2.325c-.998.778-2.515.918-3.991 1.257c-.768.253-1.561.42-2.365.5a1.68 1.68 0 0 1-1.198-.38a1.1 1.1 0 0 1-.23-.618c-.099-.54-.109-1.148-.169-1.507c-.18-1.068-.359-2.135-.578-3.203a86 86 0 0 0-.709-3.173a21.7 21.7 0 0 1-.998-4.16c-.033-.4 0-.8.1-1.188c.17.3.36.638.539.888c.135.19.317.341.529.439a1 1 0 0 0 .499 0c.339 0 .798-.27.997-.32l2.305-.628a.32.32 0 0 0 .057-.573a.33.33 0 0 0-.236-.046l-2.315.26c-.23 0-.928.529-1.058.369s-.26-.26-.399-.4c-.14-.139-.429-.478-.609-.668q.194-.226.45-.379q.431-.226.907-.33c.839-.219 1.916-.408 2.395-.528a.29.29 0 0 0 .21-.34a.28.28 0 0 0-.34-.199c-.478.1-1.566.25-2.424.45a4.5 4.5 0 0 0-1.088.349A2.63 2.63 0 0 0 .05 9.083c-.26 1.676.559 3.891.818 5.149c.19.838.35 1.676.51 2.524c.239 1.267.468 2.534.678 3.812c.07.429.08 1.207.23 1.806c.082.35.258.67.508.928a2.67 2.67 0 0 0 1.966.668a11.5 11.5 0 0 0 2.584-.529c1.577-.419 3.253-.678 4.27-1.556a3.23 3.23 0 0 0 .998-2.994c-.04-.409-.14-1.097-.26-1.726M13.43 6.01c.41-1.327-.638-3.223-2.464-2.475q-.407.165-.758.43a4.4 4.4 0 0 0-.928.897c-.21.292-.328.64-.34.998a2.44 2.44 0 0 0 .899 1.726a1.66 1.66 0 0 0 1.426.38a3.1 3.1 0 0 0 2.166-1.956m-3.073.599a1.4 1.4 0 0 1-.449-.789a1 1 0 0 1 .2-.628a3.4 3.4 0 0 1 .569-.659q.252-.246.558-.419c1.148-.628 1.647.918 1.367 1.607a2.14 2.14 0 0 1-1.586 1.177a.79.79 0 0 1-.659-.31zm4.529-.339q-.09.255-.15.518c-.1.41-.149.818-.219 1.247a.31.31 0 0 0 .2.4a.32.32 0 0 0 .399-.21c.19-.38.389-.728.559-1.108a5 5 0 0 0 .369-.977c.1-.35.17-.709.26-1.058a9 9 0 0 1 1.047.14a.31.31 0 0 0 .409-.21a.31.31 0 0 0-.067-.342a.3.3 0 0 0-.103-.067a6 6 0 0 0-1.107-.539q-.245-.09-.5-.15a2.7 2.7 0 0 0-.498-.08h-1.167a.28.28 0 1 0-.14.54q.612.316 1.267.528h.2a8 8 0 0 0-.54.809a3 3 0 0 0-.219.558m3.463 3.313c0-.33.06-.649.11-.998s.12-.569.189-.848c.231.11.483.167.738.17a2.64 2.64 0 0 0 1.507-.5a2.1 2.1 0 0 0 .629-.618c.136-.227.19-.496.15-.758a1.93 1.93 0 0 0-1.118-1.317a1.62 1.62 0 0 0-1.836.23c-.21.228-.373.496-.48.788a8.8 8.8 0 0 0-.348 1.786c-.05.339-.08.678-.1.997a9 9 0 0 0 0 .998a.27.27 0 0 0 .28.27a.28.28 0 0 0 .279-.2m.748-3.263c.08-.237.21-.454.38-.638c.159-.16.418-.09.648 0a1 1 0 0 1 .588.548a.27.27 0 0 1 0 .2q-.126.181-.299.32c-.236.213-.52.367-.828.448c-.241.06-.496.031-.718-.08q.088-.406.229-.798"/></g></svg>
    `,
    general: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5m-6.7 9.1l1-.4M15 3v7.5m.2 6.4l-.9-.3m2.3 5.1l.3-.9m-.1-5.5l-.4-1m2.7.9l.3-.9m.2 7.4l-.4-1m1.5-3.9l1-.4m0 3l-.9-.3M9 3v18"/><circle cx="18" cy="18" r="3"/></g></svg>
  `,
  };

  constructor(
    private helpService: FlowHelpService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.initializeTabs();
    // Set initial card index based on active tab
    this.currentCardIndex = this.tabs.findIndex(
      (t) => t.category === this.activeTabCategory,
    );
    if (this.currentCardIndex === -1) this.currentCardIndex = 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize tabs when context changes (e.g., user moves to different step)
    if (changes['context'] && !changes['context'].firstChange) {
      this.initializeTabs();
      this.currentCardIndex = this.tabs.findIndex(
        (t) => t.category === this.activeTabCategory,
      );
      if (this.currentCardIndex === -1) this.currentCardIndex = 0;
    }

    // When modal opens, ensure we have the right tab active
    if (changes['open'] && changes['open'].currentValue === true) {
      this.initializeTabs();
      this.currentCardIndex = this.tabs.findIndex(
        (t) => t.category === this.activeTabCategory,
      );
      if (this.currentCardIndex === -1) this.currentCardIndex = 0;
    }
  }

  private initializeTabs(): void {
    // Get tabs filtered by context
    this.tabs = this.helpService.getHelpTabs(this.context);

    // Set initial active tab based on current flow step
    this.activeTabCategory = this.helpService.getInitialActiveTab(this.context);

    // Clear and re-initialize expanded sections
    this.expandedSections.clear();
    this.autoExpandSection();
  }

  private autoExpandSection(): void {
    const sectionToExpand = this.helpService.getSectionToAutoExpand(
      this.activeTabCategory,
      this.context,
    );

    if (sectionToExpand) {
      this.expandedSections.add(sectionToExpand);
    } else {
      // Default: expand first section of active tab
      const activeTab = this.getActiveTab();
      if (activeTab && activeTab.sections.length > 0) {
        this.expandedSections.add(activeTab.sections[0].key);
      }
    }
  }

  switchTab(category: HelpCategory): void {
    this.activeTabCategory = category;
    this.expandedSections.clear();
    this.autoExpandSection();
  }

  goToCard(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.currentCardIndex = index;
      this.activeTabCategory = this.tabs[index].category;
      this.expandedSections.clear();
      this.autoExpandSection();
    }
  }

  nextCard(): void {
    if (this.currentCardIndex < this.tabs.length - 1) {
      this.goToCard(this.currentCardIndex + 1);
    }
  }

  prevCard(): void {
    if (this.currentCardIndex > 0) {
      this.goToCard(this.currentCardIndex - 1);
    }
  }

  toggleSection(sectionKey: string): void {
    if (this.expandedSections.has(sectionKey)) {
      // Si el accordion actual está abierto, lo cerramos
      this.expandedSections.delete(sectionKey);
    } else {
      // Cerramos todos los demás y abrimos solo este (comportamiento exclusivo)
      this.expandedSections.clear();
      this.expandedSections.add(sectionKey);
    }
  }

  isSectionExpanded(sectionKey: string): boolean {
    return this.expandedSections.has(sectionKey);
  }

  close(): void {
    this.closed.emit();
  }

  getActiveTab(): HelpTab | undefined {
    return this.tabs.find((t) => t.category === this.activeTabCategory);
  }

  /**
   * Get Tailwind classes for tip based on priority.
   */
  getTipClasses(priority: 'critical' | 'important' | 'helpful'): string {
    const baseClasses = 'border-l-4 pl-3 py-2 mb-2 rounded';
    const priorityClasses = {
      critical: 'border-emerald-400 bg-emerald-50 text-emerald-900',
      important: 'border-amber-400 bg-amber-50 text-amber-900',
      helpful: 'border-blue-400 bg-blue-50 text-blue-900',
    };
    return `${baseClasses} ${priorityClasses[priority]}`;
  }

  /**
   * Handle Escape key to close modal.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      this.close();
    }
  }

  getIcon(category: string): SafeHtml {
    console.log(category, this.icons[category]);
    const svg = this.icons[category] || this.icons['general'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
