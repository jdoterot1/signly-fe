import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { FlowService } from '../../../core/services/flow/flow.service';
import { FlowState, FlowChallengeType } from '../../../core/models/flow/flow.model';

@Component({
  selector: 'app-flow-complete',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './flow-complete.component.html'
})
export class FlowCompleteComponent implements OnInit {
  processId = '';
  flowState: FlowState | null = null;

  constructor(
    private route: ActivatedRoute,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();
  }

  getStepLabel(step: FlowChallengeType): string {
    const labels: Record<FlowChallengeType, string> = {
      biometric: 'Verificacion biometrica',
      otp_email: 'Codigo por correo',
      otp_sms: 'Codigo por SMS',
      otp_whatsapp: 'Codigo por WhatsApp',
      liveness: 'Prueba de vida'
    };
    return labels[step] || step;
  }

  getStepIcon(step: FlowChallengeType): string {
    const icons: Record<FlowChallengeType, string> = {
      biometric: 'pi pi-id-card',
      otp_email: 'pi pi-envelope',
      otp_sms: 'pi pi-mobile',
      otp_whatsapp: 'pi pi-whatsapp',
      liveness: 'pi pi-camera'
    };
    return icons[step] || 'pi pi-check-circle';
  }

  closeWindow(): void {
    // Clear flow state
    this.flowService.clearFlowState();

    // Try to close the window (only works if opened via script)
    if (window.opener) {
      window.close();
    }
  }
}
