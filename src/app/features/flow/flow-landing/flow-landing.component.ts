import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import { FlowState, FlowChallengeType } from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

@Component({
  selector: 'app-flow-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-landing.component.html'
})
export class FlowLandingComponent implements OnInit, OnDestroy {
  processId = '';
  flowState: FlowState | null = null;
  loading = true;
  error: string | null = null;
  errorCode: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';

    if (!this.processId) {
      this.error = 'No se encontro el identificador del proceso.';
      this.loading = false;
      return;
    }

    this.initiateFlow();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initiateFlow(): void {
    this.loading = true;
    this.error = null;
    this.errorCode = null;

    const sub = this.flowService.initiateFlow(this.processId).subscribe({
      next: () => {
        this.flowState = this.flowService.getFlowState();
        this.loading = false;
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al iniciar el flujo de firma.';
        this.errorCode = err.code ?? null;
        this.loading = false;
      }
    });

    this.subscriptions.push(sub);
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

  getStepStatus(step: FlowChallengeType): 'pending' | 'active' | 'completed' {
    if (!this.flowState) return 'pending';

    const challenge = this.flowState.challenges.find(c => c.type === step);
    if (!challenge) return 'pending';

    switch (challenge.status) {
      case 'COMPLETED': return 'completed';
      case 'ACTIVE': return 'active';
      default: return 'pending';
    }
  }

  startFlow(): void {
    if (!this.flowState) return;

    const currentStep = this.flowState.currentStep;
    this.navigateToStep(currentStep);
  }

  private navigateToStep(step: FlowChallengeType): void {
    const routes: Record<FlowChallengeType, string> = {
      biometric: 'biometric',
      otp_email: 'otp-email',
      otp_sms: 'otp-sms',
      otp_whatsapp: 'otp-whatsapp',
      liveness: 'liveness',
      template_sign: 'template-sign'
    };

    const route = routes[step];
    if (route) {
      this.router.navigate(['/flow', this.processId, route]);
    }
  }

  isFlowExpired(): boolean {
    return this.errorCode === 'not_found' || this.errorCode === 'token_expired';
  }

  requiresIdentityDocument(): boolean {
    return !!this.flowState?.pipeline?.includes('biometric');
  }
}
