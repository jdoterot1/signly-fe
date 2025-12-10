import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { AuditService } from '../../../core/services/audit/audit.service';
import { AuditEvent } from '../../../core/models/audit/audit-event.model';

@Component({
  selector: 'app-logs-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './logs-list.component.html'
})
export class LogsListComponent implements OnInit {
  event?: AuditEvent;
  loading = false;
  errorMessage?: string;
  currentId?: string;

  constructor(private auditService: AuditService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAuditEvent(id);
    } else {
      this.errorMessage = 'Identificador de auditoría no proporcionado.';
    }
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
