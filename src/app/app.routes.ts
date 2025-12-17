// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { LoginComponent }           from './features/auth/login/login.component';
import { ForgotPasswordComponent }  from './features/auth/forgot-password/forgot-password.component';
import { OtpComponent }             from './features/auth/otp/otp.component';
import { ResetPasswordComponent }   from './features/auth/reset-password/reset-password.component';
import { CompletePasswordComponent } from './features/auth/complete-password/complete-password.component';
import { RegisterComponent }        from './features/auth/register/register.component';
import { LayoutComponent }          from './core/layout/layout/layout.component';
import { DashboardComponent }       from './features/dashboard/dashboard.component';
// importa aquí otros componentes o feature-modules que deban ir bajo el layout
import { authGuard, authChildGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // 1) Rutas públicas (sin layout)
  { path: 'login',           component: LoginComponent },
  { path: 'register',        component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp',             component: OtpComponent },
  { path: 'reset-password',  component: ResetPasswordComponent },
  { path: 'complete-password', component: CompletePasswordComponent },

  // 1.1) Pantallas de estado (sin header/footer)
  {
    path: '404',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: '404' }
  },
  {
    path: '500',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: '500' }
  },
  {
    path: 'payment/success',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: 'payment_success' }
  },
  {
    path: 'payment/pending',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: 'payment_pending' }
  },
  {
    path: 'payment/failed',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: 'payment_failed' }
  },
  {
    path: 'payment/cancelled',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    data: { kind: 'payment_cancelled' }
  },

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
        path: 'reports',
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
      {
        path: 'company',
        loadChildren: () =>
          import('./core/modules/company/company.module').then(m => m.CompanyModule)
      },
      {
        path: 'administration',
        loadComponent: () =>
          import('./features/administration/administration.component').then(m => m.AdministrationComponent)
      },
      {
        path: 'administration/orders/:id',
        loadComponent: () =>
          import('./features/administration/administration.component').then(m => m.AdministrationComponent),
        data: { section: 'orders' }
      },
      {
        path: 'administration/invoices/:id',
        loadComponent: () =>
          import('./features/administration/administration.component').then(m => m.AdministrationComponent),
        data: { section: 'invoices' }
      },
      {
        path: 'administration/audit-log/:id',
        loadComponent: () =>
          import('./features/administration/administration.component').then(m => m.AdministrationComponent),
        data: { section: 'audit-log' }
      },
      {
        path: 'administration/:section',
        loadComponent: () =>
          import('./features/administration/administration.component').then(m => m.AdministrationComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: '/404' }
    ]
  },
];
