export interface WalletInfo {
  balance: number;
  reserved: number;
  tenantId: string;
  updatedAt: string;
}

export interface LedgerEntry {
  balanceAfter: number;
  createdAt: string;
  createdBy: string | null;
  creditsDelta: number;
  entryId: string;
  entryType: string;
  idempotencyKey: string;
  meterCode: string | null;
  notes: string | null;
  occurredAt: string;
  source: string;
  sourceId: string;
  tenantId: string;
}

export interface WalletResponse {
  code: string;
  data: WalletInfo;
  message: string;
  status: number;
  success: boolean;
}

export interface LedgerResponse {
  code: string;
  data: LedgerEntry[];
  message: string;
  status: number;
  success: boolean;
}
