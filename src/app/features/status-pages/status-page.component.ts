import { CommonModule } from "@angular/common"
import { Component } from "@angular/core"
import { ActivatedRoute, RouterModule } from "@angular/router"

type StatusKind = "404" | "500" | "payment_success" | "payment_pending" | "payment_failed" | "payment_cancelled"
type StatusTone = "info" | "success" | "warning" | "danger"

interface StatusPageConfig {
  eyebrow: string
  title: string
  description: string
  tone: StatusTone
  primaryCtaLabel: string
  primaryCtaLink: string
  secondaryCtaLabel?: string
  secondaryCtaLink?: string
}

@Component({
  selector: "app-status-page",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./status-page.component.html",
  styles: [
    `
      /* Keyframe animations */
      @keyframes floaty {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      @keyframes twinkle {
        0%, 100% {
          opacity: 0.25;
          transform: scale(0.95);
        }
        50% {
          opacity: 0.85;
          transform: scale(1);
        }
      }

      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.5);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes spinSlow {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes spinReverse {
        from {
          transform: rotate(360deg);
        }
        to {
          transform: rotate(0deg);
        }
      }

      @keyframes float1 {
        0%, 100% {
          transform: translate(0, 0);
        }
        25% {
          transform: translate(10px, -15px);
        }
        50% {
          transform: translate(-5px, -25px);
        }
        75% {
          transform: translate(-15px, -10px);
        }
      }

      @keyframes float2 {
        0%, 100% {
          transform: translate(0, 0);
        }
        33% {
          transform: translate(-15px, 20px);
        }
        66% {
          transform: translate(15px, -20px);
        }
      }

      @keyframes float3 {
        0%, 100% {
          transform: translate(0, 0);
        }
        50% {
          transform: translate(20px, 15px);
        }
      }

      @keyframes pulseRing {
        0%, 100% {
          opacity: 0.2;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(1.05);
        }
      }

      @keyframes drawCheck {
        0% {
          stroke-dasharray: 0 100;
        }
        100% {
          stroke-dasharray: 100 0;
        }
      }

      @keyframes drawLine {
        0% {
          stroke-dasharray: 0 50;
        }
        100% {
          stroke-dasharray: 50 0;
        }
      }

      @keyframes drawX {
        0% {
          stroke-dasharray: 0 100;
        }
        100% {
          stroke-dasharray: 100 0;
        }
      }

      @keyframes pop {
        0% {
          opacity: 0;
          transform: scale(0);
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes numberGlow {
        0%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.1);
        }
      }

      /* Animation classes */
      .animate-fade-in-down {
        animation: fadeInDown 0.6s ease-out;
      }

      .animate-fade-in-up {
        animation: fadeInUp 0.6s ease-out;
      }

      .animate-fade-in {
        animation: fadeIn 0.6s ease-out;
        animation-fill-mode: both;
      }

      .animate-scale-in {
        animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .animate-spin-slow {
        animation: spinSlow 30s linear infinite;
      }

      .animate-spin-reverse {
        animation: spinReverse 25s linear infinite;
      }

      .animate-float-1 {
        animation: float1 8s ease-in-out infinite;
      }

      .animate-float-2 {
        animation: float2 10s ease-in-out infinite;
      }

      .animate-float-3 {
        animation: float3 12s ease-in-out infinite;
      }

      .animate-pulse-ring {
        animation: pulseRing 2s ease-in-out infinite;
      }

      .animate-draw-check {
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        animation: drawCheck 0.6s ease-out 0.3s forwards;
      }

      .animate-draw-line {
        stroke-dasharray: 50;
        stroke-dashoffset: 50;
        animation: drawLine 0.4s ease-out 0.3s forwards;
      }

      .animate-draw-x {
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        animation: drawX 0.6s ease-out 0.3s forwards;
      }

      .animate-pop {
        animation: pop 0.4s ease-out 0.5s backwards;
      }

      /* Error number styling */
      .error-number-container {
        position: relative;
        display: inline-block;
      }

      .error-number {
        font-size: 10rem;
        font-weight: 900;
        line-height: 1;
        display: block;
        position: relative;
        z-index: 2;
        text-shadow: 0 0 40px currentColor;
        animation: fadeInUp 0.8s ease-out;
      }

      @media (max-width: 768px) {
        .error-number {
          font-size: 7rem;
        }
      }

      .error-number-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 200px;
        height: 200px;
        border-radius: 50%;
        opacity: 0.15;
        filter: blur(60px);
        z-index: 1;
        animation: numberGlow 3s ease-in-out infinite;
      }

      /* Icon container */
      .status-icon-wrapper {
        position: relative;
        display: inline-block;
      }
    `,
  ],
})
export class StatusPageComponent {
  readonly kind: StatusKind
  readonly config: StatusPageConfig

