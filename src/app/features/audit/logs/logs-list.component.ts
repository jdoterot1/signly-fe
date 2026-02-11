import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuditService } from '../../../core/services/audit/audit.service';
import { AuditEvent } from '../../../core/models/audit/audit-event.model';
import { AdminDetailShellComponent } from '../../../shared/components/admin-detail-shell/admin-detail-shell.component';

@Component({
  selector: 'app-logs-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminDetailShellComponent],
  templateUrl: './logs-list.component.html'
})
export class LogsListComponent implements OnInit, OnDestroy {
  event?: AuditEvent;
  loading = false;
  errorMessage?: string;
  currentId?: string;
  private routeSub?: Subscription;
  backLink: string | null = null;

  constructor(
    private auditService: AuditService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.backLink = this.router.url.startsWith('/administration') ? '/administration/audit-log' : null;
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadAuditEvent(id);
        return;
      }
      this.errorMessage = 'Identificador de auditoría no proporcionado.';
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadAuditEvent(id: string): void {
    this.currentId = id;
    this.loading = true;
    this.errorMessage = undefined;
    this.auditService.getAuditEventById(id).subscribe({
      next: event => {
        this.event = event;
        this.loading = false;
      },
      error: err => {
        this.errorMessage =
          err?.message || 'No fue posible obtener la información detallada de la auditoría.';
        this.loading = false;
      }
    });
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return 'N/A';
    }
    return new Date(value).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
