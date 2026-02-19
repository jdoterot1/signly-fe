import { Injectable } from '@angular/core';
import type { FlowChallengeType } from '../../models/flow/flow.model';

// Type aliases for clarity
export type HelpCategory = 'biometric' | 'otp' | 'general';
export type BiometricStep = 'intro' | 'selfie' | 'idFront' | 'idBack' | 'uploading' | 'verifying' | 'success' | 'error';
export type OtpChannel = 'email' | 'sms' | 'whatsapp';
export type OtpStep = 'sending' | 'input' | 'verifying' | 'success' | 'error';

// Data models
export interface HelpTip {
  icon: string;                                  // PrimeNG icon class (e.g., 'pi-camera')
  text: string;                                  // Help text in Spanish
  priority: 'critical' | 'important' | 'helpful'; // Visual styling priority
}

export interface HelpSection {
  key: string;                                   // Unique ID (e.g., 'selfie', 'email')
  title: string;                                 // Section header
  icon: string;                                  // Section icon
  tips: HelpTip[];                               // Array of tips for this section
}

export interface HelpTab {
  category: HelpCategory;                        // Tab category
  label: string;                                 // Tab label
  icon: string;                                  // Tab icon
  sections: HelpSection[];                       // Accordion sections in this tab
  isVisible: boolean;                            // Computed from pipeline
}

export interface HelpContext {
  currentFlowStep: FlowChallengeType | null;     // Current flow step from FlowService
  pipeline: FlowChallengeType[];                 // All steps in user's flow
  currentBiometricStep?: BiometricStep;          // Current biometric sub-step (if applicable)
  otpChannel?: OtpChannel;                       // OTP channel (inferred from currentFlowStep)
  currentOtpStep?: OtpStep;                      // Current OTP sub-step (if applicable)
}

@Injectable({
  providedIn: 'root'
})
export class FlowHelpService {

  // ========================================
  // BIOMETRIC HELP CONTENT
  // ========================================

