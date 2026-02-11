import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DocumentMapperComponent } from '../../../features/document-mapper/document-mapper.component';

const routes: Routes = [{ path: '', component: DocumentMapperComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes), DocumentMapperComponent]
})
export class DocumentMapperModule {}
