import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import { FlowState, FlowChallengeType } from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

@Component({
  selector: 'app-flow-complete',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowProgressComponent],
  templateUrl: './flow-complete.component.html'
})
export class FlowCompleteComponent implements OnInit, OnDestroy {
  processId = '';
  flowState: FlowState | null = null;

  sendCopy = true;
  email = '';
  completing = false;
  completed = false;
  completeError: string | null = null;
  completeNotice: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();

    if (this.flowState?.participant?.identity?.email) {
      this.email = this.flowState.participant.identity.email;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getStepLabel(step: FlowChallengeType): string {
    const labels: Record<FlowChallengeType, string> = {
      biometric: 'Verificacion biometrica',
      otp_email: 'Codigo por correo',
      otp_sms: 'Codigo por SMS',
      otp_whatsapp: 'Codigo por WhatsApp',
      liveness: 'Prueba de vida',
      template_sign: 'Firma del documento'
    };
    return labels[step] || step;
  }

  getStepIcon(step: FlowChallengeType): string {
    const icons: Record<FlowChallengeType, string> = {
      biometric: 'pi pi-id-card',
      otp_email: 'pi pi-envelope',
      otp_sms: 'pi pi-mobile',
      otp_whatsapp: 'pi pi-whatsapp',
      liveness: 'pi pi-camera',
      template_sign: 'pi pi-pencil'
    };
    return icons[step] || 'pi pi-check-circle';
  }

  completeFlow(): void {
    if (!this.processId || this.completing) return;

    this.completing = true;
    this.completeError = null;
    this.completeNotice = null;
    const recipientEmail = (this.email || '').trim();
    const shouldSendCopy = this.sendCopy && !!recipientEmail;

    const sub = this.flowService.completeFlow(this.processId, {
      sendCopy: shouldSendCopy,
      email: recipientEmail
    }).subscribe({
      next: () => {
        if (shouldSendCopy) {
          this.completeNotice = `Enviamos una copia del documento a ${recipientEmail}.`;
        }
        this.completed = true;
        this.completing = false;
      },
      error: (err: FlowError) => {
        this.completeError = err.message || 'Error al completar el flujo.';
        this.completing = false;
      }
    });

    this.subscriptions.push(sub);
  }

  closeWindow(): void {
    this.flowService.clearFlowState();
    this.router.navigate(['/flow', this.processId, 'done']);
  }
}
