import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-camera-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-preview.component.html'
})
export class CameraPreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video', { static: false })
  private videoRef?: ElementRef<HTMLVideoElement>;

  errorMessage = '';
  isActive = false;
  private stream?: MediaStream;

  async ngAfterViewInit(): Promise<void> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      this.errorMessage = 'La camara no esta disponible en este navegador.';
    }
  }

  async startCamera(): Promise<void> {
    this.errorMessage = '';
    if (!navigator?.mediaDevices?.getUserMedia) {
      this.errorMessage = 'La camara no esta disponible en este navegador.';
      return;
    }

    if (!window.isSecureContext) {
      this.errorMessage = 'La camara requiere HTTPS o localhost para funcionar.';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play();
        this.isActive = true;
      }
    } catch {
      this.errorMessage = 'No pudimos acceder a tu camara. Revisa los permisos.'; 
    }
  }

  ngOnDestroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