  private readonly biometricSections: HelpSection[] = [
    {
      key: 'intro',
      title: 'Preparación',
      icon: 'pi-info-circle',
      tips: [
        {
          icon: 'pi-sun',
          text: 'Busca un lugar con buena iluminación. Evita contraluz o sombras fuertes en tu rostro.',
          priority: 'critical'
        },
        {
          icon: 'pi-id-card',
          text: 'Ten tu documento de identidad a la mano antes de iniciar. Asegúrate de que esté vigente.',
          priority: 'critical'
        },
        {
          icon: 'pi-camera',
          text: 'Cuando el navegador te lo solicite, permite el acceso a la cámara.',
          priority: 'important'
        },
        {
          icon: 'pi-desktop',
          text: 'Si usas otra aplicación con la cámara (Zoom, Meet, etc.), ciérrala primero.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'selfie',
      title: 'Captura de selfie',
      icon: 'pi-user',
      tips: [
        {
          icon: 'pi-eye',
          text: 'Mira directamente a la cámara con tu rostro centrado en el óvalo guía.',
          priority: 'critical'
        },
        {
          icon: 'pi-times-circle',
          text: 'Retira lentes, gorra o cualquier accesorio que cubra tu rostro.',
          priority: 'important'
        },
        {
          icon: 'pi-face-smile',
          text: 'Mantén una expresión neutral y no te muevas hasta que la captura se complete automáticamente.',
          priority: 'important'
        },
        {
          icon: 'pi-clock',
          text: 'El sistema esperará 3 segundos con tu rostro bien alineado antes de capturar.',
          priority: 'helpful'
        },
        {
          icon: 'pi-refresh',
          text: 'Si la foto no quedó bien, puedes retomar cuantas veces necesites.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'idFront',
      title: 'Documento frontal',
      icon: 'pi-id-card',
      tips: [
        {
          icon: 'pi-box',
          text: 'Coloca tu documento dentro del recuadro guía asegurándote de que quede completo y legible.',
          priority: 'critical'
        },
        {
          icon: 'pi-sun',
          text: 'Evita reflejos o destellos de luz. Inclina ligeramente el documento si ves brillos.',
          priority: 'critical'
        },
        {
          icon: 'pi-image',
          text: 'Asegúrate de que toda la información (foto, nombre, número) sea visible y nítida.',
          priority: 'important'
        },
        {
          icon: 'pi-clock',
          text: 'Mantén el documento fijo durante 3 segundos para la captura automática.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'idBack',
      title: 'Documento reverso',
      icon: 'pi-replay',
      tips: [
        {
          icon: 'pi-sync',
          text: 'Dale vuelta a tu documento y repite el proceso: colócalo dentro del recuadro.',
          priority: 'critical'
        },
        {
          icon: 'pi-check-square',
          text: 'Verifica que el código de barras, firma y datos adicionales sean legibles.',
          priority: 'important'
        },
        {
          icon: 'pi-sun',
          text: 'Igual que el frente, evita reflejos que tapen la información.',
          priority: 'important'
        }
      ]
    },
    {
      key: 'camera',
      title: 'Problemas de cámara',
      icon: 'pi-exclamation-triangle',
      tips: [
        {
          icon: 'pi-shield',
          text: 'Si el navegador no muestra tu cámara, verifica que hayas dado permisos en la configuración.',
          priority: 'critical'
        },
        {
          icon: 'pi-refresh',
          text: 'Intenta recargar la página y volver a dar permiso cuando se solicite.',
          priority: 'important'
        },
        {
          icon: 'pi-desktop',
          text: 'Si usas otra app con la cámara (Zoom, Meet), ciérrala primero.',
          priority: 'helpful'
        },
        {
          icon: 'pi-globe',
          text: 'En algunos navegadores, necesitas usar HTTPS (conexión segura) para acceder a la cámara.',
          priority: 'helpful'
        }
      ]
    }
  ];

  // ========================================
  // OTP HELP CONTENT
  // ========================================

  private readonly otpSections: HelpSection[] = [
    {
      key: 'email',
      title: 'Código por correo',
      icon: 'pi-envelope',
      tips: [
        {
          icon: 'pi-search',
          text: 'Revisa tu bandeja de entrada y la carpeta de SPAM o correo no deseado.',
          priority: 'critical'
        },
        {
          icon: 'pi-at',
          text: 'Verifica que el correo mostrado sea correcto.',
          priority: 'important'
        },
        {
          icon: 'pi-clock',
          text: 'El código puede tardar hasta 2 minutos en llegar. Espera antes de solicitar reenvío.',
          priority: 'helpful'
        },
        {
          icon: 'pi-refresh',
          text: 'Si no llega, usa el botón "Reenviar código" después del tiempo de espera.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'sms',
      title: 'Código por SMS',
      icon: 'pi-mobile',
      tips: [
        {
          icon: 'pi-phone',
          text: 'Verifica que el número mostrado sea correcto.',
          priority: 'critical'
        },
        {
          icon: 'pi-signal',
          text: 'Asegúrate de tener señal celular. Los SMS requieren cobertura de red móvil.',
          priority: 'important'
        },
        {
          icon: 'pi-clock',
          text: 'Los SMS pueden tener retrasos de hasta 5 minutos dependiendo de tu operador.',
          priority: 'helpful'
        },
        {
          icon: 'pi-ban',
          text: 'Verifica que no tengas bloqueados los mensajes de números desconocidos.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'whatsapp',
      title: 'Código por WhatsApp',
      icon: 'pi-whatsapp',
      tips: [
        {
          icon: 'pi-check',
          text: 'Asegúrate de tener WhatsApp instalado y activo en el número mostrado.',
          priority: 'critical'
        },
        {
          icon: 'pi-wifi',
          text: 'Verifica que tengas conexión a internet (WiFi o datos móviles).',
          priority: 'important'
        },
        {
          icon: 'pi-phone',
          text: 'El número de WhatsApp debe coincidir con el número registrado.',
          priority: 'important'
        },
        {
          icon: 'pi-refresh',
          text: 'Si no llega el mensaje, intenta cerrar y abrir WhatsApp, luego solicita reenvío.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'verification',
      title: 'Ingresar código',
      icon: 'pi-key',
      tips: [
        {
          icon: 'pi-hashtag',
          text: 'El código son 6 dígitos numéricos. Puedes copiar y pegar si recibes un enlace.',
          priority: 'important'
        },
        {
          icon: 'pi-stopwatch',
          text: 'Los códigos de verificación expiran después de un tiempo. Si pasó mucho tiempo, solicita uno nuevo.',
          priority: 'important'
        },
        {
          icon: 'pi-times',
          text: 'Si ingresas mal el código, se limpiará automáticamente para que intentes de nuevo.',
          priority: 'helpful'
        }
      ]
    },
    {
      key: 'resend',
      title: 'Reenvío de código',
      icon: 'pi-replay',
      tips: [
        {
          icon: 'pi-clock',
          text: 'Debes esperar el tiempo indicado antes de poder solicitar un nuevo código.',
          priority: 'important'
        },
        {
          icon: 'pi-arrow-left',
          text: 'Si cambiaste de método (email, SMS, WhatsApp), puedes volver al inicio y elegir otro.',
          priority: 'helpful'
        }
      ]
    }
  ];

  // ========================================
  // GENERAL HELP CONTENT
  // ========================================

  private readonly generalSection: HelpSection = {
    key: 'general',
    title: 'Consejos generales',
    icon: 'pi-info-circle',
    tips: [
      {
        icon: 'pi-sun',
        text: 'Usa buena iluminación y evita contraluz o sombras fuertes.',
        priority: 'important'
      },
      {
        icon: 'pi-window-maximize',
        text: 'No cierres esta pestaña hasta ver el estado "Completado" al final del proceso.',
        priority: 'critical'
      },
      {
        icon: 'pi-lock',
        text: 'Tus datos biométricos están cifrados y son procesados de forma segura.',
        priority: 'helpful'
      },
      {
        icon: 'pi-question-circle',
        text: 'Si tienes problemas técnicos persistentes, contacta al soporte.',
        priority: 'helpful'
      }
    ]
  };

  // ========================================
  // PUBLIC METHODS
  // ========================================

  /**
   * Get all help tabs filtered by the user's pipeline.
   * Only shows tabs that are relevant to the user's flow.
   */
  getHelpTabs(context: HelpContext): HelpTab[] {
    const tabs: HelpTab[] = [
      {
        category: 'biometric',
        label: 'Biometría',
        icon: 'pi-camera',
        sections: this.biometricSections,
        isVisible: this.hasBiometric(context.pipeline)
      },
      {
        category: 'otp',
        label: 'Código de verificación',
        icon: 'pi-key',
        sections: this.getRelevantOtpSections(context),
        isVisible: this.hasOtp(context.pipeline)
      },
      {
        category: 'general',
        label: 'General',
        icon: 'pi-info-circle',
        sections: [this.generalSection],
        isVisible: true  // Always visible
      }
    ];

    // Filter to only visible tabs
    return tabs.filter(tab => tab.isVisible);
  }

  /**
   * Determine which tab should be initially active based on current flow step.
   */
  getInitialActiveTab(context: HelpContext): HelpCategory {
    if (context.currentFlowStep === 'biometric' || context.currentFlowStep === 'liveness') {
      return 'biometric';
    }

    if (this.isOtpStep(context.currentFlowStep)) {
      return 'otp';
    }

    // Default to first available tab
    const tabs = this.getHelpTabs(context);
    return tabs.length > 0 ? tabs[0].category : 'general';
  }

  /**
   * Determine which section should be auto-expanded based on context.
   */
  getSectionToAutoExpand(category: HelpCategory, context: HelpContext): string | null {
    if (category === 'biometric' && context.currentBiometricStep) {
      return context.currentBiometricStep;
    }

    if (category === 'otp' && context.otpChannel) {
      return context.otpChannel;
    }

    // Default: expand first section
    return null;
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Check if pipeline includes any biometric verification.
   */
  private hasBiometric(pipeline: FlowChallengeType[]): boolean {
    return pipeline.some(step => step === 'biometric' || step === 'liveness');
  }

  /**
   * Check if pipeline includes any OTP verification.
   */
  private hasOtp(pipeline: FlowChallengeType[]): boolean {
    return pipeline.some(step => this.isOtpStep(step));
  }

  /**
   * Check if a flow step is an OTP step.
   */
  private isOtpStep(step: FlowChallengeType | null): boolean {
    return step === 'otp_email' || step === 'otp_sms' || step === 'otp_whatsapp';
  }

  /**
   * Get relevant OTP sections based on context.
   * If we know the specific channel, we can prioritize those sections.
   */
  private getRelevantOtpSections(context: HelpContext): HelpSection[] {
    // Always include verification and resend sections
    const commonSections = this.otpSections.filter(
      section => section.key === 'verification' || section.key === 'resend'
    );

    // Add channel-specific sections
    if (context.otpChannel) {
      const channelSection = this.otpSections.find(
        section => section.key === context.otpChannel
      );
      if (channelSection) {
        return [channelSection, ...commonSections];
      }
    }

    // If no specific channel, return all OTP sections
    return this.otpSections;
  }
}
