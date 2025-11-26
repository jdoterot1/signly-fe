import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../services/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  section?: 'main' | 'secondary';
  description?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  isCollapsed = false;
  isLoggingOut = false;
  readonly navItems: NavItem[] = [
    { label: 'Inicio', path: '/dashboard', icon: 'assets/icons/sidebar/Dashboard.svg', section: 'main' },
    { label: 'Plantillas', path: '/templates', icon: 'assets/icons/sidebar/DocumentTemplate.svg', section: 'main' },
    { label: 'Documentos', path: '/documents', icon: 'assets/icons/sidebar/files.svg', section: 'main' },
    { label: 'Mapeador', path: '/document-mapper', icon: 'assets/icons/sidebar/DocumentTemplate.svg', section: 'main' },
    { label: 'Usuarios', path: '/users', icon: 'assets/icons/header/User.svg', section: 'main' },
    { label: 'Roles', path: '/roles', icon: 'assets/icons/sidebar/Roles.svg', section: 'main' },
    { label: 'Auditoría', path: '/audit', icon: 'assets/icons/sidebar/Audit.svg', section: 'main' },
    { label: 'Archivos', path: '/uploads', icon: 'assets/icons/sidebar/files.svg', section: 'secondary' },
    { label: 'Dark Mode', path: '/dark-mode', icon: 'assets/icons/sidebar/Moon.svg', section: 'secondary' },
    { label: 'Notificaciones', path: '/notifications', icon: 'assets/icons/sidebar/Bell.svg', section: 'secondary' },
    { label: 'Webhooks', path: '/webhooks', icon: 'assets/icons/sidebar/files.svg', section: 'secondary' },
    { label: 'Configuración', path: '/settings', icon: 'assets/icons/sidebar/Settings.svg', section: 'secondary' }
  ];

  get mainNav(): NavItem[] {
    return this.navItems.filter(item => item.section !== 'secondary');
  }

  get secondaryNav(): NavItem[] {
    return this.navItems.filter(item => item.section === 'secondary');
  }

  constructor(private authService: AuthService, private router: Router) {}

  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }
    this.isLoggingOut = true;
    this.authService
      .logout()
      .pipe(finalize(() => (this.isLoggingOut = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: () => {
          // Even if logout fails, clear session and redirect
          this.router.navigate(['/login']);
        }
      });
  }
}
