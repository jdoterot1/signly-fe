// src/app/features/dashboard/dashboard.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';

interface Shortcut {
  label: string;
  description: string;
  path: string;
  color: 'indigo' | 'violet' | 'emerald' | 'teal' | 'cyan' | 'amber' | 'rose' | 'sky';
  icon: 'users' | 'shield' | 'office' | 'doc' | 'wallet' | 'bolt' | 'chart' | 'link';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardComponent {
  readonly shortcuts: Shortcut[] = [
    {
      label: 'Usuarios',
      description: 'Gestiona perfiles y accesos del equipo',
      path: '/users',
      color: 'indigo',
      icon: 'users'
    },
    {
      label: 'Roles y permisos',
      description: 'Configura los roles y privilegios',
      path: '/roles',
      color: 'violet',
      icon: 'shield'
    },
    {
      label: 'Plantillas',
      description: 'Administra plantillas de firma electrónica',
      path: '/templates',
      color: 'emerald',
      icon: 'doc'
    },
    {
      label: 'Documentos',
      description: 'Revisa procesos y documentos en curso',
      path: '/documents',
      color: 'teal',
      icon: 'office'
    },
    {
      label: 'Auditoría',
      description: 'Monitorea las actividades recientes',
      path: '/audit',
      color: 'amber',
      icon: 'chart'
    },
    {
      label: 'Historial de auditoría',
      description: 'Explora registros históricos',
      path: '/audit-logs',
      color: 'rose',
      icon: 'bolt'
    }
  ];

  constructor(private authService: AuthService) {}

  get displayName(): string {
    const session = this.authService.getSession();
    const email = session?.user.email ?? '';
    const name = session?.user.name ?? '';

    const resolvedName = name || email;
    const hour = new Date().getHours();
    const greeting =
      hour >= 5 && hour < 12
        ? 'Buenos días'
        : hour >= 12 && hour < 19
          ? 'Buenas tardes'
          : 'Buenas noches';

    return resolvedName ? `${greeting}, ${resolvedName}` : greeting;
  }
}
