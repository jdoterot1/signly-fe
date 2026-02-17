import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { DocumentListComponent } from '../list/document-list.component';

@Component({
  selector: 'app-documents-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, DocumentListComponent, TranslateModule],
  templateUrl: './documents-center.component.html'
})
export class DocumentsCenterComponent implements OnInit, OnDestroy {
  readonly ownerName = 'DOCUMENTS.CENTER_TITLE';
  readonly accountId = '';
  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'DOCUMENTS.AGREEMENTS',
      items: [
        { label: 'DOCUMENTS.ALL' }
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

  constructor(private router: Router, private route: ActivatedRoute) { }

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
    return 'DOCUMENTS.DESCRIPTION';
  }

  get documentsReturnTo(): string {
    if (this.selectedOption === this.defaultOption) {
      return '/documents';
    }
    const encoded = encodeURIComponent(this.selectedOption);
    return `/documents?section=${encoded}`;
  }
}
