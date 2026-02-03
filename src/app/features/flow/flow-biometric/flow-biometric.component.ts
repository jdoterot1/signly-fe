import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import {
  FlowState,
  BiometricStartData,
  BiometricRequirement,
  BiometricUpload
} from '../../../core/models/flow/flow.model';

type BiometricStep = 'intro' | 'selfie' | 'idFront' | 'idBack' | 'uploading' | 'verifying' | 'success' | 'error';

interface CapturedImage {
  blob: Blob;
  preview: string;
}

@Component({
  selector: 'app-flow-biometric',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './flow-biometric.component.html'
})
export class FlowBiometricComponent implements OnInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  processId = '';
  flowState: FlowState | null = null;
  biometricData: BiometricStartData | null = null;

  currentStep: BiometricStep = 'intro';
  loading = false;
  error: string | null = null;

  // Camera state
  cameraActive = false;
  cameraError: string | null = null;
  private stream?: MediaStream;

  // Captured images
  capturedImages: Partial<Record<BiometricRequirement, CapturedImage>> = {};

  // Upload progress
  uploadProgress = 0;
  verificationResult: { approved: boolean; similarity: number } | null = null;

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
  }

  startBiometric(): void {
    this.loading = true;
    this.error = null;

    const requirements: BiometricRequirement[] = ['selfie', 'idFront', 'idBack'];
    const contentTypes: Record<BiometricRequirement, string> = {
      selfie: 'image/jpeg',
      idFront: 'image/jpeg',
      idBack: 'image/jpeg'
    };

    const sub = this.flowService.startBiometric(this.processId, {
      require: requirements,
      contentTypes
    }).subscribe({
      next: (data) => {
        this.biometricData = data;
        this.currentStep = 'selfie';
        this.loading = false;
        this.startCamera();
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al iniciar la verificacion biometrica.';
        this.loading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  async startCamera(): Promise<void> {
    this.cameraError = null;

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.cameraError = 'La camara no esta disponible en este navegador.';
      return;
    }

    if (!window.isSecureContext) {
      this.cameraError = 'La camara requiere HTTPS para funcionar.';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.currentStep === 'selfie' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      // Esperar un tick para que Angular renderice el elemento video
      setTimeout(async () => {
        const video = this.videoRef?.nativeElement;
        if (video && this.stream) {
          video.srcObject = this.stream;
          await video.play();
          this.cameraActive = true;
        }
      }, 100);
    } catch {
      this.cameraError = 'No pudimos acceder a tu camara. Revisa los permisos.';
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.cameraActive = false;
  }

  capturePhoto(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for selfie
    if (this.currentStep === 'selfie') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const requirement = this.currentStep as BiometricRequirement;
      this.capturedImages[requirement] = {
        blob,
        preview: URL.createObjectURL(blob)
      };

      this.stopCamera();
      this.moveToNextStep();
    }, 'image/jpeg', 0.9);
  }

  retakePhoto(): void {
    const requirement = this.currentStep as BiometricRequirement;
    if (this.capturedImages[requirement]?.preview) {
      URL.revokeObjectURL(this.capturedImages[requirement]!.preview);
    }
    delete this.capturedImages[requirement];
    this.startCamera();
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error = 'Por favor selecciona un archivo de imagen.';
      return;
    }

    const requirement = this.currentStep as BiometricRequirement;
    const preview = URL.createObjectURL(file);

    this.capturedImages[requirement] = {
      blob: file,
      preview
    };

    this.stopCamera();
    this.moveToNextStep();
  }

  moveToNextStep(): void {
    const steps: BiometricStep[] = ['selfie', 'idFront', 'idBack'];
    const currentIndex = steps.indexOf(this.currentStep as BiometricStep);

    if (currentIndex < steps.length - 1) {
      this.currentStep = steps[currentIndex + 1];
      setTimeout(() => this.startCamera(), 100);
    } else {
      this.uploadImages();
    }
  }

  skipToIdCapture(): void {
    if (this.currentStep === 'selfie' && this.capturedImages['selfie']) {
      this.currentStep = 'idFront';
      this.startCamera();
    }
  }

  private uploadImages(): void {
    if (!this.biometricData) return;

    this.currentStep = 'uploading';
    this.uploadProgress = 0;

    const uploads = Object.entries(this.capturedImages)
      .filter(([key, value]) => value && this.biometricData?.uploads[key as BiometricRequirement])
      .map(([key, value]) => {
        const upload = this.biometricData!.uploads[key as BiometricRequirement] as BiometricUpload;
        return from(this.uploadSingleImage(upload.uploadUrl, value!.blob));
      });

    if (uploads.length === 0) {
      this.error = 'No hay imagenes para subir.';
      this.currentStep = 'error';
      return;
    }

    const sub = forkJoin(uploads).pipe(
      switchMap(() => {
        this.currentStep = 'verifying';
        return this.flowService.verifyBiometric(this.processId);
      })
    ).subscribe({
      next: (result) => {
        this.verificationResult = {
          approved: result.approved,
          similarity: result.similarity
        };
        this.currentStep = result.approved ? 'success' : 'error';

        if (result.approved) {
          setTimeout(() => this.navigateToNextStep(), 2000);
        }
      },
      error: (err: FlowError) => {
        this.error = err.message || 'Error al verificar la identidad.';
        this.currentStep = 'error';
      }
    });

    this.subscriptions.push(sub);
  }

  private async uploadSingleImage(url: string, blob: Blob): Promise<void> {
    const response = await fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });

    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }

    this.uploadProgress += 33;
  }

  private navigateToNextStep(): void {
    const state = this.flowService.getFlowState();
    if (!state) return;

    // Find the next pending step
    const nextChallenge = state.challenges.find(c => c.status === 'PENDING' || c.status === 'ACTIVE');

    if (!nextChallenge) {
      this.router.navigate(['/flow', this.processId, 'complete']);
      return;
    }

    const routes: Record<string, string> = {
      otp_email: 'otp-email',
      otp_sms: 'otp-sms',
      otp_whatsapp: 'otp-whatsapp',
      liveness: 'liveness',
      biometric: 'biometric'
    };

    const route = routes[nextChallenge.type];
    if (route) {
      this.router.navigate(['/flow', this.processId, route]);
    }
  }

  retryVerification(): void {
    // Clear captured images and start over
    Object.values(this.capturedImages).forEach(img => {
      if (img?.preview) URL.revokeObjectURL(img.preview);
    });
    this.capturedImages = {};
    this.error = null;
    this.currentStep = 'intro';
  }

  getStepTitle(): string {
    const titles: Record<BiometricStep, string> = {
      intro: 'Verificacion de identidad',
      selfie: 'Captura tu rostro',
      idFront: 'Frente de tu documento',
      idBack: 'Reverso de tu documento',
      uploading: 'Subiendo imagenes',
      verifying: 'Verificando identidad',
      success: 'Verificacion exitosa',
      error: 'Verificacion fallida'
    };
    return titles[this.currentStep];
  }

  getStepDescription(): string {
    const descriptions: Record<BiometricStep, string> = {
      intro: 'Necesitamos verificar tu identidad comparando una foto de tu rostro con tu documento de identidad.',
      selfie: 'Mira directamente a la camara y asegurate de tener buena iluminacion.',
      idFront: 'Captura la parte frontal de tu documento de identidad.',
      idBack: 'Captura la parte trasera de tu documento de identidad.',
      uploading: 'Estamos procesando tus imagenes...',
      verifying: 'Estamos verificando tu identidad...',
      success: 'Tu identidad ha sido verificada correctamente.',
      error: 'No pudimos verificar tu identidad. Por favor intenta de nuevo.'
    };
    return descriptions[this.currentStep];
  }

  getCurrentPreview(): string | null {
    const requirement = this.currentStep as BiometricRequirement;
    return this.capturedImages[requirement]?.preview ?? null;
  }

  hasCurrentCapture(): boolean {
    const requirement = this.currentStep as BiometricRequirement;
    return !!this.capturedImages[requirement];
  }
}
