import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WebhookListComponent } from '../../../features/webhooks/list/webhook-list.component';
import { WebhookCreateComponent } from '../../../features/webhooks/create/webhook-create.component';
import { WebhookUpdateComponent } from '../../../features/webhooks/update/webhook-update.component';

const routes: Routes = [
  { path: '', component: WebhookListComponent },
  { path: 'create', component: WebhookCreateComponent },
  {
    path: ':id/view',
    loadComponent: () =>
      import('../../../features/webhooks/detail/webhook-detail.component').then(m => m.WebhookDetailComponent)
  },
  { path: ':id/update', component: WebhookUpdateComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    WebhookListComponent,
    WebhookCreateComponent,
    WebhookUpdateComponent
  ]
})
export class WebhooksModule {}
