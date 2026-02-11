// src/app/core/modules/auth/auth.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '../../../features/auth/login/login.component';
import { ForgotPasswordComponent } from '../../../features/auth/forgot-password/forgot-password.component';
import { OtpComponent } from '../../../features/auth/otp/otp.component';
import { RegisterComponent } from '../../../features/auth/register/register.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'otp', component: OtpComponent }
];

@NgModule({
  imports: [
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    OtpComponent,
    RouterModule.forChild(routes)
  ]
})
export class AuthModule {}
