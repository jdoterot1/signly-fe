import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { UsersListComponent } from '../user/list/user-list.component';
import { RolesListComponent } from '../roles/list/roles-list.component';
import { RolesCreateComponent } from '../roles/create/roles-add.component';
import { CompanySettingsComponent } from '../company/company-settings.component';
import { CompanyBrandingComponent } from '../company/company-branding.component';
import { CompanyBillingComponent } from '../company/company-billing.component';
import { TableComponent } from '../../shared/table/table.component';
import { TableModel } from '../../shared/table/table.model';
import { WebhookListComponent } from '../webhooks/list/webhook-list.component';
import { WalletComponent } from '../wallet/wallet.component';
import { AuditListComponent } from '../audit/list/audit-list.component';
import { AuthService } from '../../core/services/auth/auth.service';

interface QuickAccessItem {
  label: string;
  description: string;
  target: string;
}

interface ProductUpdate {
  type: string;
  daysAgo: string;
  title: string;
  description: string;
  linkLabel: string;
}

interface NotificationRow {
  title: string;
  type: string;
  daysAgo: string;
  description: string;
  linkLabel: string;
}

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [
    CommonModule,
    AdminSidebarComponent,
    UsersListComponent,
    RolesListComponent,
    RolesCreateComponent,
    CompanySettingsComponent,
    CompanyBrandingComponent,
    CompanyBillingComponent,
    TableComponent,
    WebhookListComponent,
    WalletComponent,
    AuditListComponent
  ],
  templateUrl: './administration.component.html'
})
export class AdministrationComponent implements OnInit, OnDestroy {
  ownerName = 'Usuario';
  accountId = '000000000';
  showPreferencesModal = false;

  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'Información general',
      items: [{ label: 'Información general' }]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Compañía' },
        { label: 'Branding y correos' },
        { label: 'Calculadora' }
      ]
    },
    {
      label: 'Facturación y pagos',
      items: [
        { label: 'Facturación' },
        { label: 'Billetera' }
      ]
    },
    {
      label: 'Gestión de usuarios',
      items: [
        { label: 'Usuarios' },
        { label: 'Roles' }
      ]
    },
    {
      label: 'Integraciones',
      items: [
        { label: 'Aplicaciones y claves' },
        { label: 'Centro de uso de la API' },
        { label: 'Webhooks' }
      ]
    },
    {
      label: 'Auditoría',
      items: [{ label: 'Registro de auditoría' }]
    }
  ];

  readonly sectionDescriptions: Record<string, string> = {
    'Información general': 'Monitorea novedades del producto, anuncios críticos y accesos rápidos a la configuración.',
    'Compañía': 'Actualiza la razón social, domicilios y datos fiscales de la empresa.',
    'Branding y correos': 'Configura colores, logos y remitentes para todas las comunicaciones.',
    Calculadora: 'Estima el impacto financiero de tus flujos y licencias.',
    'Facturación': 'Consulta planes, ciclos de pago y comprobantes emitidos.',
    Billetera: 'Administra saldos prepagados y movimientos en tu billetera.',
    Usuarios: 'Administra usuarios, invita nuevos miembros y define su estado.',
    Roles: 'Determina qué permisos tiene cada equipo en Signly.',
    'Eliminar firmas y envíos': 'Solicita la depuración controlada de documentos y envíos antiguos.',
    'Aplicaciones y claves': 'Gestiona credenciales para desarrolladores y API keys.',
    'Centro de uso de la API': 'Monitorea uso y límites de tus integraciones.',
    Webhooks: 'Gestiona los endpoints que reciben eventos automáticos de Signly.',
    'Registro de auditoría': 'Consulta cada acción registrada para auditoría.'
  };

  readonly quickAccess: QuickAccessItem[] = [
    {
      label: 'Facturación',
      description: 'Consulta ciclos, métodos de pago y facturas.',
      target: 'Facturación'
    },
    {
      label: 'Usuarios',
      description: 'Gestiona invitaciones y permisos.',
      target: 'Usuarios'
    },
    {
      label: 'Aplicaciones y claves',
      description: 'Revisa integraciones y credenciales activas.',
      target: 'Aplicaciones y claves'
    }
  ];

  readonly productUpdates: ProductUpdate[] = [
    {
      type: 'Actualización del producto',
      daysAgo: '22 días',
      title: 'Versión básica',
      description:
        'Hay nuevas funciones de Signly disponibles en Production como parte de la versión de noviembre de 2025. Consulte las notas de la versión para más información sobre los últimos cambios.',
      linkLabel: 'Notas de la versión básica'
    },
    {
      type: 'Actualización del producto',
      daysAgo: '27 días',
      title: 'Nueva versión de Admin',
      description:
        'Hay una nueva versión de Signly Admin disponible. Visite las notas de la versión para informarse sobre los últimos cambios.',
      linkLabel: 'Notas de la versión del administrador'
    },
    {
      type: 'Actualización del producto',
      daysAgo: '34 días',
      title: 'Nueva versión de Admin',
      description:
        'Hay una nueva versión de Signly Admin disponible. Visite las notas de la versión para informarse sobre los últimos cambios.',
      linkLabel: 'Notas de la versión del administrador'
    }
  ];

  readonly notificationTableModel: TableModel<NotificationRow> = this.buildNotificationsModel();

  private readonly defaultSection = this.resolveInitialSelection();
  private readonly slugOverrides: Record<string, string> = {
    'Información general': 'overview',
    'Compañía': 'company',
    'Branding y correos': 'branding',
    Calculadora: 'calculator',
    'Facturación': 'billing',
    Billetera: 'wallet',
    Usuarios: 'users',
    'Aplicaciones y claves': 'apps-and-keys',
    'Centro de uso de la API': 'api-usage',
    Webhooks: 'webhooks',
    Roles: 'roles',
    'Eliminar firmas y envíos': 'delete-signatures-sends',
    'Registro de auditoría': 'audit-log'
  };
  private readonly labelToSlugMap = this.buildLabelToSlugMap();
  private readonly slugToLabelMap = this.buildSlugToLabelMap();

  selectedOption = this.defaultSection;
  detailView: string | null = null;
  readonly rolesReturnTo = '/administration/roles';
  private routeSub?: Subscription;
  private querySub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.hydrateOwnerFromSession();
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('section');
      if (!slug) {
        this.selectedOption = this.defaultSection;
        return;
      }

      const resolved = this.slugToLabelMap[slug];
      if (resolved) {
        this.selectedOption = resolved;
        return;
      }

      this.navigateToSection(this.defaultSection);
    });

    this.querySub = this.route.queryParamMap.subscribe(params => {
      this.detailView = params.get('view');
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  private hydrateOwnerFromSession(): void {
    const session = this.authService.getSession();
    if (!session?.user) {
      return;
    }
    const { name, email, tenantId, userId } = session.user;
    this.ownerName = name || email || this.ownerName;
    this.accountId = tenantId || userId || this.accountId;
  }

  onOptionSelected(option: string): void {
    this.navigateToSection(option);
  }

  openPreferencesModal(): void {
    this.showPreferencesModal = true;
  }

  closePreferencesModal(): void {
    this.showPreferencesModal = false;
  }

  get currentDescription(): string {
    return this.sectionDescriptions[this.selectedOption] || 'Explora las configuraciones disponibles en este módulo.';
  }

  private resolveInitialSelection(): string {
    const firstSection = this.sidebarSections[0];
    const firstItem = firstSection?.items[0];
    return firstItem?.label || 'Información general';
  }

  private buildNotificationsModel(): TableModel<NotificationRow> {
    const data: NotificationRow[] = this.productUpdates.map(update => ({
      title: update.title,
      type: update.type,
      daysAgo: update.daysAgo,
      description: update.description,
      linkLabel: update.linkLabel
    }));

    return {
      entityName: 'Notificaciones',
      tableConfig: {
        pageSize: 10,
        enableFiltering: false,
        enableSorting: false,
        showPagination: false,
        showRowSelection: false,
        showIndexColumn: false,
        showCreateButton: false,
        emptyMessage: 'No hay notificaciones recientes.'
      },
      columns: [
        { key: 'title', header: 'Título', columnType: 'text', visible: true },
        { key: 'type', header: 'Tipo', columnType: 'text', visible: true },
        { key: 'daysAgo', header: 'Actualización', columnType: 'text', visible: true },
        { key: 'description', header: 'Descripción', columnType: 'text', visible: true },
        { key: 'linkLabel', header: 'Referencia', columnType: 'text', visible: true }
      ],
      data
    };
  }
  private navigateToSection(option: string): void {
    this.selectedOption = option;
    this.clearDetailView();
    const slug = this.getSlug(option);
    if (option === this.defaultSection || !slug) {
      this.router.navigate(['/administration'], {
        queryParams: { view: null, returnTo: null },
        queryParamsHandling: 'merge'
      });
      return;
    }
    this.router.navigate(['/administration', slug], {
      queryParams: { view: null, returnTo: null },
      queryParamsHandling: 'merge'
    });
  }

  private clearDetailView(): void {
    this.detailView = null;
  }

  private buildLabelToSlugMap(): Record<string, string> {
    return this.sidebarSections.reduce<Record<string, string>>((acc, section) => {
      section.items.forEach(item => {
        const slug = this.slugOverrides[item.label] ?? this.slugify(item.label);
        if (slug) {
          acc[item.label] = slug;
        }
      });
      return acc;
    }, {});
  }

  private buildSlugToLabelMap(): Record<string, string> {
    return Object.entries(this.labelToSlugMap).reduce<Record<string, string>>((acc, [label, slug]) => {
      acc[slug] = label;
      return acc;
    }, {});
  }

  private getSlug(label: string): string {
    return this.labelToSlugMap[label] ?? this.slugify(label);
  }

  private slugify(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
