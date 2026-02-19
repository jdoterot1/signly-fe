// En los imports del archivo
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { FaceMesh, Results } from '@mediapipe/face_mesh';

import {
  FlowService,
  FlowError,
} from '../../../core/services/flow/flow.service';
import {
  FlowState,
  BiometricStartData,
  BiometricRequirement,
  BiometricUpload,
} from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

type BiometricStep =
  | 'intro'
  | 'selfie'
  | 'idFront'
  | 'idBack'
  | 'uploading'
  | 'verifying'
  | 'success'
  | 'error';

interface CapturedImage {
  blob: Blob;
  preview: string;
}

@Component({
  selector: 'app-flow-biometric',
  standalone: true,
  imports: [CommonModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-biometric.component.html',
})
export class FlowBiometricComponent implements OnInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  processId = '';
  flowState: FlowState | null = null;
  biometricData: BiometricStartData | null = null;

  private _currentStep: BiometricStep = 'intro';
  loading = false;
  error: string | null = null;

  // Getter and setter for currentStep to track changes for help system
  get currentStep(): BiometricStep {
    return this._currentStep;
  }

  set currentStep(value: BiometricStep) {
    this._currentStep = value;
    // Report current step to FlowService for help system context
    this.flowService.setBiometricSubStep(value);
  }

  // Camera state
  cameraActive = false;
  cameraError: string | null = null;
  private stream?: MediaStream;
  faceHint = 'Alinea tu rostro dentro del óvalo';
  faceAligned = false;
  private faceMesh?: FaceMesh;
  private faceDetecting = false;
  private stableFrames = 0;
  private readonly requiredStableFrames = 8;
  private autoCaptureLocked = false;
  // Time-based delay for selfie capture
  private alignmentStartTime: number | null = null;
  private readonly requiredAlignmentDuration = 3000; // 3 seconds in milliseconds
  private documentCaptureActive = false;
  documentHint = 'Mantén el documento dentro del recuadro';
  private documentHintTimeout?: ReturnType<typeof setTimeout>;
  private documentCaptureTimeout?: ReturnType<typeof setTimeout>;
  // Time-based delay for document capture
  private documentAlignmentStartTime: number | null = null;
  private readonly requiredDocumentAlignmentDuration = 3000; // 3 seconds
  private documentCountdownInterval?: ReturnType<typeof setInterval>;

  // Captured images
  capturedImages: Partial<Record<BiometricRequirement, CapturedImage>> = {};

  // Upload progress
  uploadProgress = 0;
  verificationResult: { approved: boolean; similarity: number } | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private cdr: ChangeDetectorRef,
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
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.stopFaceDetection();
    this.stopCamera();
    // Clear biometric sub-step from FlowService
    this.flowService.setBiometricSubStep(null);
  }

  startBiometric(): void {
    this.loading = true;
    this.error = null;

    const requirements: BiometricRequirement[] = [
      'selfie',
      'idFront',
      'idBack',
    ];
    const contentTypes: Record<BiometricRequirement, string> = {
      selfie: 'image/jpeg',
      idFront: 'image/jpeg',
      idBack: 'image/jpeg',
    };

    const sub = this.flowService
      .startBiometric(this.processId, {
        require: requirements,
        contentTypes,
      })
      .subscribe({
        next: (data) => {
          this.biometricData = data;
          this.currentStep = 'selfie';
          this.loading = false;
          this.resetCaptureState();
        },
        error: (err: FlowError) => {
          this.error =
            err.message || 'Error al iniciar la verificacion biometrica.';
          this.loading = false;
        },
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

    // Check permission state first so we can show a helpful message
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permissionStatus.state === 'denied') {
        this.cameraError =
          'El acceso a la camara esta bloqueado. Habilita el permiso de camara en la configuracion de tu navegador y recarga la pagina.';
        return;
      }
    } catch {
      // permissions.query may not be available in all browsers; continue anyway
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentStep === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // Wait for Angular to render the video element, then attach the stream
      await this.waitForVideoElement();
      const video = this.videoRef?.nativeElement;
      if (video && this.stream) {
        video.srcObject = this.stream;
        await video.play();
        this.cameraActive = true;
        this.cdr.detectChanges();
        if (this.currentStep === 'selfie') {
          this.startFaceDetection();
        } else {
          this.startDocumentAutoCapture();
        }
      }
    } catch (err) {
      const errorName = (err as DOMException)?.name ?? '';
      if (errorName === 'NotAllowedError') {
        this.cameraError =
          'El permiso de camara fue denegado. Habilita la camara en la configuracion de tu navegador y recarga la pagina.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.cameraError = 'No se encontro ninguna camara conectada a tu dispositivo.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        this.cameraError = 'La camara esta siendo usada por otra aplicacion. Cierra las demas apps y vuelve a intentar.';
      } else {
        this.cameraError = 'No pudimos acceder a tu camara. Revisa los permisos.';
      }
      console.error('Error al acceder a la camara:', err);
    }
  }

  private waitForVideoElement(maxAttempts = 20): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        if (this.videoRef?.nativeElement || attempts >= maxAttempts) {
          resolve();
          return;
        }
        attempts++;
        requestAnimationFrame(check);
      };
      check();
    });
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
      this.stream.getTracks().forEach((track) => track.stop());
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
    this.alignmentStartTime = null; // Reset timer

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

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const requirement = this.currentStep as BiometricRequirement;
        this.capturedImages[requirement] = {
          blob,
          preview: URL.createObjectURL(blob),
        };

        this.stopFaceDetection();
        this.stopCamera();
        this.cdr.detectChanges();
      },
      'image/jpeg',
      0.9,
    );
  }

  retakePhoto(): void {
    if (!['selfie', 'idFront', 'idBack'].includes(this.currentStep)) {
      return;
    }

    const requirement = this.currentStep as BiometricRequirement;
    if (this.capturedImages[requirement]?.preview) {
      URL.revokeObjectURL(this.capturedImages[requirement]!.preview);
    }

    this.stopFaceDetection();
    this.stopDocumentAutoCapture();
    this.stopCamera();

    delete this.capturedImages[requirement];
    this.error = null;
    this.cameraError = null;
    this.resetCaptureState();
    this.cdr.detectChanges();
    this.startCamera();
  }

  moveToNextStep(): void {
    if (
      ['selfie', 'idFront', 'idBack'].includes(this.currentStep) &&
      !this.hasCurrentCapture()
    ) {
      return;
    }

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
      this.cdr.detectChanges();
      // Sin auto-inicio — el usuario presiona "Empezar" cuando tenga el documento listo
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
      .filter(
        ([key, value]) =>
          value && this.biometricData?.uploads[key as BiometricRequirement],
      )
      .map(([key, value]) => {
        const upload = this.biometricData!.uploads[
          key as BiometricRequirement
        ] as BiometricUpload;
        return from(this.uploadSingleImage(upload.uploadUrl, value!.blob));
      });

    if (uploads.length === 0) {
      this.error = 'No hay imagenes para subir.';
      this.currentStep = 'error';
      return;
    }

    const sub = forkJoin(uploads)
      .pipe(
        switchMap(() => {
          this.currentStep = 'verifying';
          return this.flowService.verifyBiometric(this.processId);
        }),
      )
      .subscribe({
        next: (result) => {
          this.verificationResult = {
            approved: result.approved,
            similarity: result.similarity,
          };
          this.currentStep = result.approved ? 'success' : 'error';

          if (result.approved) {
            setTimeout(() => this.navigateToNextStep(), 2000);
          }
        },
        error: (err: FlowError) => {
          this.error = err.message || 'Error al verificar la identidad.';
          this.currentStep = 'error';
        },
      });

    this.subscriptions.push(sub);
  }

  private async uploadSingleImage(url: string, blob: Blob): Promise<void> {
    const response = await fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }

    this.uploadProgress += 33;
  }

  private navigateToNextStep(): void {
    const state = this.flowService.getFlowState();
    if (!state) return;

    const nextStep = this.flowService.getNextPipelineStep('biometric');

    const routes: Record<string, string> = {
      otp_email: 'otp-email',
      otp_sms: 'otp-sms',
      otp_whatsapp: 'otp-whatsapp',
      liveness: 'liveness',
      biometric: 'biometric',
      template_sign: 'template-sign',
    };

    const route = nextStep ? routes[nextStep] : null;
    if (route) {
      this.router.navigate(['/flow', this.processId, route]);
      return;
    }

    // If there are no more auth steps in pipeline, continue with document signing.
    this.router.navigate(['/flow', this.processId, 'template-sign']);
  }

  retryVerification(): void {
    // Clear captured images and start over
    Object.values(this.capturedImages).forEach((img) => {
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
      error: 'Verificacion fallida',
    };
    return titles[this.currentStep];
  }

  getStepDescription(): string {
    const descriptions: Record<BiometricStep, string> = {
      intro:
        'Necesitamos verificar tu identidad comparando una foto de tu rostro con tu documento de identidad.',
      selfie:
        'Mira directamente a la camara y asegurate de tener buena iluminacion.',
      idFront: 'Captura la parte frontal de tu documento de identidad.',
      idBack: 'Captura la parte trasera de tu documento de identidad.',
      uploading: 'Estamos procesando tus imagenes...',
      verifying: 'Estamos verificando tu identidad...',
      success: 'Tu identidad ha sido verificada correctamente.',
      error: 'No pudimos verificar tu identidad. Por favor intenta de nuevo.',
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
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      this.faceMesh.onResults((results) => this.handleFaceResults(results));
    }

    this.faceDetecting = true;
    this.stableFrames = 0;
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';

    const loop = async () => {
      while (this.faceDetecting) {
        if (!video || video.readyState < 2) {
          // Video not ready yet; wait a frame and try again
          await new Promise<void>(r => requestAnimationFrame(() => r()));
          continue;
        }
        try {
          await this.faceMesh!.send({ image: video });
        } catch {
          // ignore send errors during teardown
        }
        // Yield to the browser before the next frame
        await new Promise<void>(r => requestAnimationFrame(() => r()));
      }
    };

    loop();
  }

  private stopFaceDetection(): void {
    this.faceDetecting = false;
    this.stableFrames = 0;
    this.alignmentStartTime = null; // Reset timer
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';
  }

  private handleFaceResults(results: Results): void {
    if (
      this.currentStep !== 'selfie' ||
      !this.faceDetecting ||
      this.hasCurrentCapture()
    ) {
      return;
    }
    const face = results.multiFaceLandmarks?.[0];
    if (!face) {
      this.faceAligned = false;
      // Degrade gradually instead of hard reset so brief detection gaps don't restart progress
      this.stableFrames = Math.max(this.stableFrames - 2, 0);
      this.alignmentStartTime = null; // Reset timer when face lost
      this.faceHint = 'Alinea tu rostro dentro del óvalo';
      this.cdr.detectChanges();
      return;
    }

    const xs = face.map((p) => p.x);
    const ys = face.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boxHeight = maxY - minY;

    // The video is mirrored (scale-x-[-1]) for selfie mode so MediaPipe
    // coordinates are horizontally flipped relative to what the user sees.
    // Mirror the face bounding box X coords so they match the visual oval.
    const mirroredMinX = 1 - maxX;
    const mirroredMaxX = 1 - minX;

    // Oval centre & radii — generous enough to match the visual guide.
    // The UI container is aspect-square with a large oval inside, so we
    // use a roomy ellipse centred at the middle of the frame.
    const cx = 0.5;
    const cy = 0.48; // slightly above centre because faces sit a bit high
    const rx = 0.35;
    const ry = 0.42;

    // Check that the face centre is inside the oval (much more forgiving
    // than requiring all 4 corners inside).
    const faceCx = (mirroredMinX + mirroredMaxX) / 2;
    const faceCy = (minY + maxY) / 2;
    const centreInsideOval =
      (faceCx - cx) ** 2 / rx ** 2 + (faceCy - cy) ** 2 / ry ** 2 <= 1;

    if (!centreInsideOval) {
      this.faceAligned = false;
      this.stableFrames = Math.max(this.stableFrames - 2, 0);
      this.alignmentStartTime = null; // Reset timer
      this.faceHint = 'Centra tu rostro dentro del recuadro';
      this.cdr.detectChanges();
      return;
    }

    if (boxHeight < 0.22) {
      this.faceAligned = false;
      this.stableFrames = Math.max(this.stableFrames - 1, 0);
      this.alignmentStartTime = null; // Reset timer
      this.faceHint = 'Acércate un poco';
      this.cdr.detectChanges();
      return;
    }

    if (boxHeight > 0.85) {
      this.faceAligned = false;
      this.stableFrames = Math.max(this.stableFrames - 1, 0);
      this.alignmentStartTime = null; // Reset timer
      this.faceHint = 'Aléjate un poco';
      this.cdr.detectChanges();
      return;
    }

    // All validations passed
    this.faceAligned = true;
    this.stableFrames += 1;

    // Start timer on first aligned frame
    if (this.alignmentStartTime === null) {
      this.alignmentStartTime = Date.now();
    }

    // Calculate elapsed time since alignment started
    const elapsedTime = Date.now() - this.alignmentStartTime;
    const remainingTime = Math.max(0, this.requiredAlignmentDuration - elapsedTime);
    const secondsRemaining = Math.ceil(remainingTime / 1000);

    // Check both frame stability AND time duration
    if (
      this.stableFrames >= this.requiredStableFrames &&
      elapsedTime >= this.requiredAlignmentDuration &&
      !this.autoCaptureLocked
    ) {
      this.faceHint = 'Capturando...';
      this.cdr.detectChanges();
      this.autoCaptureLocked = true;
      this.capturePhoto();
      return;
    }

    // Progressive hints with countdown
    if (this.stableFrames >= 3) {
      if (secondsRemaining > 0) {
        this.faceHint = `Perfecto, no te muevas... ${secondsRemaining}`;
      } else {
        this.faceHint = 'Perfecto, no te muevas...';
      }
    } else {
      this.faceHint = 'Bien, mantén la posición';
    }

    this.cdr.detectChanges();
  }

  private startDocumentAutoCapture(): void {
    if (this.currentStep === 'selfie' || this.documentCaptureActive) {
      return;
    }
    this.documentCaptureActive = true;
    this.stableFrames = 0;
    this.documentAlignmentStartTime = Date.now();
    this.documentHint = 'Mantén el documento dentro del recuadro';

    // Update countdown every 100ms for smooth display
    this.documentCountdownInterval = setInterval(() => {
      if (
        !this.documentCaptureActive ||
        !this.cameraActive ||
        this.hasCurrentCapture()
      ) {
        this.stopDocumentAutoCapture();
        return;
      }

      if (!this.documentAlignmentStartTime) {
        return;
      }

      const elapsedTime = Date.now() - this.documentAlignmentStartTime;
      const remainingTime = Math.max(0, this.requiredDocumentAlignmentDuration - elapsedTime);
      const secondsRemaining = Math.ceil(remainingTime / 1000);

      // Check if 3 seconds have elapsed
      if (elapsedTime >= this.requiredDocumentAlignmentDuration) {
        if (this.autoCaptureLocked) {
          return;
        }
        this.autoCaptureLocked = true;
        this.documentHint = 'Capturando...';
        this.cdr.detectChanges();

        // Small delay to show "Capturando..." message
        setTimeout(() => {
          this.capturePhoto();
          this.documentCaptureActive = false;
          this.stopDocumentAutoCapture();
        }, 300);
        return;
      }

      // Show countdown
      if (secondsRemaining > 0) {
        this.documentHint = `Mantén el documento fijo... ${secondsRemaining}`;
      }
      this.cdr.detectChanges();
    }, 100); // Update every 100ms
  }

  private stopDocumentAutoCapture(): void {
    this.documentCaptureActive = false;
    this.stableFrames = 0;
    this.documentAlignmentStartTime = null;
    if (this.documentHintTimeout) {
      clearTimeout(this.documentHintTimeout);
      this.documentHintTimeout = undefined;
    }
    if (this.documentCaptureTimeout) {
      clearTimeout(this.documentCaptureTimeout);
      this.documentCaptureTimeout = undefined;
    }
    if (this.documentCountdownInterval) {
      clearInterval(this.documentCountdownInterval);
      this.documentCountdownInterval = undefined;
    }
  }

  private resetCaptureState(): void {
    this.autoCaptureLocked = false;
    this.stableFrames = 0;
    this.faceAligned = false;
    this.faceHint = 'Alinea tu rostro dentro del óvalo';
    this.documentHint = 'Alinea el documento dentro del recuadro';
    this.cameraActive = false;
  }
}
