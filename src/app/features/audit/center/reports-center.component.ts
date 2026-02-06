import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { UsageSummaryComponent } from '../usage/usage-summary.component';

@Component({
  selector: 'app-reports-center',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, UsageSummaryComponent],
  templateUrl: './reports-center.component.html'
})
export class ReportsCenterComponent implements OnInit, OnDestroy {
  readonly ownerName = 'Centro de reportes';
  readonly accountId = 'RPT-8901';
  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'Reportes disponibles',
      items: [{ label: 'Uso' }]
    }
  ];

  private readonly defaultOption = this.sidebarSections[0].items[0].label;
  private querySub?: Subscription;
  selectedOption = this.defaultOption;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      if (section && section === 'Uso') {
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
    this.selectedOption = option;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: option === this.defaultOption ? null : option },
      queryParamsHandling: 'merge'
    });
  }

  get currentDescription(): string {
    return 'Consulta métricas y consumo de la plataforma por canal.';
  }

  get showUsageSummary(): boolean {
    return this.selectedOption === 'Uso';
  }
}
