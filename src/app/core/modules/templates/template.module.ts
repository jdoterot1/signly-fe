// src/app/core/modules/templates/template.module.ts

import { NgModule }       from '@angular/core';
import { RouterModule,
         Routes }         from '@angular/router';

import { TemplateListComponent }      from '../../../features/templates/list/template-list.component';


const routes: Routes = [
  { path: '',                    component: TemplateListComponent },

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    TemplateListComponent
  ]
})
export class TemplateModule {}
