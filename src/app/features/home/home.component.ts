import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { GuideModalComponent } from '../../shared/components/guide-modal/guide-modal.component';
import { GuideFlowService, GuideStep, GuideStepKey } from '../../shared/services/guide-flow/guide-flow.service';
import { TemplateService } from '../../core/services/templates/template.service';
import { DocumentService } from '../../core/services/documents/document.service';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { DocumentApi } from '../../core/models/documents/document.model';

interface HomeShortcut {
  title: string
  description: string
  path: string
  tone: 'blue' | 'emerald' | 'amber' | 'indigo'
}

interface HomeKpi {
  title: string
  value: string
  helper: string
}

interface DaySummaryItem {
  label: string
  value: number
}

interface TemplateCard {
  title: string
  description: string
  tag: string
  path: string
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterModule, GuideModalComponent, TranslateModule],
  templateUrl: "./home.component.html",
  styleUrls: [],
})
export class HomeComponent implements OnInit {
  showGuideModal = false;
  guideSteps: GuideStep[] = [];
  hasTemplateCreated = false;
  hasDocumentCreated = false;
  shouldShowGuideSection = false;
  templateCount = 0;
  documentCount = 0;
  summarySentToday = 0;
  summaryCompleted = 0;
  summaryPending = 0;
  summaryDueToday = 0;

  readonly onboardingProgress = {
    title: 'Enviar documentos para firma',
    current: 0,
    total: 2
  };

  readonly starterTemplates: TemplateCard[] = [
    {
      title: 'Verificación de elegibilidad I-9',
      description: 'Recolecta la información fiscal de tus colaboradores en minutos.',
      tag: 'Plantilla inicial',
      path: '/templates'
    },
    {
      title: 'Formato W-9 de ejemplo',
      description: 'Solicita datos tributarios a proveedores y contratistas.',
      tag: 'Plantilla inicial',
      path: '/templates'
    },
    {
      title: 'Carta de oferta laboral',
      description: 'Formaliza contrataciones y envía solicitudes de firma electrónica.',
      tag: 'Plantilla inicial',
      path: '/templates'
    }
  ];

