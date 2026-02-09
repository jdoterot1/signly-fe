export interface UsageSummaryItem {
  amountTotal: number;
  currency: string;
  meterCode: string;
  qtyTotal: number;
  ratedAt: string;
  region: string;
  unitPrice: number;
}

export interface UsageSummaryMeta {
  api_version: string;
  request_id: string;
  tenant_id: string;
  timestamp: string;
}

export interface UsageSummaryResponse {
  code: string;
  data: UsageSummaryItem[];
  message: string;
  meta: UsageSummaryMeta;
  status: number;
  success: boolean;
}
