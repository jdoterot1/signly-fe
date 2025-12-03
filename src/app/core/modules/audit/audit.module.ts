import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportsCenterComponent } from '../../../features/audit/center/reports-center.component';

const routes: Routes = [
  { path: '', component: ReportsCenterComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    ReportsCenterComponent
  ]
})
export class AuditModule {}
