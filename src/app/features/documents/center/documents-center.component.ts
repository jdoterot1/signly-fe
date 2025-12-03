import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { DocumentListComponent } from '../list/document-list.component';

@Component({
  selector: 'app-documents-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, DocumentListComponent],
  templateUrl: './documents-center.component.html'
})
export class DocumentsCenterComponent implements OnInit, OnDestroy {
  readonly ownerName = 'Centro de acuerdos';
  readonly accountId = 'ACD-2048';
  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'Por tipo',
      items: [
        { label: 'Opción 1' },
        { label: 'Opción 2' },
        { label: 'Opción 3' }
      ]
    },
    {
      label: 'Por estado',
      items: [
        { label: 'Opción 4' },
        { label: 'Opción 5' }
      ]
    }
  ];

  private readonly validSections = new Set<string>(
    this.sidebarSections.reduce<string[]>((acc, section) => {
      section.items.forEach(item => acc.push(item.label));
      return acc;
    }, [])
  );
  private querySub?: Subscription;
  private readonly defaultOption = this.sidebarSections[0].items[0].label;

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
    return `Visualiza el estado de tus acuerdos bajo la vista "${this.selectedOption}".`;
  }

  get documentsReturnTo(): string {
    if (this.selectedOption === this.defaultOption) {
      return '/documents';
    }
    const encoded = encodeURIComponent(this.selectedOption);
    return `/documents?section=${encoded}`;
  }
}
