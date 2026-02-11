// src/app/shared/alert/alert.model.ts
export type AlertType = 'success' | 'error' | 'info';

export interface AlertConfig {
  type: AlertType;
  message: string;
  duration?: number; // en ms (opcional, por defecto 3000)
}
