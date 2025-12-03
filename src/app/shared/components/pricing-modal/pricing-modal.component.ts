import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pricing-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-modal.component.html'
})
export class PricingModalComponent {
  @Output() closed = new EventEmitter<void>();

  billingType: 'annual' | 'monthly' = 'annual';
  selectedPlan: 'personal' | 'standard' = 'personal';

  setBillingType(type: 'annual' | 'monthly'): void {
    this.billingType = type;
  }

  selectPlan(plan: 'personal' | 'standard'): void {
    this.selectedPlan = plan;
  }

  closeModal(): void {
    this.closed.emit();
  }

  get isAnnual(): boolean {
    return this.billingType === 'annual';
  }

  // Precios y textos dinámicos para parecerse al modal de DocuSign
  get personalPrice(): string {
    return this.isAnnual ? 'CO$45,000' : 'CO$65,000';
  }

  get personalBillingNote(): string {
    return this.isAnnual
      ? 'CO$540,000 facturados anualmente'
      : 'Cambia a anual y ahorra 30% (CO$240,000 en total)';
  }

  get standardPrice(): string {
    return this.isAnnual ? 'CO$110,000' : 'CO$200,000';
  }

  get standardBillingNote(): string {
    return this.isAnnual
      ? 'CO$1,320,000 facturados anualmente'
      : 'Cambia a anual y ahorra 45% (CO$1,080,000 en total)';
  }

  get savingsText(): string {
    return this.isAnnual ? 'Ahorra hasta 45%' : 'Precio completo';
  }
}
