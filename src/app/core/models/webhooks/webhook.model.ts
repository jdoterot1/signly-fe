export interface WebhookSummary {
  webhookId: string;
  url: string;
  description?: string;
  status: string;
  events: string[];
  version?: string | number;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookDetail extends WebhookSummary {
  httpTimeoutMs?: number | string;
  retries?: {
    maxAttempts?: number | string;
    backoff?: string;
  };
  customHeaders?: Record<string, string>;
  secrets?: Array<{
    secretId: string;
    status: string;
    createdAt?: string;
    ciphertext?: Array<{
      secretId: string;
      status: string;
      ciphertext: string;
      createdAt?: string;
    }>;
  }>;
}

export interface CreateWebhookPayload {
  url: string;
  description?: string;
  events: string[];
  customHeaders?: Record<string, string>;
  retries?: {
    maxAttempts?: number;
    backoff?: string;
  };
  httpTimeoutMs?: number;
}

export interface UpdateWebhookPayload {
  url?: string;
  description?: string;
  events?: string[];
  customHeaders?: Record<string, string>;
  retries?: {
    maxAttempts?: number;
    backoff?: string;
  };
  httpTimeoutMs?: number;
  status?: string;
}

export interface UpdateWebhookStatusPayload {
  status: 'ENABLED' | 'DISABLED';
}
