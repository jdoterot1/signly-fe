import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuditListComponent } from '../../../features/audit/list/audit-list.component';

const routes: Routes = [
  { path: '', component: AuditListComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AuditListComponent
  ]
})
export class AuditModule {}
