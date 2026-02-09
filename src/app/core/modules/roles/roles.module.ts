import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RolesListComponent } from '../../../features/roles/list/roles-list.component';
import { RolesCreateComponent } from '../../../features/roles/create/roles-add.component';
import { RolesUpdateComponent } from '../../../features/roles/update/roles-update.component';

const routes: Routes = [
  { path: '', component: RolesListComponent },
  { path: 'create', component: RolesCreateComponent },
  { path: ':id/update', component: RolesUpdateComponent }
  
  
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    RolesListComponent,
    RolesCreateComponent,
    RolesUpdateComponent
  ]
})
export class RolesModule {}
