import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import { FlowState, FlowChallengeType } from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';
import { NotifyService } from '../../../core/services/notify/notify.service';

@Component({
  selector: 'app-flow-complete',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowProgressComponent],
  templateUrl: './flow-complete.component.html'
})
export class FlowCompleteComponent implements OnInit, OnDestroy {
  processId = '';
  flowState: FlowState | null = null;

  sendCopy = true;
  email = '';
  completing = false;
  completed = false;
  completeError: string | null = null;
  completeNotice: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private notifyService: NotifyService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();

    if (this.flowState?.participant?.identity?.email) {
      this.email = this.flowState.participant.identity.email;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getStepLabel(step: FlowChallengeType): string {
    const labels: Record<FlowChallengeType, string> = {
      biometric: 'Verificacion biometrica',
      otp_email: 'Codigo por correo',
      otp_sms: 'Codigo por SMS',
      otp_whatsapp: 'Codigo por WhatsApp',
      liveness: 'Prueba de vida',
      template_sign: 'Firma del documento'
    };
    return labels[step] || step;
  }

  getStepIcon(step: FlowChallengeType): string {
    const icons: Record<FlowChallengeType, string> = {
      biometric: 'pi pi-id-card',
      otp_email: 'pi pi-envelope',
      otp_sms: 'pi pi-mobile',
      otp_whatsapp: 'pi pi-whatsapp',
      liveness: 'pi pi-camera',
      template_sign: 'pi pi-pencil'
    };
    return icons[step] || 'pi pi-check-circle';
  }

  completeFlow(): void {
    if (!this.processId || this.completing) return;

    this.completing = true;
    this.completeError = null;
    this.completeNotice = null;
    const recipientEmail = (this.email || '').trim();
    const shouldSendCopy = this.sendCopy && !!recipientEmail;
    const snapshot = this.flowService.getTemplateSnapshot();

    const sub = this.flowService.completeFlow(this.processId, {
      // We centralize copy delivery through Notify API.
      sendCopy: false,
      email: recipientEmail
    }).pipe(
      switchMap(() => {
        if (!shouldSendCopy) {
          return of(void 0);
        }

        if (!snapshot?.downloadUrl) {
          return of(void 0);
        }

        const participantName = this.flowState?.participant?.displayName || 'Usuario';
        const templateTitle = snapshot.templateName || 'Documento firmado';
        const attachmentName = this.buildAttachmentFileName(snapshot.templateName, snapshot.templateVersion);

        return this.notifyService.sendEmail({
          to: [recipientEmail],
          subject: `Documento firmado: ${templateTitle}`,
          html: this.buildNotifyHtml(participantName, templateTitle),
          attachments: [
            {
              url: snapshot.downloadUrl,
              filename: attachmentName
            }
          ]
        });
      })
    ).subscribe({
      next: () => {
        if (shouldSendCopy) {
          if (snapshot?.downloadUrl) {
            this.completeNotice = `Enviamos una copia del documento a ${recipientEmail}.`;
          } else {
            this.completeNotice = 'Flujo completado. No encontramos URL para adjuntar el documento en el correo.';
          }
        }
        this.completed = true;
        this.completing = false;
      },
      error: (err: FlowError) => {
        this.completeError = err.message || 'Error al completar el flujo.';
        this.completing = false;
      }
    });

    this.subscriptions.push(sub);
  }

  closeWindow(): void {
    this.flowService.clearFlowState();
    this.router.navigate(['/flow', this.processId, 'done']);
  }

  private buildNotifyHtml(participantName: string, templateTitle: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Documento firmado</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin: 0 0 12px 0;">Documento firmado</h2>
        <p style="margin: 0 0 10px 0;">Hola <strong>${participantName}</strong>,</p>
        <p style="margin: 0 0 10px 0;">
          Tu proceso de firma fue completado correctamente.
          Adjuntamos el documento <strong>${templateTitle}</strong> para tu respaldo.
        </p>
        <p style="margin: 0;">Equipo Signly</p>
      </body>
      </html>
    `;
  }

  private buildAttachmentFileName(templateName?: string, templateVersion?: string): string {
    const safeName = (templateName || 'documento-firmado')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const version = templateVersion ? `-${templateVersion.replace(/[^a-zA-Z0-9]+/g, '-')}` : '';
    return `${safeName || 'documento-firmado'}${version}.pdf`;
  }
}
