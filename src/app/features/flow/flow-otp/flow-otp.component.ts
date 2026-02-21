import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { FlowService, FlowError } from '../../../core/services/flow/flow.service';
import { FlowState, OtpChannel, OtpSendData } from '../../../core/models/flow/flow.model';
import { FlowProgressComponent } from '../shared/flow-progress/flow-progress.component';

type OtpStep = 'sending' | 'input' | 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-flow-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FlowProgressComponent],
  templateUrl: './flow-otp.component.html'
})
export class FlowOtpComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  processId = '';
  flowState: FlowState | null = null;
  channel: OtpChannel = 'email';

  currentStep: OtpStep = 'sending';
  otpForm!: FormGroup;

  loading = false;
  error: string | null = null;
  otpData: OtpSendData | null = null;

  // Countdown
  countdown = 0;
  private countdownSub?: Subscription;

  // Masked contact info
  maskedContact = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('processId') ?? '';
    this.flowState = this.flowService.getFlowState();

    // Determine channel from route
    const routePath = this.route.snapshot.routeConfig?.path ?? '';
    if (routePath.includes('sms')) {
      this.channel = 'sms';
    } else if (routePath.includes('whatsapp')) {
      this.channel = 'whatsapp';
    } else {
      this.channel = 'email';
    }

    // Verificar que tenemos un token valido
    const token = this.flowService.getFlowToken();
    if (!this.processId || !this.flowState || !token) {
      // Redirigir al landing para iniciar/reiniciar el flujo
      this.router.navigate(['/flow', this.processId || 'invalid']);
      return;
    }

    // Set masked contact
    this.setMaskedContact();

    // Initialize OTP form
    this.otpForm = this.fb.group({
      otp1: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp2: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp3: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp4: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp5: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]],
      otp6: ['', [Validators.required, Validators.pattern(/^[0-9]$/)]]
    });

    // Send OTP automatically
    this.sendOtp();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.countdownSub?.unsubscribe();
  }

  get f() {
    return this.otpForm.controls as Record<string, FormControl>;
  }

  private setMaskedContact(): void {
    if (!this.flowState) return;

    const identity = this.flowState.participant.identity;
    if (this.channel === 'email') {
      this.maskedContact = identity.email;
    } else {
      this.maskedContact = identity.phone;
    }
  }

  sendOtp(): void {
    this.currentStep = 'sending';
    this.error = null;

    let sendObs;
    switch (this.channel) {
      case 'sms':
        sendObs = this.flowService.sendOtpSms(this.processId);
        break;
      case 'whatsapp':
        sendObs = this.flowService.sendOtpWhatsapp(this.processId);
        break;
      default:
        sendObs = this.flowService.sendOtpEmail(this.processId);
    }

    const sub = sendObs.subscribe({
      next: (data) => {
        this.otpData = data;
        this.currentStep = 'input';
        this.startCooldown(data.cooldownUntil);
      },
      error: (err: FlowError) => {
        // Check if it's a step mismatch error
        if (err.code === 'bad_request' && err.details?.currentStep) {
          this.error = this.translate.instant('FLOW.OTP.ERROR_STEP_MISMATCH', {
            step: err.details.currentStep
          });
        } else if (err.code === 'token_expired') {
          this.error = this.translate.instant('FLOW.OTP.ERROR_SESSION_EXPIRED');
        } else {
          this.error = this.resolveOtpErrorMessage(err, 'FLOW.OTP.ERROR_SEND_FAILED');
        }
        this.currentStep = 'error';
      }
    });

    this.subscriptions.push(sub);
  }

  private startCooldown(cooldownUntil: number): void {
    this.countdownSub?.unsubscribe();

    const now = Math.floor(Date.now() / 1000);
    this.countdown = Math.max(0, cooldownUntil - now);

    if (this.countdown > 0) {
      this.countdownSub = interval(1000).subscribe(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          this.countdownSub?.unsubscribe();
        }
      });
    }
  }

  resendOtp(): void {
    if (this.countdown > 0) return;

    // Clear form
    this.otpForm.reset();
    this.sendOtp();
  }

  onKeyUp(event: KeyboardEvent, index: number): void {
    const inputElements = this.otpInputs.toArray();
    const target = event.target as HTMLInputElement;

    if (target.value && index < inputElements.length - 1) {
      inputElements[index + 1].nativeElement.focus();
    } else if (!target.value && index > 0 && event.key === 'Backspace') {
      inputElements[index - 1].nativeElement.focus();
    }

    // Auto-submit when all fields are filled
    if (this.otpForm.valid) {
      this.verifyOtp();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') ?? '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      const inputElements = this.otpInputs.toArray();
      digits.split('').forEach((digit, index) => {
        this.f[`otp${index + 1}`].setValue(digit);
        if (index < inputElements.length - 1) {
          inputElements[index + 1].nativeElement.focus();
        }
      });

      if (this.otpForm.valid) {
        this.verifyOtp();
      }
    }
  }

  verifyOtp(): void {
    if (this.otpForm.invalid || this.loading) return;

    this.loading = true;
    this.currentStep = 'verifying';
    this.error = null;

    const code = Object.keys(this.f)
      .sort()
      .map(key => this.f[key].value)
      .join('');

    const sub = this.flowService.verifyOtp(this.processId, this.channel, code).subscribe({
      next: (data) => {
        this.loading = false;
        this.currentStep = 'success';

        // Navigate to next step after a short delay
        setTimeout(() => {
          if (data.nextStep) {
            this.navigateToNextStep(data.nextStep);
          } else if (data.completed) {
            // After auth pipeline is done, signer must fill/sign the template.
            this.router.navigate(['/flow', this.processId, 'template-sign']);
          } else {
            this.router.navigate(['/flow', this.processId, 'template-sign']);
          }
        }, 1500);
      },
      error: (err: FlowError) => {
        this.loading = false;
        this.currentStep = 'input';

        if (err.code === 'token_expired') {
          this.error = this.translate.instant('FLOW.OTP.ERROR_SESSION_EXPIRED');
          this.currentStep = 'error';
        } else {
          this.error = this.resolveOtpErrorMessage(err, 'FLOW.OTP.ERROR_CODE_INVALID');
        }

        // Clear form for retry
        this.otpForm.reset();
        setTimeout(() => {
          this.otpInputs.first?.nativeElement.focus();
        }, 100);
      }
    });

    this.subscriptions.push(sub);
  }

  private navigateToNextStep(step: string): void {
    const routes: Record<string, string> = {
      otp_email: 'otp-email',
      otp_sms: 'otp-sms',
      otp_whatsapp: 'otp-whatsapp',
      biometric: 'biometric',
      liveness: 'liveness',
      template_sign: 'template-sign'
    };

    const route = routes[step];
    if (route) {
      this.router.navigate(['/flow', this.processId, route]);
    } else {
      this.router.navigate(['/flow', this.processId, 'template-sign']);
    }
  }

  getChannelLabel(): string {
    const labels: Record<OtpChannel, string> = {
      email: 'correo electronico',
      sms: 'mensaje de texto',
      whatsapp: 'WhatsApp'
    };
    return labels[this.channel];
  }

  getChannelIcon(): string {
    const icons: Record<OtpChannel, string> = {
      email: 'pi-envelope',
      sms: 'pi-mobile',
      whatsapp: 'pi-whatsapp'
    };
    return icons[this.channel];
  }

  formatCountdown(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/flow', this.processId]);
  }

  private resolveOtpErrorMessage(err: FlowError, fallbackKey: string): string {
    const rawMessage = (err?.message || '').toLowerCase();
    const reason = (err?.details?.reason || '').toLowerCase();

    if (rawMessage.includes('otp verification failed') || reason.includes('codemismatchexception')) {
      return this.translate.instant('FLOW.OTP.ERROR_VERIFY_FAILED');
    }

    if (reason.includes('expiredcodeexception') || rawMessage.includes('expired verification code')) {
      return this.translate.instant('FLOW.OTP.ERROR_CODE_EXPIRED');
    }

    return err?.message || this.translate.instant(fallbackKey);
  }
}
