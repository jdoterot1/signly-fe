// src/app/core/modules/users/users.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UsersListComponent } from '../../../features/user/list/user-list.component';
import { UserCreateComponent } from '../../../features/user/create/user-add.component';
import { UserUpdateComponent } from '../../../features/user/update/user-update.component';

const routes: Routes = [
  { path: '', component: UsersListComponent },
  { path: 'create', component: UserCreateComponent },
  {
    path: ':id/view',
    loadComponent: () => import('../../../features/user/detail/user-detail.component').then(m => m.UserDetailComponent)
  },
  { path: ':id/update', component: UserUpdateComponent }

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    UsersListComponent,
    UserCreateComponent,
    UserUpdateComponent
  ]
})
export class UsersModule {}
