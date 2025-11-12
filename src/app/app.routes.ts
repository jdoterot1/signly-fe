// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { LoginComponent }           from './features/auth/login/login.component';
import { ForgotPasswordComponent }  from './features/auth/forgot-password/forgot-password.component';
import { OtpComponent }             from './features/auth/otp/otp.component';
import { ResetPasswordComponent }   from './features/auth/reset-password/reset-password.component';
import { CompletePasswordComponent } from './features/auth/complete-password/complete-password.component';
import { LayoutComponent }          from './core/layout/layout/layout.component';
import { DashboardComponent }       from './features/dashboard/dashboard.component';
// importa aquí otros componentes o feature-modules que deban ir bajo el layout
import { authGuard, authChildGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // 1) Rutas públicas (sin layout)
  { path: 'login',           component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp',             component: OtpComponent },
  { path: 'reset-password',  component: ResetPasswordComponent },
  { path: 'complete-password', component: CompletePasswordComponent },

  // 2) Bloque con layout (header/sidebar/footer)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'documents',
        loadChildren: () =>
          import('./core/modules/documents/document.module').then(m => m.DocumentModule)
      },
      {
        path: 'document-mapper',
        loadChildren: () =>
          import('./core/modules/document-mapper/document-mapper.module').then(
            m => m.DocumentMapperModule
          )
      },
      {
        path: 'templates',
        loadChildren: () =>
          import('./core/modules/templates/template.module').then(m => m.TemplateModule)
      },
      {
        path: 'roles',
        loadChildren: () =>
          import('./core/modules/roles/roles.module').then(m => m.RolesModule)
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./core/modules/audit/audit.module').then(m => m.AuditModule)
      },
      {
        path: 'audit-logs',
        loadChildren: () =>
          import('./core/modules/audit/logs/auditlogs.module').then(m => m.AuditLogsModule)
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./core/modules/user/user.module').then(m => m.UsersModule)
      },
      {
        path: 'webhooks',
        loadChildren: () =>
          import('./core/modules/webhooks/webhooks.module').then(m => m.WebhooksModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
];
