export interface PricingTier {
  currency: string;
  effective_from: string;
  effective_to: string | null;
  max_qty: number | null;
  min_qty: number;
  region: string;
  unit_price: number;
}

export interface PricingMeter {
  active: boolean;
  category: string;
  description: string;
  display_name: string;
  meter_code: string;
  tiers: PricingTier[];
  unit: string;
}

export interface PricingMetersListPayload {
  meters: PricingMeter[];
}

