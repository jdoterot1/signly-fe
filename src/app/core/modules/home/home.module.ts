// src/app/core/modules/home/home.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from '../../../features/home/home.component';

const routes: Routes = [
  { path: '', component: HomeComponent }
];

@NgModule({
  imports: [
    HomeComponent,
    RouterModule.forChild(routes)
  ]
})
export class HomeModule {}
