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
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permissionStatus.state === 'denied') {
        this.errorMessage =
          'El acceso a la camara esta bloqueado. Habilita el permiso en la configuracion del navegador y recarga la pagina.';
        return;
      }
    } catch {
      // permissions.query may not be supported; continue
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play();
        this.isActive = true;
      }
    } catch (err) {
      const errorName = (err as DOMException)?.name ?? '';
      if (errorName === 'NotAllowedError') {
        this.errorMessage =
          'El permiso de camara fue denegado. Habilita la camara en la configuracion del navegador y recarga la pagina.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.errorMessage = 'No se encontro ninguna camara conectada a tu dispositivo.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        this.errorMessage = 'La camara esta siendo usada por otra aplicacion. Cierra las demas apps y vuelve a intentar.';
      } else {
        this.errorMessage = 'No pudimos acceder a tu camara. Revisa los permisos.';
      }
      console.error('Error al acceder a la camara:', err);
    }
  }

  ngOnDestroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
