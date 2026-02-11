// src/app/core/modules/audit/auditlogs.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LogsListComponent } from '../../../../features/audit/logs/logs-list.component';

const routes: Routes = [
  { path: ':id', component: LogsListComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    LogsListComponent
  ]
})
export class AuditLogsModule {}
