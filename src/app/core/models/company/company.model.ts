// src/app/core/models/company/company.model.ts

export interface CompanyGeneralInfo {
  about: string | null;
  city: string | null;
  country: string | null;
  display_name: string;
  industry: string | null;
  legal_name: string | null;
  locale: string | null;
  size: number | null;
  tax_id: string | null;
  timezone: string | null;
  website: string | null;
}

export type UpdateCompanyGeneralInfoPayload = CompanyGeneralInfo;

export interface CompanyBranding {
  email_sender_addr: string | null;
  email_sender_name: string | null;
  favicon_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export type UpdateCompanyBrandingPayload = CompanyBranding;

export interface CompanyBillingPreferences {
  billing_email: string | null;
  billing_model: string | null;
  currency: string | null;
  invoice_day: number | null;
  legal_address: string | null;
  net_terms_days: number | null;
  notes: string | null;
  payment_method_ref: string | null;
  payment_provider: string | null;
}

export type UpdateCompanyBillingPreferencesPayload = CompanyBillingPreferences;