  readonly orderId: string | null
  readonly invoiceId: string | null
  readonly reference: string | null
  readonly reason: string | null

  constructor(private route: ActivatedRoute) {
    const kind = (this.route.snapshot.data?.["kind"] as StatusKind | undefined) ?? "404"
    this.kind = kind
    this.config = this.resolveConfig(kind)

    const qp = this.route.snapshot.queryParamMap
    this.orderId = qp.get("orderId")
    this.invoiceId = qp.get("invoiceId")
    this.reference = qp.get("reference")
    this.reason = qp.get("reason")
  }

  get iconToneClasses(): string {
    switch (this.config.tone) {
      case "success":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "danger":
        return "bg-rose-100 text-rose-700 border-rose-200"
      default:
        return "bg-indigo-100 text-indigo-700 border-indigo-200"
    }
  }

  // Cambio clave: default ya NO es morado, es el azul del CTA
  get accentStroke(): string {
    switch (this.config.tone) {
      case "success":
        return "#10b981"
      case "warning":
        return "#f59e0b"
      case "danger":
        return "#f43f5e"
      default:
        return "#3366FF"
    }
  }

  get primaryButtonClasses(): string {
    return "group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#3366FF] text-white text-sm font-bold hover:bg-[#274FCC] hover:shadow-lg hover:scale-105 transition-all duration-300 shadow-md"
  }

  // Cambio clave: eliminamos morado (#2b0f60 / #f3ecff) y lo alineamos a azul
  get secondaryButtonClasses(): string {
    return "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border-2 border-gray-200 text-[#3366FF] text-sm font-bold hover:bg-blue-50 hover:border-[#3366FF] hover:scale-105 transition-all duration-300 bg-white/80 backdrop-blur-sm"
  }

  private resolveConfig(kind: StatusKind): StatusPageConfig {
    const base: Record<StatusKind, StatusPageConfig> = {
      "404": {
        eyebrow: "Error 404",
        title: "No encontramos esta página",
        description: "Puede que el enlace esté mal, la página se haya movido o ya no exista.",
        tone: "info",
        primaryCtaLabel: "Ir al inicio",
        primaryCtaLink: "/dashboard",
        secondaryCtaLabel: "Ir a administración",
        secondaryCtaLink: "/administration",
      },
      "500": {
        eyebrow: "Error 500",
        title: "Tuvimos un problema al cargar",
        description: "Ocurrió un error inesperado. Intenta de nuevo en unos minutos.",
        tone: "danger",
        primaryCtaLabel: "Volver al inicio",
        primaryCtaLink: "/dashboard",
        secondaryCtaLabel: "Ir a facturación",
        secondaryCtaLink: "/administration/billing",
      },
      payment_success: {
        eyebrow: "Pago",
        title: "Pago confirmado",
        description: "¡Listo! Tu pago fue procesado correctamente. Si compraste créditos, verás la orden registrada.",
        tone: "success",
        primaryCtaLabel: "Ver órdenes",
        primaryCtaLink: "/administration/orders",
        secondaryCtaLabel: "Ver facturas",
        secondaryCtaLink: "/administration/invoices",
      },
      payment_pending: {
        eyebrow: "Pago",
        title: "Pago pendiente",
        description: "Tu pago está en proceso. Te avisaremos cuando se confirme. Puedes revisar el estado en tus órdenes.",
        tone: "warning",
        primaryCtaLabel: "Ver órdenes",
        primaryCtaLink: "/administration/orders",
        secondaryCtaLabel: "Ir a facturación",
        secondaryCtaLink: "/administration/billing",
      },
      payment_failed: {
        eyebrow: "Pago",
        title: "Pago rechazado",
        description:
          "No pudimos confirmar el pago. Revisa los datos de la tarjeta o intenta con otro método. Si el cobro aparece, contáctanos.",
        tone: "danger",
        primaryCtaLabel: "Volver a créditos",
        primaryCtaLink: "/dashboard",
        secondaryCtaLabel: "Ver órdenes",
        secondaryCtaLink: "/administration/orders",
      },
      payment_cancelled: {
        eyebrow: "Pago",
        title: "Pago cancelado",
        description: "La operación se canceló antes de completarse. Si fue un error, puedes intentarlo de nuevo.",
        tone: "info",
        primaryCtaLabel: "Volver a créditos",
        primaryCtaLink: "/dashboard",
        secondaryCtaLabel: "Ir a facturación",
        secondaryCtaLink: "/administration/billing",
      },
    }

    return base[kind] ?? base["404"]
  }

  get showErrorNumber(): boolean {
    return this.kind === "404" || this.kind === "500"
  }

  get errorNumber(): string {
    return this.kind === "404" ? "404" : this.kind === "500" ? "500" : ""
  }

  get iconContainerClasses(): string {
    return ""
  }
}
