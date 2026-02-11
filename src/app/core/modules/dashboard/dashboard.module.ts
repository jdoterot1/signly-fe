// src/app/core/modules/dashboard/dashboard.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from '../../../features/dashboard/dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardComponent }
];

@NgModule({
  imports: [
    DashboardComponent,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule {}
