import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importando standalone components desde sus nuevas rutas
import { DocumentCreateComponent }       from '../../../features/documents/create/document-add.component';
import { DocumentsCenterComponent } from '../../../features/documents/center/documents-center.component';


const routes: Routes = [
  { path: '',                      component: DocumentsCenterComponent },
  { path: 'create',                   component: DocumentCreateComponent },

];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    DocumentsCenterComponent,
    DocumentCreateComponent
  ]
})
export class DocumentModule {}
