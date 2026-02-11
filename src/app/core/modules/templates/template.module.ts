// src/app/core/modules/templates/template.module.ts

import { NgModule }       from '@angular/core';
import { RouterModule,
         Routes }         from '@angular/router';

import { TemplateCreateComponent }      from '../../../features/templates/create/template-add.component';
import { TemplatesCenterComponent } from '../../../features/templates/center/templates-center.component';
import { TemplateDetailComponent } from '../../../features/templates/detail/template-detail.component';
import { TemplateEditComponent } from '../../../features/templates/edit/template-edit.component';

const routes: Routes = [
  { path: '',                    component: TemplatesCenterComponent },
  { path: 'create', component: TemplateCreateComponent},
  { path: ':templateId/edit', component: TemplateEditComponent },
  { path: ':templateId', component: TemplateDetailComponent },

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    TemplatesCenterComponent,
    TemplateCreateComponent,
    TemplateDetailComponent,
    TemplateEditComponent
  ]
})
export class TemplateModule {}
