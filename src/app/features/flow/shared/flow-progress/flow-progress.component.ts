import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type FlowProgressStep = 'inicio' | 'biometria' | 'otp' | 'liveness' | 'completado';

interface FlowProgressItem {
  key: FlowProgressStep;
  label: string;
  caption: string;
}

@Component({
  selector: 'app-flow-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flow-progress.component.html'
})
export class FlowProgressComponent {
  @Input() currentStep: FlowProgressStep = 'inicio';
  @Input() companyName = 'Apolo';
  @Input() processId = '';

  helpOpen = false;

  readonly steps: FlowProgressItem[] = [
    { key: 'inicio', label: 'Bienvenida', caption: 'Invitacion y resumen' },
    { key: 'biometria', label: 'Biometria', caption: 'Selfie y documento' },
    { key: 'otp', label: 'Codigo OTP', caption: 'Validacion de contacto' },
    { key: 'liveness', label: 'Prueba de vida', caption: 'Validacion en vivo' },
    { key: 'completado', label: 'Finalizado', caption: 'Proceso completo' }
  ];

  readonly helpChecklist: string[] = [
    'Usa buena iluminacion y evita contraluz.',
    'Ten tu documento a la mano antes de iniciar.',
    'Si no llega el codigo OTP, valida correo o celular y solicita reenvio.',
    'Permite acceso a camara cuando el navegador lo solicite.',
    'No cierres la pagina hasta ver el estado completado.'
  ];

  isActive(step: FlowProgressStep): boolean {
    return this.currentStep === step;
  }

  isCompleted(step: FlowProgressStep): boolean {
    return this.stepOrder(step) < this.stepOrder(this.currentStep);
  }

  private stepOrder(step: FlowProgressStep): number {
    return this.steps.findIndex(item => item.key === step);
  }
}
