import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { TemplateListComponent } from '../list/template-list.component';
import { GuideModalComponent } from '../../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep } from '../../../shared/services/guide-flow/guide-flow.service';

@Component({
  selector: 'app-templates-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, TemplateListComponent, GuideModalComponent],
  templateUrl: './templates-center.component.html'
})
export class TemplatesCenterComponent implements OnInit, OnDestroy {
  readonly ownerName = 'Catálogo de plantillas';
  readonly accountId = 'TPL-5011';
  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'PLANTILLAS DE SOBRES',
      items: [
        { label: 'Mis plantillas' },
        { label: 'Favoritas' }
      ]
    },
    {
      label: 'Todas las plantillas',
      items: [{ label: 'Todas las plantillas' }]
    }
  ];

  private readonly defaultOption = this.sidebarSections[0].items[0].label;
  private readonly validSections = new Set<string>(
    this.sidebarSections.reduce<string[]>((acc, section) => {
      section.items.forEach(item => acc.push(item.label));
      return acc;
    }, [])
  );
  private querySub?: Subscription;
  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  private guideReturnTo = '/home';

  selectedOption = this.defaultOption;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private guideFlow: GuideFlowService
  ) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      if (section && this.validSections.has(section)) {
        this.selectedOption = section;
      } else {
        this.selectedOption = this.defaultOption;
      }

      const guidedParam = params.get('guided');
      const guideStep = params.get('guideStep');
      this.guideReturnTo = params.get('returnTo') || '/home';
      if ((guidedParam === '1' || guidedParam === 'true') && guideStep === 'document') {
        this.guideSteps = this.guideFlow.getSteps('document', { template: true, document: false });
        this.showGuideModal = true;
      } else {
        this.showGuideModal = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  onOptionSelected(option: string): void {
    if (!this.validSections.has(option)) {
      return;
    }
    this.selectedOption = option;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: option === this.defaultOption ? null : option },
      queryParamsHandling: 'merge'
    });
  }

  get currentDescription(): string {
    return `Organiza tus plantillas según la vista "${this.selectedOption}".`;
  }

  get templatesReturnTo(): string {
    if (this.selectedOption === this.defaultOption) {
      return '/templates';
    }
    const encoded = encodeURIComponent(this.selectedOption);
    return `/templates?section=${encoded}`;
  }

  closeGuideModal(): void {
    this.showGuideModal = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { guided: null, guideStep: null, returnTo: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  goToCreateDocument(): void {
    this.showGuideModal = false;
    this.router.navigate(['/documents/create'], {
      queryParams: {
        guided: '1',
        guideStep: 'document',
        returnTo: this.guideReturnTo
      }
    });
  }
}
