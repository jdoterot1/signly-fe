import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';

interface TemplateCard {
  title: string
  description: string
  tag: string
  path: string
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard.component.html",
  styleUrls: [],
})
export class DashboardComponent {
  readonly onboardingProgress = {
    title: 'Enviar documentos para firma',
    current: 0,
    total: 4
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

  constructor(private authService: AuthService) {}

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
}
