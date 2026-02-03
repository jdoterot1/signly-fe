export interface BillingOrderSummary {
  additional_info: Record<string, unknown>;
  billingAddress: string | null;
  billingEmail: string | null;
  billingName: string | null;
  billingTaxId: string | null;
  createdAt: string;
  createdBy: string;
  currency: string;
  dueDate: string | null;
  notes: string | null;
  orderId: string;
  orderType: string;
  status: string;
  subtotalAmount: number;
  taxAmount: number;
  tenantId: string;
  totalAmount: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface BillingOrderItem {
  additional_info: Record<string, unknown>;
  createdAt: string;
  description: string | null;
  meterCode: string | null;
  orderId: string;
  orderItemId: string;
  quantity: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  unitPrice: number;
}

export interface BillingOrderDetail extends BillingOrderSummary {
  items?: BillingOrderItem[];
}

export interface BillingInvoiceSummary {
  additional_info: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  cufe: string | null;
  currency: string;
  customerAddress: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerTaxId: string | null;
  dueDate: string | null;
  externalInvoiceId: string | null;
  invoiceId: string;
  issueDate: string | null;
  number: string | null;
  orderId: string | null;
  pdfUrl: string | null;
  qrUrl: string | null;
  status: string;
  subtotalAmount: number;
  taxAmount: number;
  tenantId: string;
  totalAmount: number;
  updatedAt: string | null;
  updatedBy: string | null;
  xmlUrl: string | null;
}

export interface BillingInvoiceItem {
  additional_info: Record<string, unknown>;
  createdAt: string;
  description: string | null;
  invoiceId: string;
  invoiceItemId: string;
  orderItemId: string | null;
  quantity: number;
  subtotalAmount: number;
  taxAmount: number;
  taxRate: number | null;
  totalAmount: number;
  unitPrice: number;
}

export interface BillingInvoiceDetail extends BillingInvoiceSummary {
  items?: BillingInvoiceItem[];
}

// Payment Gateway
export interface PaymentGatewayRequest {
  orderId: string;
}

export interface PaymentGatewayResponse {
  amountInCents: number;
  checkoutUrl: string;
  currency: string;
  orderId: string;
  provider: string;
  redirectUrl: string;
  reference: string;
  signatureIntegrity: string;
  tenantId: string;
}

// Create Order
export interface CreateOrderItem {
  meter_code: string;
  quantity: number;
  description?: string;
}

export interface CreateOrderRequest {
  order_type: 'prepaid_topup';
  currency: string;
  items: CreateOrderItem[];
  billing_name?: string;
  billing_email?: string;
  billing_tax_id?: string;
  billing_address?: string;
  due_date?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  currency: string;
}

