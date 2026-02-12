import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type FlowProgressStep = 'inicio' | 'biometria' | 'otp' | 'liveness' | 'firma' | 'completado';

interface FlowProgressItem {
  key: FlowProgressStep;
  label: string;
  caption: string;
  accent: string;
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
    { key: 'inicio', label: 'Bienvenida', caption: 'Invitacion y resumen', accent: 'from-sky-500 to-indigo-500' },
    { key: 'biometria', label: 'Biometria', caption: 'Selfie y documento', accent: 'from-violet-500 to-fuchsia-500' },
    { key: 'otp', label: 'Codigo OTP', caption: 'Validacion de contacto', accent: 'from-amber-500 to-orange-500' },
    { key: 'liveness', label: 'Prueba de vida', caption: 'Validacion en vivo', accent: 'from-cyan-500 to-blue-500' },
    { key: 'firma', label: 'Firma', caption: 'Firma del documento', accent: 'from-emerald-500 to-teal-500' },
    { key: 'completado', label: 'Finalizado', caption: 'Proceso completo', accent: 'from-rose-500 to-pink-500' }
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

  cardClasses(step: FlowProgressItem): string {
    if (this.isActive(step.key)) {
      return `border-transparent bg-gradient-to-br ${step.accent} text-white shadow-xl`;
    }
    if (this.isCompleted(step.key)) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    return 'border-slate-200 bg-white/90 text-slate-500';
  }

  private stepOrder(step: FlowProgressStep): number {
    return this.steps.findIndex(item => item.key === step);
  }
}
