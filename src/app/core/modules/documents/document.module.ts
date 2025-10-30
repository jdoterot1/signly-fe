import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importando standalone components desde sus nuevas rutas
import { DocumentListComponent }      from '../../../features/documents/list/document-list.component';
import { DocumentCreateComponent }       from '../../../features/documents/create/document-add.component';


const routes: Routes = [
  { path: '',                      component: DocumentListComponent },
  { path: 'create',                   component: DocumentCreateComponent },

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    DocumentListComponent,
    DocumentCreateComponent
  ]
})
export class DocumentModule {}