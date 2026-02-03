import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importando standalone components desde sus nuevas rutas
import { DocumentCreateComponent }       from '../../../features/documents/create/document-add.component';
import { DocumentsCenterComponent } from '../../../features/documents/center/documents-center.component';
import { DocumentDetailComponent } from '../../../features/documents/detail/document-detail.component';


const routes: Routes = [
  { path: '',                      component: DocumentsCenterComponent },
  { path: 'create',                   component: DocumentCreateComponent },
  { path: ':documentId', component: DocumentDetailComponent },

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    DocumentsCenterComponent,
    DocumentCreateComponent,
    DocumentDetailComponent
  ]
})
export class DocumentModule {}
