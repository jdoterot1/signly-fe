import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PricingService } from '../../core/services/pricing/pricing.service';
import { PricingMeter, PricingTier } from '../../core/models/pricing/pricing.model';
import { AlertService } from '../../shared/alert/alert.service';

@Component({
  selector: 'app-pricing-meters',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pricing-meters.component.html'
})
export class PricingMetersComponent implements OnInit {
  meters: PricingMeter[] = [];
  isLoading = false;

  region = 'CO';
  currency = 'COP';

  showOnlyActive = true;
  selectedCategory = 'all';
  selectedMeter: PricingMeter | null = null;

  constructor(
    private pricingService: PricingService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadMeters();
  }

  loadMeters(): void {
    this.isLoading = true;
    this.pricingService
      .listPricingMeters()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: meters => {
          this.meters = Array.isArray(meters) ? meters : [];
          this.hydrateDefaultsFromData();
          this.ensureSelectedMeter();
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudieron cargar los precios.';
          this.alertService.showError(message, 'Error al cargar precios');
        }
      });
  }

  get categories(): string[] {
    const categories = new Set(this.meters.map(meter => meter.category).filter(Boolean));
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }

  availableRegions(): string[] {
    const regions = new Set<string>();
    for (const meter of this.meters) {
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
    for (const meter of this.meters) {
      for (const tier of meter.tiers ?? []) {
        if (tier.currency) {
          currencies.add(String(tier.currency).toUpperCase());
        }
      }
    }
    return Array.from(currencies).sort((a, b) => a.localeCompare(b));
  }

  get filteredMeters(): PricingMeter[] {
    return this.meters
      .filter(meter => (this.showOnlyActive ? meter.active : true))
      .filter(meter => (this.selectedCategory === 'all' ? true : meter.category === this.selectedCategory))
      .slice()
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  selectMeter(meter: PricingMeter): void {
    this.selectedMeter = meter;
  }

  onRegionChanged(): void {
    this.ensureSelectedMeter();
  }

  onCurrencyChanged(): void {
    this.ensureSelectedMeter();
  }

  tiersFor(meter: PricingMeter): PricingTier[] {
    return this.getApplicableTiers(meter);
  }

  formatQtyRange(tier: PricingTier): string {
    const min = tier.min_qty ?? 0;
    const max = tier.max_qty;
    if (max === null || max === undefined) {
      return `${min}+`;
    }
    return `${min} - ${max}`;
  }

  headlinePrice(meter: PricingMeter): string {
    const tiers = this.tiersFor(meter);
    if (!tiers.length) {
      return '—';
    }
    const first = tiers[0];
    return this.formatMoney(first.unit_price, first.currency);
  }

  formatMoney(amount: number, currency: string): string {
    const normalized = String(currency || '').toUpperCase();
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: normalized }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${normalized}`.trim();
    }
  }

  private ensureSelectedMeter(): void {
    const list = this.filteredMeters;
    if (!list.length) {
      this.selectedMeter = null;
      return;
    }

    if (this.selectedMeter && list.some(m => m.meter_code === this.selectedMeter?.meter_code)) {
      return;
    }

    this.selectedMeter = list[0];
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
