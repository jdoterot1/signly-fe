import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportsCenterComponent } from '../../../features/audit/center/reports-center.component';
import { UsageSummaryComponent } from '../../../features/audit/usage/usage-summary.component';

const routes: Routes = [
  { path: '', redirectTo: 'usage', pathMatch: 'full' },
  { path: 'usage', component: ReportsCenterComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    ReportsCenterComponent,
    UsageSummaryComponent
  ]
})
export class AuditModule {}
