import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AdminSidebarComponent, AdminSidebarSection } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { UsersListComponent } from '../user/list/user-list.component';
import { RolesListComponent } from '../roles/list/roles-list.component';
import { TableComponent } from '../../shared/table/table.component';
import { TableModel } from '../../shared/table/table.model';

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
  imports: [CommonModule, AdminSidebarComponent, UsersListComponent, RolesListComponent, TableComponent],
  templateUrl: './administration.component.html'
})
export class AdministrationComponent implements OnInit, OnDestroy {
  readonly ownerName = 'Juan Otero';
  readonly accountId = '224168021';
  showPreferencesModal = false;

  readonly sidebarSections: AdminSidebarSection[] = [
    {
      label: 'Información general',
      items: [{ label: 'Información general' }]
    },
    {
      label: 'Cuenta',
      items: [
        { label: 'Plan y facturación' },
        { label: 'Perfil de la cuenta' },
        { label: 'Configuración de la seguridad' },
        { label: 'Configuración regional' },
        { label: 'Marca', icon: 'assets/icons/sidebar/Settings.svg' },
        { label: 'Sellos' },
        { label: 'Actualizaciones' },
        { label: 'Calculadora del valor' }
      ]
    },
    {
      label: 'Usuarios y grupos',
      items: [
        { label: 'Usuarios' },
        { label: 'Perfiles de permisos' },
        { label: 'Grupos' }
      ]
    },
    {
      label: 'Firma y envío',
      items: [
        { label: 'Configuración de firmas' },
        { label: 'Configuración de envíos' },
        { label: 'Preferencias de correo electrónico' },
        { label: 'Transferencia de la custodia' },
        { label: 'Retención de documentos' },
        { label: 'Revelación de información legal' },
        { label: 'Recordatorios y caducidad' },
        { label: 'Comentarios' },
        { label: 'Campos personalizados de documento' },
        { label: 'Campos personalizados del sobre' }
      ]
    },
    {
      label: 'Integraciones',
      items: [
        { label: 'App Center' },
        { label: 'Connect' },
        { label: 'Aplicaciones y claves' },
        { label: 'Centro de uso de la API' },
        { label: 'CORS' }
      ]
    },
    {
      label: 'Acciones de los acuerdos',
      items: [
        { label: 'Reglas' },
        { label: 'Conexiones' }
      ]
    },
    {
      label: 'Auditoría',
      items: [
        { label: 'Registros de auditoría' },
        { label: 'Acciones en bloque' }
      ]
    }
  ];

  readonly sectionDescriptions: Record<string, string> = {
    'Información general': 'Monitorea novedades del producto, anuncios críticos y accesos rápidos a la configuración.',
    'Plan y facturación': 'Gestiona el plan vigente, métodos de pago, ciclos de facturación y facturas emitidas.',
    'Perfil de la cuenta': 'Actualiza el nombre legal, ID de la cuenta y contactos principales.',
    'Configuración de la seguridad': 'Controla sesiones, autenticación multifactor y políticas de acceso.',
    'Configuración regional': 'Establece el idioma, zona horaria y formato numérico para tu equipo.',
    Marca: 'Sube tu logo, define colores y personaliza la experiencia de firma.',
    Sellos: 'Administra sellos oficiales y asigna permisos de uso.',
    Actualizaciones: 'Activa nuevas funcionalidades y canales beta para tu organización.',
    'Calculadora del valor': 'Mide el impacto financiero de tus flujos de firma digital.',
    Usuarios: 'Administra usuarios, invita nuevos miembros y define su estado.',
    'Perfiles de permisos': 'Crea paquetes de permisos reutilizables para tus equipos.',
    Grupos: 'Organiza usuarios por áreas y controla accesos masivos.',
    'Configuración de firmas': 'Configura el flujo del firmante y la experiencia de firma.',
    'Configuración de envíos': 'Define reglas para emisores, plantillas y rutas de envío.',
    'Preferencias de correo electrónico': 'Personaliza notificaciones transaccionales y recordatorios.',
    'Transferencia de la custodia': 'Transfiere sobres y plantillas cuando cambian responsables.',
    'Retención de documentos': 'Aplica políticas de retención y borrado automático.',
    'Revelación de información legal': 'Gestiona textos legales y consentimientos.',
    'Recordatorios y caducidad': 'Controla la caducidad de los sobres y recordatorios automáticos.',
    Comentarios: 'Activa comentarios colaborativos y define quién puede usarlos.',
    'Campos personalizados de documento': 'Crea campos personalizados reutilizables en documentos.',
    'Campos personalizados del sobre': 'Define campos personalizados a nivel de sobre.',
    'App Center': 'Explora integraciones listas para conectar con Signly.',
    Connect: 'Automatiza eventos y webhooks con Signly Connect.',
    'Aplicaciones y claves': 'Gestiona credenciales para desarrolladores y API keys.',
    'Centro de uso de la API': 'Monitorea uso y límites de tus integraciones.',
    CORS: 'Configura dominios de origen permitidos para tus apps.',
    Reglas: 'Automatiza acciones posteriores a la firma.',
    Conexiones: 'Sincroniza tus acuerdos con sistemas externos.',
    'Registros de auditoría': 'Consulta cada acción registrada para auditoría.',
    'Acciones en bloque': 'Aplica cambios masivos de manera segura.'
  };

  readonly quickAccess: QuickAccessItem[] = [
    {
      label: 'Plan y facturación',
      description: 'Actualiza ciclos y métodos de pago.',
      target: 'Plan y facturación'
    },
    {
      label: 'Usuarios',
      description: 'Gestiona invitaciones y permisos.',
      target: 'Usuarios'
    },
    {
      label: 'Configuración de firmas',
      description: 'Define la experiencia de firma.',
      target: 'Configuración de firmas'
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

  selectedOption = this.resolveInitialSelection();
  private readonly validSections = new Set<string>(
    this.sidebarSections.reduce<string[]>((acc, section) => {
      section.items.forEach(item => acc.push(item.label));
      return acc;
    }, [])
  );
  private querySub?: Subscription;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      if (section && this.validSections.has(section)) {
        this.selectedOption = section;
      } else {
        this.selectedOption = this.resolveInitialSelection();
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
      queryParams: { section: option === 'Información general' ? null : option },
      queryParamsHandling: 'merge'
    });
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
}
