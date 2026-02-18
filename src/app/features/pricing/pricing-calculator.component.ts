import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { PricingService } from '../../core/services/pricing/pricing.service';
import { PricingMeter, PricingTier } from '../../core/models/pricing/pricing.model';
import { AlertService } from '../../shared/alert/alert.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface MeterEstimate {
  meter: PricingMeter;
  qty: number;
}

@Component({
  selector: 'app-pricing-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './pricing-calculator.component.html'
})
export class PricingCalculatorComponent implements OnInit {
  mode: 'credits' | 'ondemand' = 'ondemand';

  region = 'CO';
  currency = 'COP';

  isLoading = false;
  meters: PricingMeter[] = [];
  estimates: MeterEstimate[] = [];

  constructor(
    private pricingService: PricingService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.pricingService
      .listPricingMeters()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: meters => {
          this.meters = Array.isArray(meters) ? meters : [];
          this.hydrateEstimates();
          this.hydrateDefaultsFromData();
        },
        error: err => {
          const message = err instanceof Error ? err.message : this.translate.instant('PRICING.CALCULATOR.ERROR_LOAD');
          this.alertService.showError(message, this.translate.instant('PRICING.CALCULATOR.ERROR_LOAD_TITLE'));
        }
      });
  }

  setMode(next: 'credits' | 'ondemand'): void {
    this.mode = next;
  }

  setQty(estimate: MeterEstimate, qty: number): void {
    const normalized = Number(qty);
    if (!Number.isFinite(normalized)) {
      return;
    }
    estimate.qty = Math.max(0, Math.round(normalized));
  }

  tierFor(estimate: MeterEstimate): PricingTier | null {
    return this.pickTier(estimate.meter, estimate.qty);
  }

  creditsPerDoc(estimate: MeterEstimate): number | null {
    const tier = this.tierFor(estimate);
    return tier ? tier.unit_price ?? null : null;
  }

  subtotalCredits(estimate: MeterEstimate): number {
    const unit = this.creditsPerDoc(estimate);
    if (!unit) {
      return 0;
    }
    return Math.round((estimate.qty ?? 0) * unit);
  }

  get totalDocs(): number {
    return this.estimates.reduce((sum, item) => sum + (item.qty ?? 0), 0);
  }

  get totalCredits(): number {
    return this.estimates.reduce((sum, item) => sum + this.subtotalCredits(item), 0);
  }

  get avgCreditsPerDoc(): number {
    const docs = this.totalDocs;
    if (!docs) {
      return 0;
    }
    return Math.round((this.totalCredits / docs) * 100) / 100;
  }

  formatMoney(amount: number, currency: string): string {
    const normalized = String(currency || '').toUpperCase();
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: normalized }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${normalized}`.trim();
    }
  }

  formatNumber(amount: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount ?? 0);
  }

  formatTierLabel(tier: PricingTier | null): string {
    if (!tier) {
      return '—';
    }
    const min = tier.min_qty ?? 0;
    const max = tier.max_qty;
    if (max === null || max === undefined) {
      return `${min}+`;
    }
    return `${min} - ${max}`;
  }

  availableRegions(): string[] {
    const regions = new Set<string>();
    for (const meter of this.signatureMeters()) {
      for (const tier of meter.tiers ?? []) {
        if (tier.region) {
          regions.add(String(tier.region).toUpperCase());
        }
      }
    }
    return Array.from(regions).sort((a, b) => a.localeCompare(b));
  }

  availableCurrencies(): string[] {
    const currencies = new Set<string>();
    for (const meter of this.signatureMeters()) {
      for (const tier of meter.tiers ?? []) {
        if (tier.currency) {
          currencies.add(String(tier.currency).toUpperCase());
        }
      }
    }
    return Array.from(currencies).sort((a, b) => a.localeCompare(b));
  }

  signatureMeters(): PricingMeter[] {
    return this.meters
      .filter(meter => (meter.category ?? '').toLowerCase() === 'signature')
      .filter(meter => meter.active)
      .slice()
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  private hydrateEstimates(): void {
    const meters = this.signatureMeters();
    const previous = new Map(this.estimates.map(item => [item.meter.meter_code, item.qty]));
    this.estimates = meters.map(meter => ({
      meter,
      qty: previous.get(meter.meter_code) ?? 0
    }));
  }

  private hydrateDefaultsFromData(): void {
    const regions = this.availableRegions();
    const currencies = this.availableCurrencies();
    if (regions.length && !regions.includes(this.region.toUpperCase())) {
      this.region = regions[0];
    }
    if (currencies.length && !currencies.includes(this.currency.toUpperCase())) {
      this.currency = currencies[0];
    }
  }

  private pickTier(meter: PricingMeter, qty: number): PricingTier | null {
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

  private getApplicableTiers(meter: PricingMeter): PricingTier[] {
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
}

