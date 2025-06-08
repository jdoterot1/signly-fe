import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importando standalone components desde sus nuevas rutas
import { DocumentListComponent }      from '../../../features/documents/list/document-list.component';
import { DocumentNewComponent }       from '../../../features/documents/new/document-new.component';
import { DocumentConfigureComponent } from '../../../features/documents/configure/document-configure.component';
import { DocumentFilesComponent }     from '../../../features/documents/files/document-files.component';
import { DocumentDetailComponent }    from '../../../features/documents/detail/document-detail.component';

const routes: Routes = [
  { path: '',                      component: DocumentListComponent },
  { path: 'new',                   component: DocumentNewComponent },
  { path: ':documentId/configure', component: DocumentConfigureComponent },
  { path: ':documentId/files',     component: DocumentFilesComponent },
  { path: ':documentId',           component: DocumentDetailComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    DocumentListComponent,
    DocumentNewComponent,
    DocumentConfigureComponent,
    DocumentFilesComponent,
    DocumentDetailComponent
  ]
})
export class DocumentModule {}