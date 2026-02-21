// src/app/shared/alert/alert.service.ts
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private translate = inject(TranslateService);

  showSuccess(message: string, title?: string) {
    this.showAlert('success', title ?? this.translate.instant('ALERTS.SUCCESS_TITLE'), message);
  }

  showError(message: string, title?: string) {
    this.showAlert('error', title ?? this.translate.instant('ALERTS.ERROR_TITLE'), message);
  }

  showInfo(message: string, title?: string) {
    this.showAlert('info', title ?? this.translate.instant('ALERTS.INFO_TITLE'), message);
  }

  async showConfirm(
    message: string,
    title = 'Confirmación',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text: message,
      background: '#fff',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      showCancelButton: true,
      reverseButtons: true
    });

    return result.isConfirmed;
  }

  private showAlert(icon: SweetAlertIcon, title: string, text: string) {
    Swal.fire({
      icon,
      title,
      text,
      background: '#fff',
      confirmButtonColor: '#6366f1', // Indigo
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      customClass: {
        popup: 'animate__animated animate__fadeInDown'
      }
    });
  }
}
