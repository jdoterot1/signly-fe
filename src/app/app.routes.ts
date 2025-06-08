// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { LoginComponent }           from './features/auth/login/login.component';
import { ForgotPasswordComponent }  from './features/auth/forgot-password/forgot-password.component';
import { OtpComponent }             from './features/auth/otp/otp.component';
import { LayoutComponent }          from './core/layout/layout/layout.component';
import { DashboardComponent }       from './features/dashboard/dashboard.component';
// importa aquí otros componentes o feature-modules que deban ir bajo el layout

export const routes: Routes = [
  // 1) Rutas públicas (sin layout)
  { path: 'login',           component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp',             component: OtpComponent },

  // 2) Bloque con layout (header/sidebar/footer)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'documents',
        loadChildren: () =>
          import('./core/modules/documents/document.module').then(m => m.DocumentModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

];
