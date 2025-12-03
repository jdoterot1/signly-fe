import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { TemplateListComponent } from '../list/template-list.component';

@Component({
  selector: 'app-templates-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, TemplateListComponent],
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
        { label: 'Compartidas conmigo' },
        { label: 'Favoritas' }
      ]
    },
    {
      label: 'Todas las plantillas',
      items: [
        { label: 'Todas las plantillas' },
        { label: 'Eliminado' }
      ]
    },
    {
      label: 'CARPETAS',
      items: [{ label: 'CARPETAS COMPARTIDAS' }]
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

  selectedOption = this.defaultOption;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      if (section && this.validSections.has(section)) {
        this.selectedOption = section;
      } else {
        this.selectedOption = this.defaultOption;
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
}