  readonly homeShortcuts: HomeShortcut[] = [
    {
      title: 'DASHBOARD.CREATE_TEMPLATE',
      description: 'DASHBOARD.CREATE_TEMPLATE_DESC',
      path: '/templates/create',
      tone: 'blue'
    },
    {
      title: 'DASHBOARD.CREATE_DOCUMENT',
      description: 'DASHBOARD.CREATE_DOCUMENT_DESC',
      path: '/documents/create',
      tone: 'emerald'
    },
    {
      title: 'DASHBOARD.BUY_CREDITS',
      description: 'DASHBOARD.BUY_CREDITS_DESC',
      path: '/administration/billing',
      tone: 'indigo'
    },
    {
      title: 'DASHBOARD.REPORTS',
      description: 'DASHBOARD.REPORTS_DESC',
      path: '/reports/usage',
      tone: 'amber'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private guideFlow: GuideFlowService,
    private templateService: TemplateService,
    private documentService: DocumentService
  ) { }

  ngOnInit(): void {
    this.resolveGuideStatus();
  }

  get displayName(): string {
    const session = this.authService.getSession();
    const email = session?.user.email ?? '';
    const name = session?.user.name ?? '';

    const resolvedName = name || email;
    return resolvedName || 'Usuario';
  }

  getInitials(): string {
    const session = this.authService.getSession();
    const name = session?.user.name ?? '';
    const email = session?.user.email ?? '';
    const resolvedName = name || email;

    if (!resolvedName) return 'U';

    const parts = resolvedName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return resolvedName.substring(0, 2).toUpperCase();
  }

  startGuide(): void {
    const activeKey: GuideStepKey = !this.hasTemplateCreated ? 'template' : 'document';
    this.guideSteps = this.guideFlow.getSteps(activeKey, {
      template: this.hasTemplateCreated,
      document: this.hasDocumentCreated
    });
    this.showGuideModal = true;
  }

  closeGuideModal(): void {
    this.showGuideModal = false;
  }

  beginGuideFlow(): void {
    this.showGuideModal = false;

    const startsFromTemplate = !this.hasTemplateCreated;
    if (startsFromTemplate) {
      this.router.navigate(['/templates/create'], {
        queryParams: {
          guided: '1',
          guideStep: 'template',
          returnTo: '/home'
        }
      });
      return;
    }

    this.router.navigate(['/documents/create'], {
      queryParams: {
        guided: '1',
        guideStep: 'document',
        returnTo: '/home'
      }
    });
  }

  get completedSteps(): number {
    return Number(this.hasTemplateCreated) + Number(this.hasDocumentCreated);
  }

  get homeKpis(): HomeKpi[] {
    return [
      {
        title: 'DASHBOARD.KPI_TEMPLATES',
        value: String(this.templateCount),
        helper: this.templateCount > 0 ? 'DASHBOARD.KPI_TEMPLATES_READY' : 'DASHBOARD.KPI_TEMPLATES_EMPTY'
      },
      {
        title: 'DASHBOARD.KPI_DOCUMENTS',
        value: String(this.documentCount),
        helper: this.documentCount > 0 ? 'DASHBOARD.KPI_DOCUMENTS_ACTIVE' : 'DASHBOARD.KPI_DOCUMENTS_EMPTY'
      },
      {
        title: 'DASHBOARD.KPI_ONBOARDING',
        value: `${this.completedSteps}/${this.onboardingProgress.total}`,
        helper: this.shouldShowGuideSection ? 'DASHBOARD.KPI_ONBOARDING_PENDING' : 'DASHBOARD.KPI_ONBOARDING_DONE'
      }
    ];
  }

  getShortcutCardClasses(tone: HomeShortcut['tone']): string {
    switch (tone) {
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50';
      case 'amber':
        return 'border-amber-200 bg-amber-50/60 hover:bg-amber-50';
      case 'indigo':
        return 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50';
      default:
        return 'border-blue-200 bg-blue-50/60 hover:bg-blue-50';
    }
  }

  get daySummaryItems(): DaySummaryItem[] {
    return [
      { label: 'DASHBOARD.SENT_TODAY', value: this.summarySentToday },
      { label: 'DASHBOARD.COMPLETED', value: this.summaryCompleted },
      { label: 'DASHBOARD.PENDING', value: this.summaryPending },
      { label: 'DASHBOARD.DUE_TODAY', value: this.summaryDueToday }
    ];
  }

  private resolveGuideStatus(): void {
    forkJoin({
      templates: this.templateService.listTemplates().pipe(take(1)),
      documents: this.documentService.listDocuments().pipe(take(1))
    }).subscribe({
      next: ({ templates, documents }) => {
        this.templateCount = templates.length;
        this.documentCount = documents.length;
        this.computeDaySummary(documents);
        this.hasTemplateCreated = templates.length > 0;
        this.hasDocumentCreated = documents.length > 0;
        this.shouldShowGuideSection = !this.hasTemplateCreated || !this.hasDocumentCreated;

        this.onboardingProgress.current = this.completedSteps;
      },
      error: () => {
        this.templateCount = 0;
        this.documentCount = 0;
        this.summarySentToday = 0;
        this.summaryCompleted = 0;
        this.summaryPending = 0;
        this.summaryDueToday = 0;
        this.hasTemplateCreated = false;
        this.hasDocumentCreated = false;
        this.shouldShowGuideSection = true;
        this.onboardingProgress.current = 0;
      }
    });
  }

  private computeDaySummary(documents: DocumentApi[]): void {
    const today = new Date();
    const pendingStatuses = new Set(['CREATED', 'PENDING', 'DRAFT', 'IN_PROGRESS', 'IN_PROGRESS_SIGNING', 'STARTED']);
    const closedStatuses = new Set(['COMPLETED', 'SIGNED', 'FINISHED', 'CANCELLED', 'CANCELED', 'EXPIRED']);

    let sentToday = 0;
    let completed = 0;
    let pending = 0;
    let dueToday = 0;

    for (const doc of documents) {
      const normalizedStatus = String(doc.status || '').toUpperCase();

      if (doc.createdAt && this.isSameDay(today, new Date(doc.createdAt))) {
        sentToday += 1;
      }

      if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'SIGNED' || normalizedStatus === 'FINISHED') {
        completed += 1;
      }

      if (pendingStatuses.has(normalizedStatus)) {
        pending += 1;
      }

      if (doc.deadlineAt && this.isSameDay(today, new Date(doc.deadlineAt)) && !closedStatuses.has(normalizedStatus)) {
        dueToday += 1;
      }
    }

    this.summarySentToday = sentToday;
    this.summaryCompleted = completed;
    this.summaryPending = pending;
    this.summaryDueToday = dueToday;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
