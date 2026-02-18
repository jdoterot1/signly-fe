import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AdminSidebarComponent,
  AdminSidebarSection,
} from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { UsersListComponent } from '../user/list/user-list.component';
import { RolesListComponent } from '../roles/list/roles-list.component';
import { RolesCreateComponent } from '../roles/create/roles-add.component';
import { CompanySettingsComponent } from '../company/company-settings.component';
import { CompanyBrandingComponent } from '../company/company-branding.component';
import { CompanyBillingComponent } from '../company/company-billing.component';
import { PricingMetersComponent } from '../pricing/pricing-meters.component';
import { PricingCalculatorComponent } from '../pricing/pricing-calculator.component';
import { BillingOrdersComponent } from '../billing/orders/billing-orders.component';
import { BillingInvoicesComponent } from '../billing/invoices/billing-invoices.component';
import { BillingOrderDetailComponent } from '../billing/orders/billing-order-detail.component';
import { BillingInvoiceDetailComponent } from '../billing/invoices/billing-invoice-detail.component';
import { TableComponent } from '../../shared/table/table.component';
import { TableModel } from '../../shared/table/table.model';
import { WebhookListComponent } from '../webhooks/list/webhook-list.component';
import { WalletComponent } from '../wallet/wallet.component';
import { AuditListComponent } from '../audit/list/audit-list.component';
import { LogsListComponent } from '../audit/logs/logs-list.component';
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
    PricingMetersComponent,
    PricingCalculatorComponent,
    BillingOrdersComponent,
    BillingInvoicesComponent,
    BillingOrderDetailComponent,
    BillingInvoiceDetailComponent,
    TableComponent,
    WebhookListComponent,
    WalletComponent,
    AuditListComponent,
    LogsListComponent,
    TranslateModule,
  ],
  templateUrl: './administration.component.html',
})
export class AdministrationComponent implements OnInit, OnDestroy {
  ownerName = 'Usuario';
  accountId = '000000000';
  showPreferencesModal = false;

  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'ADMINISTRATION.SECTIONS.GENERAL',
      items: [{ label: 'ADMINISTRATION.SECTIONS.GENERAL' }],
    },
    {
      label: 'ADMINISTRATION.SECTIONS.ACCOUNT',
      items: [
        { label: 'ADMINISTRATION.SECTIONS.COMPANY' },
        { label: 'ADMINISTRATION.SECTIONS.BRANDING' },
        { label: 'ADMINISTRATION.SECTIONS.CALCULATOR' },
      ],
    },
    {
      label: 'ADMINISTRATION.SECTIONS.BILLING',
      items: [
        { label: 'ADMINISTRATION.SECTIONS.BILLING_SECTION' },
        { label: 'ADMINISTRATION.SECTIONS.ORDERS' },
        { label: 'ADMINISTRATION.SECTIONS.INVOICES' },
        { label: 'ADMINISTRATION.SECTIONS.PRICING' },
        { label: 'ADMINISTRATION.SECTIONS.WALLET' },
      ],
    },
    {
      label: 'ADMINISTRATION.SECTIONS.USER_MANAGEMENT',
      items: [
        { label: 'ADMINISTRATION.SECTIONS.USERS' },
        { label: 'ADMINISTRATION.SECTIONS.ROLES' },
      ],
    },
    {
      label: 'ADMINISTRATION.SECTIONS.INTEGRATIONS',
      items: [
        { label: 'ADMINISTRATION.SECTIONS.APPS_KEYS' },
        { label: 'ADMINISTRATION.SECTIONS.API_CENTER' },
        { label: 'ADMINISTRATION.SECTIONS.WEBHOOKS' },
      ],
    },
    {
      label: 'ADMINISTRATION.SECTIONS.AUDIT',
      items: [{ label: 'ADMINISTRATION.SECTIONS.AUDIT_LOG' }],
    },
  ];

  readonly sectionDescriptions: Record<string, string> = {
    'ADMINISTRATION.SECTIONS.GENERAL': 'ADMINISTRATION.DESCRIPTIONS.GENERAL',
    'ADMINISTRATION.SECTIONS.COMPANY': 'ADMINISTRATION.DESCRIPTIONS.COMPANY',
    'ADMINISTRATION.SECTIONS.BRANDING': 'ADMINISTRATION.DESCRIPTIONS.BRANDING',
    'ADMINISTRATION.SECTIONS.CALCULATOR':
      'ADMINISTRATION.DESCRIPTIONS.CALCULATOR',
    'ADMINISTRATION.SECTIONS.BILLING_SECTION':
      'ADMINISTRATION.DESCRIPTIONS.BILLING',
    'ADMINISTRATION.SECTIONS.ORDERS': 'ADMINISTRATION.DESCRIPTIONS.ORDERS',
    'ADMINISTRATION.SECTIONS.INVOICES': 'ADMINISTRATION.DESCRIPTIONS.INVOICES',
    'ADMINISTRATION.SECTIONS.PRICING': 'ADMINISTRATION.DESCRIPTIONS.PRICING',
    'ADMINISTRATION.SECTIONS.WALLET': 'ADMINISTRATION.DESCRIPTIONS.WALLET',
    'ADMINISTRATION.SECTIONS.USERS': 'ADMINISTRATION.DESCRIPTIONS.USERS',
    'ADMINISTRATION.SECTIONS.ROLES': 'ADMINISTRATION.DESCRIPTIONS.ROLES',
    'ADMINISTRATION.SECTIONS.APPS_KEYS':
      'ADMINISTRATION.DESCRIPTIONS.APPS_KEYS',
    'ADMINISTRATION.SECTIONS.API_CENTER':
      'ADMINISTRATION.DESCRIPTIONS.API_CENTER',
    'ADMINISTRATION.SECTIONS.WEBHOOKS': 'ADMINISTRATION.DESCRIPTIONS.WEBHOOKS',
    'ADMINISTRATION.SECTIONS.AUDIT_LOG':
      'ADMINISTRATION.DESCRIPTIONS.AUDIT_LOG',
  };

  readonly quickAccess: QuickAccessItem[] = [
    {
      label: 'ADMINISTRATION.QUICK_ACCESS.BILLING_LABEL',
      description: 'ADMINISTRATION.QUICK_ACCESS.BILLING_DESC',
      target: 'ADMINISTRATION.SECTIONS.BILLING_SECTION',
    },
    {
      label: 'ADMINISTRATION.QUICK_ACCESS.USERS_LABEL',
      description: 'ADMINISTRATION.QUICK_ACCESS.USERS_DESC',
      target: 'ADMINISTRATION.SECTIONS.USERS',
    },
    {
      label: 'ADMINISTRATION.QUICK_ACCESS.APPS_LABEL',
      description: 'ADMINISTRATION.QUICK_ACCESS.APPS_DESC',
      target: 'ADMINISTRATION.SECTIONS.APPS_KEYS',
    },
  ];

  readonly productUpdates: ProductUpdate[] = [
    {
      type: 'ADMINISTRATION.PRODUCT_UPDATE.TYPE',
      daysAgo: 'ADMINISTRATION.PRODUCT_UPDATE.DAYS_AGO_22',
      title: 'ADMINISTRATION.PRODUCT_UPDATE.BASIC_VERSION',
      description: 'ADMINISTRATION.PRODUCT_UPDATE.BASIC_DESC',
      linkLabel: 'ADMINISTRATION.PRODUCT_UPDATE.BASIC_LINK',
    },
    {
      type: 'ADMINISTRATION.PRODUCT_UPDATE.TYPE',
      daysAgo: 'ADMINISTRATION.PRODUCT_UPDATE.DAYS_AGO_27',
      title: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_VERSION',
      description: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_DESC',
      linkLabel: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_LINK',
    },
    {
      type: 'ADMINISTRATION.PRODUCT_UPDATE.TYPE',
      daysAgo: 'ADMINISTRATION.PRODUCT_UPDATE.DAYS_AGO_34',
      title: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_VERSION',
      description: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_DESC',
      linkLabel: 'ADMINISTRATION.PRODUCT_UPDATE.ADMIN_LINK',
    },
  ];

  readonly notificationTableModel: TableModel<NotificationRow> =
    this.buildNotificationsModel();

  private readonly defaultSection = this.resolveInitialSelection();
  private readonly slugOverrides: Record<string, string> = {
    'Información general': 'overview',
    Compañía: 'company',
    'Branding y correos': 'branding',
    Calculadora: 'calculator',
    Facturación: 'billing',
    Órdenes: 'orders',
    Facturas: 'invoices',
    Precios: 'pricing',
    Billetera: 'wallet',
    Usuarios: 'users',
    'Aplicaciones y claves': 'apps-and-keys',
    'Centro de uso de la API': 'api-usage',
    Webhooks: 'webhooks',
    Roles: 'roles',
    'Eliminar firmas y envíos': 'delete-signatures-sends',
    'Registro de auditoría': 'audit-log',
  };
  private readonly labelToSlugMap = this.buildLabelToSlugMap();
  private readonly slugToLabelMap = this.buildSlugToLabelMap();

  selectedOption = this.defaultSection;
  detailView: string | null = null;
  detailId: string | null = null;
  readonly rolesReturnTo = '/administration/roles';
  private routeSub?: Subscription;
  private querySub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.hydrateOwnerFromSession();
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug =
        params.get('section') ??
        (this.route.snapshot.data?.['section'] as string | undefined) ??
        null;
      this.detailId = params.get('id');
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

    this.querySub = this.route.queryParamMap.subscribe((params) => {
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
    const descKey = this.sectionDescriptions[this.selectedOption];
    return descKey
      ? this.translate.instant(descKey)
      : this.translate.instant('ADMINISTRATION.DEFAULT_DESC');
  }

  private resolveInitialSelection(): string {
    const firstSection = this.sidebarSections[0];
    const firstItem = firstSection?.items[0];
    return firstItem?.label || 'Información general';
  }

  private buildNotificationsModel(): TableModel<NotificationRow> {
    const data: NotificationRow[] = this.productUpdates.map((update) => ({
      title: update.title,
      type: update.type,
      daysAgo: update.daysAgo,
      description: update.description,
      linkLabel: update.linkLabel,
    }));

    return {
      entityName: 'ADMINISTRATION.NOTIFICATIONS_TABLE.TITLE',
      tableConfig: {
        pageSize: 10,
        enableFiltering: false,
        enableSorting: false,
        showPagination: false,
        showRowSelection: false,
        showIndexColumn: false,
        showCreateButton: false,
        emptyMessage: 'ADMINISTRATION.NOTIFICATIONS_TABLE.EMPTY',
      },
      columns: [
        {
          key: 'title',
          header: 'ADMINISTRATION.NOTIFICATIONS_TABLE.HEADER_TITLE',
          columnType: 'text',
          visible: true,
          translate: true,
        },
        {
          key: 'type',
          header: 'ADMINISTRATION.NOTIFICATIONS_TABLE.HEADER_TYPE',
          columnType: 'text',
          visible: true,
          translate: true,
        },
        {
          key: 'daysAgo',
          header: 'ADMINISTRATION.NOTIFICATIONS_TABLE.HEADER_UPDATE',
          columnType: 'text',
          visible: true,
          translate: true,
        },
        {
          key: 'description',
          header: 'ADMINISTRATION.NOTIFICATIONS_TABLE.HEADER_DESC',
          columnType: 'text',
          visible: true,
          translate: true,
        },
        {
          key: 'linkLabel',
          header: 'ADMINISTRATION.NOTIFICATIONS_TABLE.HEADER_REF',
          columnType: 'text',
          visible: true,
          translate: true,
        },
      ],
      data,
    };
  }
  private navigateToSection(option: string): void {
    this.selectedOption = option;
    this.clearDetailView();
    const slug = this.getSlug(option);
    if (option === this.defaultSection || !slug) {
      this.router.navigate(['/administration'], {
        queryParams: { view: null, returnTo: null },
        queryParamsHandling: 'merge',
      });
      return;
    }
    this.router.navigate(['/administration', slug], {
      queryParams: { view: null, returnTo: null },
      queryParamsHandling: 'merge',
    });
  }

  private clearDetailView(): void {
    this.detailView = null;
  }

  private buildLabelToSlugMap(): Record<string, string> {
    return this.sidebarSections.reduce<Record<string, string>>(
      (acc, section) => {
        section.items.forEach((item) => {
          const slug =
            this.slugOverrides[item.label] ?? this.slugify(item.label);
          if (slug) {
            acc[item.label] = slug;
          }
        });
        return acc;
      },
      {},
    );
  }

  private buildSlugToLabelMap(): Record<string, string> {
    return Object.entries(this.labelToSlugMap).reduce<Record<string, string>>(
      (acc, [label, slug]) => {
        acc[slug] = label;
        return acc;
      },
      {},
    );
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
