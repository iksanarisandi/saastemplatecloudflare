export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';
export type PaymentMethod = 'qris' | 'bank_transfer' | 'gateway';

export interface Payment {
  id: string;
  tenantId: string;
  userId: string;
  planId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  proofFileId?: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  rejectionReason?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput {
  amount: number;
  currency: string;
  method: PaymentMethod;
  subscriptionPlanId: string;
}

export interface ConfirmPaymentInput {
  paymentId: string;
  adminId: string;
}

export interface RejectPaymentInput {
  paymentId: string;
  adminId: string;
  reason: string;
}
