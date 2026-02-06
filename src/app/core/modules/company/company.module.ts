import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CompanySettingsComponent } from '../../../features/company/company-settings.component';

const routes: Routes = [{ path: '', component: CompanySettingsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes), CompanySettingsComponent]
})
export class CompanyModule {}
