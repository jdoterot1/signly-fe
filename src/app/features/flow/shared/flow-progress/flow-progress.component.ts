import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import { FlowService } from '../../../../core/services/flow/flow.service';
import { FlowChallengeType } from '../../../../core/models/flow/flow.model';
import { FlowHelpModalComponent } from '../flow-help-modal/flow-help-modal.component';
import { type HelpContext, type OtpChannel } from '../../../../core/services/flow/flow-help.service';

export type FlowProgressStep = 'inicio' | 'biometria' | 'otp' | 'liveness' | 'firma' | 'completado';

interface FlowProgressItem {
  key: FlowProgressStep;
  label: string;
  caption: string;
}

@Component({
  selector: 'app-flow-progress',
  standalone: true,
  imports: [CommonModule, FlowHelpModalComponent],
  templateUrl: './flow-progress.component.html'
})
export class FlowProgressComponent implements OnInit, OnChanges, OnDestroy {
  @Input() currentStep: FlowProgressStep = 'inicio';
  @Input() companyName = 'Apolo';
  @Input() processId = '';

  helpOpen = false;
  steps: FlowProgressItem[] = [];
  helpContext: HelpContext = {
    currentFlowStep: null,
    pipeline: []
  };
  private readonly subs = new Subscription();

  private readonly stepMap: Record<FlowProgressStep, Omit<FlowProgressItem, 'key'>> = {
    inicio: { label: 'Bienvenida', caption: 'Invitacion y resumen' },
    biometria: { label: 'Biometria', caption: 'Selfie y documento' },
    otp: { label: 'Codigo OTP', caption: 'Validacion de contacto' },
    liveness: { label: 'Prueba de vida', caption: 'Validacion en vivo' },
    firma: { label: 'Firma', caption: 'Firma del documento' },
    completado: { label: 'Finalizado', caption: 'Proceso completo' }
  };

  constructor(private flowService: FlowService) {}

  ngOnInit(): void {
    this.rebuildSteps();
    this.subs.add(
      this.flowService.flowState$.subscribe(state => {
        if (!state) {
          return;
        }
        if (!this.processId || state.processId === this.processId) {
          this.rebuildSteps();
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processId'] || changes['currentStep']) {
      this.rebuildSteps();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  openHelp(): void {
    const flowState = this.flowService.getFlowState();

    this.helpContext = {
      currentFlowStep: flowState?.currentStep || null,
      pipeline: flowState?.pipeline || [],
      // Optional: get biometric sub-step if implemented
      currentBiometricStep: this.flowService.getBiometricSubStep?.() || undefined,
      // Infer OTP channel from currentStep
      otpChannel: this.getOtpChannel(flowState?.currentStep || null)
    };

    this.helpOpen = true;
  }

  private getOtpChannel(step: FlowChallengeType | null): OtpChannel | undefined {
    if (step === 'otp_email') return 'email';
    if (step === 'otp_sms') return 'sms';
    if (step === 'otp_whatsapp') return 'whatsapp';
    return undefined;
  }

  isActive(step: FlowProgressStep): boolean {
    return this.currentStep === step;
  }

  isCompleted(step: FlowProgressStep): boolean {
    return this.stepOrder(step) < this.stepOrder(this.currentStep);
  }

  cardClasses(step: FlowProgressItem): string {
    if (this.isActive(step.key)) {
      return 'border-brand-primary-medium bg-brand-primary-medium/10 text-brand-primary-medium shadow-sm';
    }
    if (this.isCompleted(step.key)) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    return 'border-slate-200 bg-white/90 text-slate-500';
  }

  cardSizeClasses(step: FlowProgressItem): string {
    if (step.key === 'firma') {
      return 'w-[190px] shrink-0 md:w-[260px]';
    }
    return 'w-[170px] shrink-0 md:w-[210px]';
  }

  private stepOrder(step: FlowProgressStep): number {
    return this.steps.findIndex(item => item.key === step);
  }

  private rebuildSteps(): void {
    const state = this.flowService.getFlowState();
    const pipeline = state && (!this.processId || state.processId === this.processId) ? state.pipeline : [];

    const mapped = this.unique(
      pipeline
        .map(step => this.pipelineStepToProgressStep(step))
        .filter((step): step is FlowProgressStep => !!step && step !== 'completado' && step !== 'inicio')
    );

    const fallback: FlowProgressStep[] = ['biometria', 'otp', 'liveness', 'firma'];
    const content = mapped.length ? mapped : fallback;
    const keys: FlowProgressStep[] = ['inicio', ...content];

    if (!keys.includes(this.currentStep) && this.currentStep !== 'completado') {
      keys.push(this.currentStep);
    }
    if (!keys.includes('completado')) {
      keys.push('completado');
    }

    this.steps = keys.map(key => ({ key, ...this.stepMap[key] }));
  }

  private pipelineStepToProgressStep(step: FlowChallengeType): FlowProgressStep {
    switch (step) {
      case 'biometric':
        return 'biometria';
      case 'otp_email':
      case 'otp_sms':
      case 'otp_whatsapp':
        return 'otp';
      case 'liveness':
        return 'liveness';
      case 'template_sign':
        return 'firma';
      default:
        return 'inicio';
    }
  }

  private unique<T>(items: T[]): T[] {
    return Array.from(new Set(items));
  }
}
