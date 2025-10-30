// src/app/core/modules/templates/template.module.ts

import { NgModule }       from '@angular/core';
import { RouterModule,
         Routes }         from '@angular/router';

import { TemplateListComponent }      from '../../../features/templates/list/template-list.component';
import { TemplateCreateComponent }      from '../../../features/templates/create/template-add.component';

const routes: Routes = [
  { path: '',                    component: TemplateListComponent },
  { path: 'create', component: TemplateCreateComponent},

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    TemplateListComponent
  ]
})
export class TemplateModule {}
