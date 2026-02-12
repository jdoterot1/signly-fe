import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs/operators';

import { UserProfileDropdownComponent } from '../../../shared/components/user-profile-dropdown/user-profile-dropdown.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../services/auth/auth.service';
import { CompanyService } from '../../services/company/company.service';

interface NotificationItem {
  title: string
  time: string
  description: string
}

interface UserMenuItem {
  label: string
  path: string
}

interface NavLink {
  label: string
  path: string
}

interface HeaderUserProfile {
  name: string
  email: string
  displayName: string
  accountInfo: string
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UserProfileDropdownComponent, ThemeToggleComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
  isNotificationsOpen = false
  isUserMenuOpen = false
  isLoggingOut = false

  @Output() pricingModalRequested = new EventEmitter<void>()

  private readonly fallbackName = 'Usuario'
  private readonly fallbackEmail = 'correo@signly.com'
  private readonly fallbackAccountInfo = 'Cuenta empresarial'

  userProfile: HeaderUserProfile = {
    name: '',
    email: '',
    displayName: '',
    accountInfo: ''
  }

  readonly planStatus = "30 días restantes"

  readonly navLinks: NavLink[] = [
    { label: "Inicio", path: "/dashboard" },
    { label: "Documentos", path: "/documents" },
    { label: "Plantillas", path: "/templates" },
    { label: "Reportes", path: "/reports/usage" },
    { label: "Administración", path: "/administration" },
  ]

  readonly notifications: NotificationItem[] = [
    {
      title: "Nuevo documento firmado",
      time: "Hace 5 min",
      description: "Contrato de prestación de servicios listo para descargar.",
    },
    {
      title: "Plantilla actualizada",
      time: "Hace 30 min",
      description: "Plantilla de NDA con nuevos campos requeridos.",
    },
    {
      title: "Recordatorio",
      time: "Hoy",
      description: "Revisa los accesos asignados a nuevos usuarios.",
    },
  ]

  readonly userMenuItems: UserMenuItem[] = [
    { label: "Mi perfil", path: "/users" },
    { label: "Preferencias", path: "/settings" },
    { label: "Notificaciones", path: "/notifications" },
  ]

  constructor(
    private elementRef: ElementRef,
    private authService: AuthService,
    private companyService: CompanyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.hydrateUserFromSession()
    this.fetchUserProfile()
    this.fetchAccountInfo()
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation()
    this.isNotificationsOpen = !this.isNotificationsOpen
    if (this.isNotificationsOpen) {
      this.isUserMenuOpen = false
    }
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation()
    this.isUserMenuOpen = !this.isUserMenuOpen
    if (this.isUserMenuOpen) {
      this.isNotificationsOpen = false
    }
  }

  closeMenus(): void {
    this.isNotificationsOpen = false
    this.isUserMenuOpen = false
  }

  openPricingModal(): void {
    this.pricingModalRequested.emit()
  }

  handleManageProfile(): void {
    console.log('Abrir administración de perfil');
  }

  handleLogout(): void {
    if (this.isLoggingOut) {
      return
    }

    this.isLoggingOut = true
    this.authService
      .logout()
      .pipe(finalize(() => (this.isLoggingOut = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/login'])
        },
        error: () => {
          this.router.navigate(['/login'])
        }
      })
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenus()
    }
  }

  get dropdownUserName(): string {
    return this.userProfile.name || this.userProfile.displayName || this.fallbackName
  }

  get dropdownUserEmail(): string {
    return this.userProfile.email || this.fallbackEmail
  }

  get dropdownAccountInfo(): string {
    return this.userProfile.accountInfo || this.fallbackAccountInfo
  }

  get dropdownDisplayName(): string {
    return this.userProfile.displayName || this.userProfile.name || this.fallbackName
  }

  get userInitials(): string {
    const source = this.dropdownDisplayName || this.dropdownUserEmail
    if (!source) {
      return this.fallbackName.substring(0, 2).toUpperCase()
    }

    const normalized = source.trim()
    if (!normalized) {
      return this.fallbackName.substring(0, 2).toUpperCase()
    }

    const parts = normalized.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    return normalized.substring(0, Math.min(2, normalized.length)).toUpperCase()
  }

  private hydrateUserFromSession(): void {
    const session = this.authService.getSession()
    if (!session?.user) {
      return
    }

    const { name, email } = session.user
    this.userProfile = {
      ...this.userProfile,
      name: name || this.userProfile.name,
      displayName: name || this.userProfile.displayName || email || '',
      email: email || this.userProfile.email
    }
  }

  private fetchUserProfile(): void {
    this.authService
      .me()
      .pipe(take(1))
      .subscribe({
        next: payload => {
          const meAttributes = (payload.attributes ?? {}) as Record<string, string | undefined>
          const attributeName = meAttributes['name'] || meAttributes['given_name']
          const resolvedName = attributeName || this.userProfile.name || this.userProfile.displayName
          const resolvedEmail = payload.attributes?.email || this.userProfile.email
          const fallbackDisplay = resolvedName || resolvedEmail || this.userProfile.displayName

          this.userProfile = {
            ...this.userProfile,
            name: resolvedName,
            displayName: fallbackDisplay,
            email: resolvedEmail
          }
        },
        error: error => {
          console.error('No se pudo cargar la información del usuario', error)
        }
      })
  }

  private fetchAccountInfo(): void {
    this.companyService
      .getGeneralInfo()
      .pipe(take(1))
      .subscribe({
        next: info => {
          const accountDisplay = info.display_name || info.legal_name || this.userProfile.accountInfo
          this.userProfile = {
            ...this.userProfile,
            accountInfo: accountDisplay
          }
        },
        error: error => {
          console.error('No se pudo cargar la información de la compañía', error)
        }
      })
  }
}
