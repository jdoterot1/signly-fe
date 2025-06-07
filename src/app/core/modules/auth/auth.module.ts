// src/app/core/modules/auth/auth.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '../../../features/auth/login/login.component';
import { ForgotPasswordComponent } from '../../../features/auth/forgot-password/forgot-password.component';
import { OtpComponent } from '../../../features/auth/otp/otp.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp', component: OtpComponent }
];

@NgModule({
  imports: [
    LoginComponent,
    ForgotPasswordComponent,
    OtpComponent,
    RouterModule.forChild(routes)
  ]
})
export class AuthModule {}
