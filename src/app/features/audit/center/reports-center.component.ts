import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { AuditListComponent } from '../list/audit-list.component';

@Component({
  selector: 'app-reports-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, AuditListComponent],
  templateUrl: './reports-center.component.html'
})
export class ReportsCenterComponent implements OnInit, OnDestroy {
  readonly ownerName = 'Centro de reportes';
  readonly accountId = 'RPT-8901';
  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'Paneles de control',
      items: [
        { label: 'Mi panel de control' },
        { label: 'Panel del administrador' }
      ]
    },
    {
      label: 'Tipo de informe',
      items: [
        { label: 'Todos (17)' },
        { label: 'Sobre (8)' },
        { label: 'Destinatario (2)' },
        { label: 'Uso (7)' },
        { label: 'Personalizado (0)' }
      ]
    },
    {
      label: 'Descargas',
      items: [
        { label: 'Descargas' }
      ]
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
    return `Explora reportes y paneles filtrados por "${this.selectedOption}".`;
  }

  get showReportsTable(): boolean {
    return [
      'Mi panel de control',
      'Todos (17)',
      'Sobre (8)',
      'Destinatario (2)',
      'Uso (7)'
    ].includes(this.selectedOption);
  }
}
