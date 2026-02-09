// src/app/shared/alert/alert.service.ts
import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  showSuccess(message: string, title: string = '¡Bien hecho!') {
    this.showAlert('success', title, message);
  }

  showError(message: string, title: string = '¡Error!') {
    this.showAlert('error', title, message);
  }

  showInfo(message: string, title: string = 'Información') {
    this.showAlert('info', title, message);
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
