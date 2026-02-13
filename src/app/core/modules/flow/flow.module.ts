import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FlowLandingComponent } from '../../../features/flow/flow-landing/flow-landing.component';
import { FlowBiometricComponent } from '../../../features/flow/flow-biometric/flow-biometric.component';
import { FlowOtpComponent } from '../../../features/flow/flow-otp/flow-otp.component';
import { FlowLivenessComponent } from '../../../features/flow/flow-liveness/flow-liveness.component';
import { FlowTemplateSignComponent } from '../../../features/flow/flow-template-sign/flow-template-sign.component';
import { FlowCompleteComponent } from '../../../features/flow/flow-complete/flow-complete.component';
import { FlowDoneComponent } from '../../../features/flow/flow-done/flow-done.component';

const routes: Routes = [
  { path: ':processId', component: FlowLandingComponent },
  { path: ':processId/biometric', component: FlowBiometricComponent },
  { path: ':processId/otp-email', component: FlowOtpComponent },
  { path: ':processId/otp-sms', component: FlowOtpComponent },
  { path: ':processId/otp-whatsapp', component: FlowOtpComponent },
  { path: ':processId/liveness', component: FlowLivenessComponent },
  { path: ':processId/template-sign', component: FlowTemplateSignComponent },
  { path: ':processId/complete', component: FlowCompleteComponent },
  { path: ':processId/done', component: FlowDoneComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    FlowLandingComponent,
    FlowBiometricComponent,
    FlowOtpComponent,
    FlowLivenessComponent,
    FlowTemplateSignComponent,
    FlowCompleteComponent,
    FlowDoneComponent
  ]
})
export class FlowModule {}
