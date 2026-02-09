import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OtpComponent } from '../../../features/auth/otp/otp.component';
import { ProcessBiometricComponent } from '../../../features/process/biometric/process-biometric.component';
import { ProcessDpiComponent } from '../../../features/process/dpi/process-dpi.component';
import { ProcessFacialComponent } from '../../../features/process/facial/process-facial.component';
import { ProcessPreviewComponent } from '../../../features/process/preview/process-preview.component';
import { ProcessCompleteComponent } from '../../../features/process/complete/process-complete.component';

const routes: Routes = [
  { path: ':documentId/verify/otp-email', component: OtpComponent },
  { path: ':documentId/verify/otp-sms', component: OtpComponent },
  { path: ':documentId/verify/biometric', component: ProcessBiometricComponent },
  { path: ':documentId/verify/dpi', component: ProcessDpiComponent },
  { path: ':documentId/verify/facial', component: ProcessFacialComponent },
  { path: ':documentId/preview', component: ProcessPreviewComponent },
  { path: ':documentId/complete', component: ProcessCompleteComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    OtpComponent,
    ProcessBiometricComponent,
    ProcessDpiComponent,
    ProcessFacialComponent,
    ProcessPreviewComponent,
    ProcessCompleteComponent
  ]
})
export class ProcessModule {}
