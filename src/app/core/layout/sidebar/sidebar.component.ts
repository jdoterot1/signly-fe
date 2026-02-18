import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, type IsActiveMatchOptions } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  description?: string;
}

interface NavGroup {
  label: string;
  icon: string;
  section?: 'main' | 'secondary';
  children: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  isCollapsed = false;
  isMobileOpen = false;
  isLoggingOut = false;
  readonly singleNavItems: NavItem[] = [{ label: 'SIDEBAR.HOME', path: '/home', icon: 'assets/icons/sidebar/Dashboard.svg' }];
  readonly activeMatchOptions: IsActiveMatchOptions = {
    paths: 'subset',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'ignored'
  };
  readonly navGroups: NavGroup[] = [
    {
      label: 'SIDEBAR.DOCUMENTS',
      icon: 'assets/icons/sidebar/files.svg',
      section: 'main',
      children: [
        { label: 'SIDEBAR.TEMPLATES', path: '/templates', icon: 'assets/icons/sidebar/DocumentTemplate.svg' },
        { label: 'SIDEBAR.DOCUMENTS', path: '/documents', icon: 'assets/icons/sidebar/files.svg' },
        { label: 'SIDEBAR.MAPPER', path: '/document-mapper', icon: 'assets/icons/sidebar/DocumentTemplate.svg' }
      ]
    },
    {
      label: 'SIDEBAR.USER_MANAGEMENT',
      icon: 'assets/icons/sidebar/Roles.svg',
      section: 'main',
      children: [
        { label: 'SIDEBAR.USERS', path: '/users', icon: 'assets/icons/header/User.svg' },
        { label: 'SIDEBAR.ROLES', path: '/roles', icon: 'assets/icons/sidebar/Roles.svg' }
      ]
    },
    {
      label: 'SIDEBAR.AUDIT',
      icon: 'assets/icons/sidebar/Audit.svg',
      section: 'main',
      children: [{ label: 'SIDEBAR.USAGE_REPORTS', path: '/reports/usage', icon: 'assets/icons/sidebar/Audit.svg' }]
    },
    {
      label: 'SIDEBAR.SYSTEM',
      icon: 'assets/icons/sidebar/Settings.svg',
      section: 'secondary',
      children: [
        { label: 'SIDEBAR.WEBHOOKS', path: '/webhooks', icon: 'assets/icons/sidebar/files.svg' },
        { label: 'SIDEBAR.MY_COMPANY', path: '/company', icon: 'assets/icons/sidebar/ApoloLogo.svg' }
      ]
    }
  ];
  openGroups: Record<string, boolean> = this.navGroups.reduce<Record<string, boolean>>((acc, group) => {
    acc[group.label] = group.section !== 'secondary';
    return acc;
  }, {});

  get mainGroups(): NavGroup[] {
    return this.navGroups.filter(group => group.section !== 'secondary');
  }

  get secondaryGroups(): NavGroup[] {
    return this.navGroups.filter(group => group.section === 'secondary');
  }

  get mainSingles(): NavItem[] {
    return this.singleNavItems;
  }

  constructor(private authService: AuthService, private router: Router) {
    // Check screen size on init
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      if (!isDesktop && !this.isCollapsed) {
        // Auto-collapse on mobile/tablet
        this.isCollapsed = true;
      }
    }
  }

  private openDefaultGroups(): void {
    this.openGroups = this.navGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.label] = group.section !== 'secondary';
      return acc;
    }, {});
  }

  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    if (!this.isCollapsed) {
      this.openDefaultGroups();
    }
  }

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobile(): void {
    this.isMobileOpen = false;
  }

  toggleGroup(group: NavGroup): void {
    if (this.isCollapsed) {
      // Al hacer clic en un grupo colapsado, expandimos la barra lateral y abrimos el grupo.
      this.isCollapsed = false;
      this.openDefaultGroups();
      this.openGroups[group.label] = true;
      return;
    }
    this.openGroups[group.label] = !this.openGroups[group.label];
  }

  isGroupOpen(group: NavGroup): boolean {
    return this.openGroups[group.label];
  }

  isGroupActive(group: NavGroup): boolean {
    return group.children.some(child => this.router.isActive(child.path, this.activeMatchOptions));
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
          this.router.navigate(['/login']);
        }
      });
  }
}
