import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DocumentService } from '../../../core/services/documents/document.service';
import type { DocumentApi } from '../../../core/models/documents/document.model';
import { AuditService } from '../../../core/services/audit/audit.service';
import type { AuditEvent } from '../../../core/models/audit/audit-event.model';
import { UserService } from '../../../core/services/user/user.service';
import type { UserSummary } from '../../../core/models/auth/user.model';
import { CompanyService } from '../../../core/services/company/company.service';
import { TemplateService } from '../../../core/services/templates/template.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-detail.component.html'
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  documentId = '';
  loading = true;
  errorMessage = '';
  document?: DocumentApi;
  auditEvents: AuditEvent[] = [];
  eventsLoading = false;
  eventsError = '';
  createdByDisplay = 'N/A';
  updatedByDisplay = 'N/A';
  companyDisplay = 'N/A';
  templateNameDisplay = 'N/A';
  private usersById: Record<string, string> = {};
  private participantFlowMap: Record<string, string> = {};

  private readonly subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private auditService: AuditService,
    private userService: UserService,
    private companyService: CompanyService,
    private templateService: TemplateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const id = params.get('documentId');
        if (!id) {
          this.errorMessage = 'No se encontró el documentId.';
          this.loading = false;
          return;
        }
        this.documentId = id;
        this.fetch();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return value;
    }
    return dt.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  participantsCount(): number {
    return this.document?.participants?.length ?? 0;
  }

  getStatusLabel(status: string | null | undefined): string {
    const normalized = (status || '').toUpperCase();
    switch (normalized) {
      case 'CREATED':
      case 'PENDING':
      case 'DRAFT':
        return 'Creado';
      case 'IN_PROGRESS':
      case 'IN_PROGRESS_SIGNING':
      case 'STARTED':
        return 'En proceso';
      case 'COMPLETED':
      case 'SIGNED':
      case 'FINISHED':
        return 'Completado';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelado';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return status || 'N/A';
    }
  }

  buildFlowUrl(processId?: string | null): string {
    if (!processId) {
      return '';
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/flow/${processId}`;
  }

  getProcessIdForParticipant(participantId?: string | null, processId?: string | null): string {
    if (processId) {
      return processId;
    }
    if (!participantId) {
      return '';
    }
    const fromSnapshot = this.documentService.getProcessIdFromSnapshot(this.documentId, participantId);
    if (fromSnapshot) {
      return fromSnapshot;
    }
    return this.participantFlowMap[participantId] || '';
  }

  private fetch(): void {
    this.loading = true;
    this.errorMessage = '';
    this.document = undefined;
    this.auditEvents = [];
    this.eventsError = '';
    this.eventsLoading = false;
    this.createdByDisplay = 'N/A';
    this.updatedByDisplay = 'N/A';
    this.companyDisplay = 'N/A';
    this.templateNameDisplay = 'N/A';
    this.participantFlowMap = {};

    this.documentService.getDocumentDetail(this.documentId).subscribe({
      next: doc => {
        this.document = doc;
        this.resolveUserDisplays(doc);
        this.resolveCompanyDisplay();
        this.resolveTemplateDisplay(doc);
        this.loading = false;
        this.loadEvents(doc);
      },
      error: err => {
        this.errorMessage = err instanceof Error ? err.message : 'No se pudo cargar el documento.';
        this.loading = false;
      }
    });
  }

  private loadEvents(doc: DocumentApi): void {
    const processIds = (doc.participants ?? [])
      .map(p => p.processId)
      .filter((id): id is string => !!id);

    this.eventsLoading = true;
    this.eventsError = '';

    this.auditService.getAuditEvents(200).subscribe({
      next: events => {
        const filtered = events
          .filter(event => this.matchesDocumentOrFlow(event, this.documentId, processIds))
          .sort((a, b) => {
            const aTs = Date.parse(a.occurredAt);
            const bTs = Date.parse(b.occurredAt);
            return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
          });

        this.auditEvents = filtered.slice(0, 30);
        this.hydrateMissingProcessIdsFromEvents(doc, filtered);
        this.eventsLoading = false;
      },
      error: err => {
        this.eventsError = err instanceof Error ? err.message : 'No se pudieron cargar los eventos.';
        this.eventsLoading = false;
      }
    });
  }

  private matchesDocumentOrFlow(event: AuditEvent, documentId: string, processIds: string[]): boolean {
    const resourceId = (event.resource?.id ?? '').toString();
    const path = event.http?.path ?? '';

    if (resourceId === documentId) {
      return true;
    }
    if (resourceId && processIds.includes(resourceId)) {
      return true;
    }
    if (path.includes(`/v1/documents/${documentId}`)) {
      return true;
    }
    return processIds.some(processId => path.includes(`/v1/flows/${processId}`));
  }

  private resolveUserDisplays(doc: DocumentApi): void {
    const ids = [doc.createdBy, doc.updatedBy].filter((id): id is string => !!id);
    if (!ids.length) {
      return;
    }

    const createdId = doc.createdBy;
    const updatedId = doc.updatedBy || doc.createdBy;

    this.createdByDisplay = this.getCurrentSessionDisplay(createdId) || createdId || 'N/A';
    this.updatedByDisplay = this.getCurrentSessionDisplay(updatedId) || updatedId || 'N/A';

    if (createdId) {
      this.userService.getUserById(createdId).subscribe({
        next: user => {
          const display = this.userToDisplay(user);
          if (display) {
            this.usersById[createdId] = display;
            this.createdByDisplay = display;
          }
        },
        error: () => {}
      });
    }

    if (updatedId && updatedId !== createdId) {
      this.userService.getUserById(updatedId).subscribe({
        next: user => {
          const display = this.userToDisplay(user);
          if (display) {
            this.usersById[updatedId] = display;
            this.updatedByDisplay = display;
          }
        },
        error: () => {}
      });
    }
  }

  private resolveCompanyDisplay(): void {
    this.companyService.getGeneralInfo().subscribe({
      next: info => {
        this.companyDisplay = info.display_name || info.legal_name || 'N/A';
      },
      error: () => {
        this.companyDisplay = this.document?.tenantId || 'N/A';
      }
    });
  }

  private resolveTemplateDisplay(doc: DocumentApi): void {
    if (!doc.templateId) {
      this.templateNameDisplay = 'N/A';
      return;
    }

    this.templateService.getTemplateDetail(doc.templateId).subscribe({
      next: tpl => {
        this.templateNameDisplay = tpl.templateName || doc.templateId;
      },
      error: () => {
        this.templateNameDisplay = doc.templateId;
      }
    });
  }

  private mapUserDisplayById(users: UserSummary[]): Record<string, string> {
    const entries = users.map(user => {
      const firstName = (user.attributes?.given_name || '').trim();
      const lastName = (user.attributes?.family_name || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const fallback = user.name || user.email || user.username || user.sub;
      return [user.sub, fullName || fallback] as const;
    });
    return Object.fromEntries(entries);
  }

  private getUserDisplay(userId: string | null | undefined): string {
    if (!userId) {
      return 'N/A';
    }
    return this.usersById[userId] || userId;
  }

  private userToDisplay(user: UserSummary | null | undefined): string {
    if (!user) {
      return '';
    }
    const firstName = (user.attributes?.given_name || '').trim();
    const lastName = (user.attributes?.family_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.name || user.email || user.username || user.sub || '';
  }

  private getCurrentSessionDisplay(userId: string | null | undefined): string {
    if (!userId) {
      return '';
    }
    const sessionUser = this.authService.getSession()?.user;
    if (!sessionUser?.userId || sessionUser.userId !== userId) {
      return '';
    }
    return (sessionUser.name || sessionUser.email || '').trim();
  }

  private hydrateMissingProcessIdsFromEvents(doc: DocumentApi, events: AuditEvent[]): void {
    const participants = doc.participants ?? [];
    if (!participants.length) {
      return;
    }

    const flowIds = Array.from(
      new Set(
        events
          .map(event => this.extractFlowId(event))
          .filter((id): id is string => !!id)
      )
    );

    if (!flowIds.length) {
      return;
    }

    const missingParticipants = participants.filter(p => !p.processId && p.participantId);
    if (!missingParticipants.length) {
      return;
    }

    // Common case: one participant and one flow event.
    if (missingParticipants.length === 1 && flowIds.length === 1) {
      this.participantFlowMap[missingParticipants[0].participantId!] = flowIds[0];
      return;
    }

    // Fallback: map by index order for missing entries when counts match.
    const assignable = Math.min(missingParticipants.length, flowIds.length);
    for (let i = 0; i < assignable; i += 1) {
      const participantId = missingParticipants[i].participantId!;
      if (!this.participantFlowMap[participantId]) {
        this.participantFlowMap[participantId] = flowIds[i];
      }
    }
  }

  private extractFlowId(event: AuditEvent): string | null {
    const path = event.http?.path ?? '';
    const pathMatch = path.match(/\/v1\/flows\/([^/?]+)/i);
    if (pathMatch?.[1]) {
      return decodeURIComponent(pathMatch[1]);
    }

    const resourceType = (event.resource?.type ?? '').toLowerCase();
    const resourceId = (event.resource?.id ?? '').toString();
    if (resourceType.includes('flow') && !!resourceId) {
      return resourceId;
    }

    return null;
  }
}
