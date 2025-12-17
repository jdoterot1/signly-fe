import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PricingService } from '../../../core/services/pricing/pricing.service';
import { PricingMeter, PricingTier } from '../../../core/models/pricing/pricing.model';
import { AlertService } from '../../alert/alert.service';

@Component({
  selector: 'app-pricing-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pricing-modal.component.html'
})
export class PricingModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  viewMode: 'credits' | 'ondemand' = 'credits';

  region = 'CO';
  currency = 'COP';

  creditsQty = 250;
  creditsMin = 50;
  creditsMax = 2000;
  creditsStep = 50;

  meters: PricingMeter[] = [];
  purchaseMeter: PricingMeter | null = null;
  signatureMeters: PricingMeter[] = [];

  isLoading = false;

  constructor(
    private pricingService: PricingService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadMeters();
  }

  closeModal(): void {
    this.closed.emit();
  }

  setViewMode(mode: 'credits' | 'ondemand'): void {
    this.viewMode = mode;
  }

  loadMeters(): void {
    this.isLoading = true;
    this.pricingService
      .listPricingMeters()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: meters => {
          this.meters = Array.isArray(meters) ? meters : [];
          this.hydrateMeters();
          this.hydrateCreditsBounds();
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudieron cargar los créditos.';
          this.alertService.showError(message, 'Error al cargar');
        }
      });
  }

  onCreditsQtyChange(value: number): void {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      return;
    }
    this.creditsQty = this.clamp(Math.round(normalized), this.creditsMin, this.creditsMax);
  }

  get hasPurchasePricing(): boolean {
    return !!this.getApplicableTiers(this.purchaseMeter).length;
  }

  get purchaseUnitPrice(): number {
    const tier = this.pickTier(this.purchaseMeter, this.creditsQty);
    if (!tier) {
      return 1;
    }
    return tier.unit_price ?? 1;
  }

  get purchaseTierLabel(): string {
    const tier = this.pickTier(this.purchaseMeter, this.creditsQty);
    if (!tier) {
      return '—';
    }
    return this.formatQtyRange(tier);
  }

  get totalToPay(): number {
    return Math.round((this.creditsQty ?? 0) * (this.purchaseUnitPrice ?? 1));
  }

  get baseUnitPrice(): number {
    const tiers = this.getApplicableTiers(this.purchaseMeter);
    if (!tiers.length) {
      return 1;
    }
    return tiers[0].unit_price ?? 1;
  }

  get savingsAmount(): number {
    const base = (this.creditsQty ?? 0) * (this.baseUnitPrice ?? 1);
    const now = this.totalToPay ?? 0;
    const diff = Math.round(base - now);
    return diff > 0 ? diff : 0;
  }

  get savingsPct(): number {
    const base = (this.creditsQty ?? 0) * (this.baseUnitPrice ?? 1);
    if (!base) {
      return 0;
    }
    return Math.round((this.savingsAmount / base) * 100);
  }

  creditsPerDoc(meter: PricingMeter): number | null {
    const tier = this.pickTier(meter, this.creditsQty);
    if (!tier) {
      return null;
    }
    return tier.unit_price ?? null;
  }

  meterTierLabel(meter: PricingMeter): string {
    const tier = this.pickTier(meter, this.creditsQty);
    if (!tier) {
      return '—';
    }
    return this.formatQtyRange(tier);
  }

  formatQtyRange(tier: PricingTier): string {
    const min = tier.min_qty ?? 0;
    const max = tier.max_qty;
    if (max === null || max === undefined) {
      return `${min}+`;
    }
    return `${min} - ${max}`;
  }

  formatMoney(amount: number, currency: string): string {
    const normalized = String(currency || '').toUpperCase();
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: normalized }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${normalized}`.trim();
    }
  }

  formatCredits(amount: number): string {
    const value = amount ?? 0;
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  }

  private hydrateMeters(): void {
    const purchase = this.meters.find(meter => this.isPurchaseMeter(meter)) ?? null;
    this.purchaseMeter = purchase;
    this.signatureMeters = this.meters
      .filter(meter => this.isSignatureMeter(meter))
      .slice()
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  private hydrateCreditsBounds(): void {
    const tiers = this.getApplicableTiers(this.purchaseMeter);
    const minQty = tiers.length ? tiers[0].min_qty ?? 0 : 0;
    const last = tiers.length ? tiers[tiers.length - 1] : null;
    const maxQty = last?.max_qty ?? null;

    this.creditsMin = Math.max(50, minQty || 0);
    this.creditsMax = maxQty ?? Math.max(this.creditsMin * 10, (last?.min_qty ?? this.creditsMin) * 4, 2000);
    this.creditsStep = this.creditsMax >= 10000 ? 250 : this.creditsMax >= 5000 ? 100 : 50;

    this.creditsQty = this.clamp(this.creditsQty, this.creditsMin, this.creditsMax);
  }

  private pickTier(meter: PricingMeter | null, qty: number): PricingTier | null {
    const tiers = this.getApplicableTiers(meter);
    if (!tiers.length) {
      return null;
    }

    const normalized = Math.max(0, qty ?? 0);
    const match = tiers.find(tier => {
      const min = tier.min_qty ?? 0;
      const max = tier.max_qty;
      if (max === null || max === undefined) {
        return normalized >= min;
      }
      return normalized >= min && normalized <= max;
    });

    return match ?? tiers[tiers.length - 1] ?? null;
  }

  private getApplicableTiers(meter: PricingMeter | null): PricingTier[] {
    if (!meter?.tiers?.length) {
      return [];
    }
    const now = new Date();
    return meter.tiers
      .filter(tier => (tier.currency ?? '').toUpperCase() === this.currency.toUpperCase())
      .filter(tier => (tier.region ?? '').toUpperCase() === this.region.toUpperCase())
      .filter(tier => this.isEffective(tier, now))
      .slice()
      .sort((a, b) => (a.min_qty ?? 0) - (b.min_qty ?? 0));
  }

  private isEffective(tier: PricingTier, now: Date): boolean {
    const from = this.safeDate(tier.effective_from);
    const to = this.safeDate(tier.effective_to);
    if (from && now < from) {
      return false;
    }
    if (to && now > to) {
      return false;
    }
    return true;
  }

  private safeDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isPurchaseMeter(meter: PricingMeter): boolean {
    const code = (meter.meter_code ?? '').toUpperCase();
    const unit = (meter.unit ?? '').toLowerCase();
    const category = (meter.category ?? '').toLowerCase();
    return unit === 'credit' || code.includes('CREDIT') || category.includes('credit');
  }

  private isSignatureMeter(meter: PricingMeter): boolean {
    const category = (meter.category ?? '').toLowerCase();
    return category === 'signature';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
