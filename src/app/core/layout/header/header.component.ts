import { Component, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserProfileDropdownComponent } from '../../../shared/components/user-profile-dropdown/user-profile-dropdown.component';

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

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UserProfileDropdownComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  isNotificationsOpen = false
  isUserMenuOpen = false

  @Output() pricingModalRequested = new EventEmitter<void>()

  readonly planStatus = "30 días restantes"

  readonly navLinks: NavLink[] = [
    { label: "Inicio", path: "/dashboard" },
    { label: "Acuerdos", path: "/documents" },
    { label: "Plantillas", path: "/templates" },
    { label: "Reportes", path: "/audit" },
    { label: "Administración", path: "/users" },
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

  constructor(private elementRef: ElementRef) {}

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
    console.log('Cerrar sesión');
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenus()
    }
  }
}
