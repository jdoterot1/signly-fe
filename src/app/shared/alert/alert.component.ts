import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { AlertType }                             from './alert-type.enum';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html'
})
export class AlertComponent {
  /** Tipo de alerta */
  @Input() type: AlertType = AlertType.Success;
  /** Mensaje a mostrar */
  @Input() message = '';
  /** Si está visible */
  @Input() show = false;
  /** Si es un modal de confirmación */
  @Input() confirmMode = false;

  /** Evento al confirmar (sólo en confirmMode) */
  @Output() confirm = new EventEmitter<void>();
  /** Evento al cancelar (sólo en confirmMode) */
  @Output() cancel  = new EventEmitter<void>();

  alertType = AlertType;

  /** Cierra el toast o modal */
  close() {
    this.show = false;
  }

  /** Usuario hace click en "Aceptar" en el modal */
  onConfirm() {
    this.confirm.emit();
    this.close();
  }

  /** Usuario hace click en "Cancelar" en el modal */
  onCancel() {
    this.cancel.emit();
    this.close();
  }
}
