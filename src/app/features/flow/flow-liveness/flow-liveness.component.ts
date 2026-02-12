import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import { FlowState, LivenessStartData } from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

type LivenessStep = 'intro' | 'preparing' | 'active' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-flow-liveness',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-liveness.component.html'
})
export class FlowLivenessComponent implements OnInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  processId = '';
  flowState: FlowState | null = null;
  livenessData: LivenessStartData | null = null;

  currentStep: LivenessStep = 'intro';
  loading = false;
  error: string | null = null;

  // Camera state
  cameraActive = false;
  cameraError: string | null = null;
  private stream?: MediaStream;

  // Liveness instructions
  currentInstruction = '';
  instructionIndex = 0;
  instructions = [
    { text: 'Mira directamente a la camara', icon: 'pi-eye', duration: 2000 },
    { text: 'Gira tu cabeza lentamente a la izquierda', icon: 'pi-arrow-left', duration: 2000 },
    { text: 'Gira tu cabeza lentamente a la derecha', icon: 'pi-arrow-right', duration: 2000 },
    { text: 'Sonrie', icon: 'pi-face-smile', duration: 2000 },
    { text: 'Mira hacia arriba', icon: 'pi-arrow-up', duration: 2000 }
  ];

  private instructionTimer?: ReturnType<typeof setTimeout>;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();

    // Verificar que tenemos un token valido
    const token = this.flowService.getFlowToken();
    if (!this.processId || !this.flowState || !token) {
      // Redirigir al landing para iniciar/reiniciar el flujo
      this.router.navigate(['/flow', this.processId || 'invalid']);
      return;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopCamera();
    if (this.instructionTimer) {
      clearTimeout(this.instructionTimer);
    }
  }

  startLiveness(): void {
    this.loading = true;
    this.error = null;
    this.currentStep = 'preparing';

    const sub = this.flowService.startLivenessSession(this.processId).subscribe({
      next: (data) => {
        this.livenessData = data;
        this.loading = false;
        this.startCamera();
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al iniciar la prueba de vida.';
        this.currentStep = 'error';
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  async startCamera(): Promise<void> {
    this.cameraError = null;

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.cameraError = 'La camara no esta disponible en este navegador.';
      this.currentStep = 'error';
      return;
    }

    if (!window.isSecureContext) {
      this.cameraError = 'La camara requiere HTTPS para funcionar.';
      this.currentStep = 'error';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      // Primero cambiar a 'active' para que el elemento video exista en el DOM
      this.currentStep = 'active';
      this.cameraActive = true;

      // Esperar un tick para que Angular renderice el elemento video
      setTimeout(async () => {
        const video = this.videoRef?.nativeElement;
        if (video && this.stream) {
          video.srcObject = this.stream;
          await video.play();
          this.startInstructionSequence();
        }
      }, 100);
    } catch {
      this.cameraError = 'No pudimos acceder a tu camara. Revisa los permisos.';
      this.currentStep = 'error';
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.cameraActive = false;
  }

  private startInstructionSequence(): void {
    this.instructionIndex = 0;
    this.showNextInstruction();
  }

  private showNextInstruction(): void {
    if (this.instructionIndex >= this.instructions.length) {
      this.completeLiveness();
      return;
    }

    const instruction = this.instructions[this.instructionIndex];
    this.currentInstruction = instruction.text;

    this.instructionTimer = setTimeout(() => {
      this.instructionIndex++;
      this.showNextInstruction();
    }, instruction.duration);
  }

  private completeLiveness(): void {
    this.currentStep = 'processing';
    this.stopCamera();

    // Simulate liveness verification (in production, this would be handled by the backend)
    // The sessionId from livenessData would be used to verify the liveness
    setTimeout(() => {
      this.currentStep = 'success';
      setTimeout(() => this.navigateToNextStep(), 2000);
    }, 2000);
  }

  private navigateToNextStep(): void {
    const state = this.flowService.getFlowState();
    if (!state) {
      this.router.navigate(['/flow', this.processId, 'template-sign']);
      return;
    }

    const nextStep = this.flowService.getNextPipelineStep('liveness');

    const routes: Record<string, string> = {
      otp_email: 'otp-email',
      otp_sms: 'otp-sms',
      otp_whatsapp: 'otp-whatsapp',
      biometric: 'biometric',
      liveness: 'liveness',
      template_sign: 'template-sign'
    };

    const route = nextStep ? routes[nextStep] : null;
    if (route) {
      this.router.navigate(['/flow', this.processId, route]);
      return;
    }

    this.router.navigate(['/flow', this.processId, 'template-sign']);
  }

  retry(): void {
    this.error = null;
    this.currentStep = 'intro';
    this.instructionIndex = 0;
    if (this.instructionTimer) {
      clearTimeout(this.instructionTimer);
    }
  }

  getCurrentInstructionIcon(): string {
    if (this.instructionIndex >= this.instructions.length) return 'pi-check';
    return this.instructions[this.instructionIndex].icon;
  }

  getProgress(): number {
    return Math.round((this.instructionIndex / this.instructions.length) * 100);
  }
}
