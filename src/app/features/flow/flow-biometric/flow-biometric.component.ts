import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { FaceMesh, Results } from '@mediapipe/face_mesh';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import {
  FlowState,
  BiometricStartData,
  BiometricRequirement,
  BiometricUpload
} from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

type BiometricStep = 'intro' | 'selfie' | 'idFront' | 'idBack' | 'uploading' | 'verifying' | 'success' | 'error';

interface CapturedImage {
  blob: Blob;
  preview: string;
}

@Component({
  selector: 'app-flow-biometric',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
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
  faceHint = 'Alinea tu rostro dentro del óvalo';
  faceAligned = false;
  private faceMesh?: FaceMesh;
  private faceDetecting = false;
  private stableFrames = 0;
  private readonly requiredStableFrames = 12;
  private autoCaptureLocked = false;
  private documentCaptureActive = false;
  documentHint = 'Mantén el documento dentro del recuadro';
  private documentHintTimeout?: ReturnType<typeof setTimeout>;
  private documentCaptureTimeout?: ReturnType<typeof setTimeout>;

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
    this.stopFaceDetection();
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
        this.resetCaptureState();
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
          if (this.currentStep === 'selfie') {
            this.startFaceDetection();
          } else {
            this.startDocumentAutoCapture();
          }
        }
      }, 100);
    } catch {
      this.cameraError = 'No pudimos acceder a tu camara. Revisa los permisos.';
    }
  }

  beginCamera(): void {
    if (this.cameraActive || this.loading) {
      return;
    }
    this.autoCaptureLocked = false;
    this.stableFrames = 0;
    this.startCamera();
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.cameraActive = false;
    this.stopDocumentAutoCapture();
  }

  capturePhoto(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (!video || !canvas) return;
    this.autoCaptureLocked = true;

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
    this.autoCaptureLocked = false;
    this.startCamera();
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (file.type !== 'image/jpeg' && !file.name.toLowerCase().match(/\.(jpe?g)$/)) {
      this.error = 'Por favor selecciona una imagen JPG/JPEG.';
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
      if (this.currentStep === 'selfie') {
        this.stopFaceDetection();
      } else {
        this.stopDocumentAutoCapture();
      }
      this.currentStep = steps[currentIndex + 1];
      this.resetCaptureState();
    } else {
      this.uploadImages();
    }
  }

  skipToIdCapture(): void {
    if (this.currentStep === 'selfie' && this.capturedImages['selfie']) {
      this.stopFaceDetection();
      this.currentStep = 'idFront';
      this.resetCaptureState();
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
    this.autoCaptureLocked = false;
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

  private startFaceDetection(): void {
    if (this.faceDetecting) return;
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    if (!this.faceMesh) {
      this.faceMesh = new FaceMesh({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      this.faceMesh.onResults(results => this.handleFaceResults(results));
    }

    this.faceDetecting = true;
    this.stableFrames = 0;
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';

    const loop = async () => {
      if (!this.faceDetecting || !video || video.readyState < 2) {
        if (this.faceDetecting) {
          requestAnimationFrame(loop);
        }
        return;
      }
      try {
        await this.faceMesh!.send({ image: video });
      } catch {
        // ignore send errors during teardown
      }
      if (this.faceDetecting) {
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);
  }

  private stopFaceDetection(): void {
    this.faceDetecting = false;
    this.stableFrames = 0;
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';
  }

  private handleFaceResults(results: Results): void {
    if (this.currentStep !== 'selfie' || !this.faceDetecting || this.hasCurrentCapture()) {
      return;
    }
    const face = results.multiFaceLandmarks?.[0];
    if (!face) {
      this.faceAligned = false;
      this.stableFrames = 0;
      this.faceHint = 'Alinea tu rostro dentro del óvalo';
      return;
    }

    const xs = face.map(p => p.x);
    const ys = face.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    const cx = 0.5;
    const cy = 0.5;
    const rx = 0.26;
    const ry = 0.36;

    const isInside = (x: number, y: number) =>
      ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;

    const insideOval =
      isInside(minX, minY) &&
      isInside(maxX, minY) &&
      isInside(minX, maxY) &&
      isInside(maxX, maxY);

    if (!insideOval) {
      this.faceAligned = false;
      this.stableFrames = 0;
      this.faceHint = 'Mantén el rostro dentro del óvalo';
      return;
    }

    if (boxHeight < 0.35) {
      this.faceAligned = false;
      this.stableFrames = 0;
      this.faceHint = 'Acerca un poco tu rostro';
      return;
    }

    if (boxHeight > 0.75) {
      this.faceAligned = false;
      this.stableFrames = 0;
      this.faceHint = 'Aléjate un poco';
      return;
    }

    this.faceAligned = true;
    this.faceHint = 'Perfecto, no te muevas';
    this.stableFrames += 1;

    if (this.stableFrames >= this.requiredStableFrames && !this.autoCaptureLocked) {
      this.autoCaptureLocked = true;
      this.capturePhoto();
    }
  }

  private startDocumentAutoCapture(): void {
    if (this.currentStep === 'selfie' || this.documentCaptureActive) {
      return;
    }
    this.documentCaptureActive = true;
    this.stableFrames = 0;
    this.documentHint = 'Alinea el documento dentro del recuadro';

    this.documentHintTimeout = setTimeout(() => {
      if (!this.documentCaptureActive || !this.cameraActive || this.hasCurrentCapture()) {
        return;
      }
      this.documentHint = 'Mantén el documento fijo...';
    }, 1200);

    this.documentCaptureTimeout = setTimeout(() => {
      if (!this.documentCaptureActive || !this.cameraActive || this.hasCurrentCapture()) {
        return;
      }
      if (this.autoCaptureLocked) {
        return;
      }
      this.autoCaptureLocked = true;
      this.documentHint = 'Capturando...';
      this.capturePhoto();
      this.documentCaptureActive = false;
    }, 5000);
  }

  private stopDocumentAutoCapture(): void {
    this.documentCaptureActive = false;
    this.stableFrames = 0;
    if (this.documentHintTimeout) {
      clearTimeout(this.documentHintTimeout);
      this.documentHintTimeout = undefined;
    }
    if (this.documentCaptureTimeout) {
      clearTimeout(this.documentCaptureTimeout);
      this.documentCaptureTimeout = undefined;
    }
  }

  private resetCaptureState(): void {
    this.autoCaptureLocked = false;
    this.stableFrames = 0;
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';
    this.documentHint = 'Alinea el documento y presiona Capturar';
    this.cameraActive = false;
  }
}
