import type { Payment, PaymentStatus, PaymentMethod } from '../types/payment';

/**
 * Serialized payment format for API responses
 * Requirement 5.7: JSON encoding for API responses
 */
export interface SerializedPayment {
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
  confirmedAt?: string;
  rejectionReason?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input format for deserializing payment from request
 * Requirement 5.8: JSON decoding from request
 */
export interface PaymentRequestBody {
  id?: string;
  tenantId?: string;
  userId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  proofFileId?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Serialize a Payment object to JSON-safe format for API response
 * Requirement 5.7: Encode payment records to JSON format
 * @param payment - Payment object to serialize
 * @returns Serialized payment with ISO date strings
 */
export function serializePayment(payment: Payment): SerializedPayment {
  return {
    id: payment.id,
    tenantId: payment.tenantId,
    userId: payment.userId,
    planId: payment.planId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    proofFileId: payment.proofFileId,
    confirmedBy: payment.confirmedBy,
    confirmedAt: payment.confirmedAt?.toISOString(),
    rejectionReason: payment.rejectionReason,
    metadata: payment.metadata,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}


/**
 * Serialize an array of Payment objects
 * @param payments - Array of Payment objects
 * @returns Array of serialized payments
 */
export function serializePayments(payments: Payment[]): SerializedPayment[] {
  return payments.map(serializePayment);
}

/**
 * Deserialize a payment from JSON request body
 * Requirement 5.8: Decode JSON and validate payment input
 * @param body - Request body with payment data
 * @returns Payment object with Date objects
 */
export function deserializePayment(body: PaymentRequestBody): Payment {
  const validStatuses: PaymentStatus[] = ['pending', 'confirmed', 'rejected', 'expired'];
  const validMethods: PaymentMethod[] = ['qris', 'bank_transfer', 'gateway'];

  const status = body.status as PaymentStatus;
  const method = body.method as PaymentMethod;

  if (body.status && !validStatuses.includes(status)) {
    throw new Error(`Invalid payment status: ${body.status}`);
  }

  if (body.method && !validMethods.includes(method)) {
    throw new Error(`Invalid payment method: ${body.method}`);
  }

  return {
    id: body.id ?? '',
    tenantId: body.tenantId ?? '',
    userId: body.userId ?? '',
    planId: body.planId,
    amount: body.amount ?? 0,
    currency: body.currency ?? 'IDR',
    status: status ?? 'pending',
    method: method ?? 'qris',
    proofFileId: body.proofFileId,
    confirmedBy: body.confirmedBy,
    confirmedAt: body.confirmedAt ? new Date(body.confirmedAt) : undefined,
    rejectionReason: body.rejectionReason,
    metadata: body.metadata ?? {},
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    updatedAt: body.updatedAt ? new Date(body.updatedAt) : new Date(),
  };
}

/**
 * Check if a serialized payment is valid
 * @param payment - Serialized payment to validate
 * @returns true if valid
 */
export function isValidSerializedPayment(payment: unknown): payment is SerializedPayment {
  if (!payment || typeof payment !== 'object') return false;
  
  const p = payment as Record<string, unknown>;
  
  return (
    typeof p.id === 'string' &&
    typeof p.tenantId === 'string' &&
    typeof p.userId === 'string' &&
    typeof p.amount === 'number' &&
    typeof p.currency === 'string' &&
    typeof p.status === 'string' &&
    typeof p.method === 'string' &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

/**
 * Convert serialized payment back to Payment object
 * Used for round-trip testing
 * @param serialized - Serialized payment
 * @returns Payment object
 */
export function fromSerializedPayment(serialized: SerializedPayment): Payment {
  return {
    id: serialized.id,
    tenantId: serialized.tenantId,
    userId: serialized.userId,
    planId: serialized.planId,
    amount: serialized.amount,
    currency: serialized.currency,
    status: serialized.status,
    method: serialized.method,
    proofFileId: serialized.proofFileId,
    confirmedBy: serialized.confirmedBy,
    confirmedAt: serialized.confirmedAt ? new Date(serialized.confirmedAt) : undefined,
    rejectionReason: serialized.rejectionReason,
    metadata: serialized.metadata,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}
