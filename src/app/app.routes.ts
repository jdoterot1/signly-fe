// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { LoginComponent }           from './features/auth/login/login.component';
import { ForgotPasswordComponent }  from './features/auth/forgot-password/forgot-password.component';
import { OtpComponent }             from './features/auth/otp/otp.component';
import { ResetPasswordComponent }   from './features/auth/reset-password/reset-password.component';
import { CompletePasswordComponent } from './features/auth/complete-password/complete-password.component';
import { RegisterComponent }        from './features/auth/register/register.component';
import { LayoutComponent }          from './core/layout/layout/layout.component';
import { HomeComponent }       from './features/home/home.component';
// importa aquí otros componentes o feature-modules que deban ir bajo el layout
import { authGuard, authChildGuard } from './core/guards/auth.guard';
import { paymentRedirectGuard } from './core/guards/payment-redirect.guard';

export const routes: Routes = [
  // 1) Rutas públicas (sin layout)
  { path: 'login',           component: LoginComponent },
  { path: 'register',        component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp',             component: OtpComponent },
  { path: 'reset-password',  component: ResetPasswordComponent },
  { path: 'complete-password', component: CompletePasswordComponent },
  {
    path: 'process',
    loadChildren: () =>
      import('./core/modules/process/process.module').then(m => m.ProcessModule)
  },
  {
    path: 'flow',
    loadChildren: () =>
      import('./core/modules/flow/flow.module').then(m => m.FlowModule)
  },

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
    path: 'payment/response',
    loadComponent: () =>
      import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
    // ePayco redirige a una sola URL; el componente resuelve el estado desde query params
    data: { kind: 'payment_pending' }
  },
  // 2) Bloque con layout (header/sidebar/footer)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [paymentRedirectGuard, authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'dashboard', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'billing/payment/return',
        loadComponent: () =>
          import('./features/status-pages/status-page.component').then(m => m.StatusPageComponent),
        data: { kind: 'payment_pending' }
      },
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
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: '**', redirectTo: '/404' }
    ]
  },
];
