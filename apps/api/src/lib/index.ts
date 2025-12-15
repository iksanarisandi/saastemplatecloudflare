export { 
  createLucia, 
  SESSION_CONFIG, 
  getSessionExpirationDate, 
  shouldRefreshSession,
  type DatabaseSessionAttributes,
  type DatabaseUserAttributes,
} from './auth';

export {
  serializeSession,
  deserializeSession,
  serializeUser,
  serializeTenant,
  serializeAuthContext,
  encodeSession,
  decodeSession,
  isValidSerializedSession,
  type SerializedSession,
  type SerializedUser,
  type SerializedTenant,
  type SerializedAuthContext,
} from './session';

export {
  hashPassword,
  verifyPassword,
} from './password';

export {
  generateRequestId,
  createMeta,
  success,
  successPaginated,
  error,
  errorFromAppError,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  rateLimited,
  internalError,
  badRequest,
  HTTP_STATUS,
  ERROR_STATUS_MAP,
  getStatusForErrorCode,
} from './response';

export {
  escapeHtml,
  unescapeHtml,
  stripXss,
  sanitizeInput,
  sanitizeObject,
  containsXss,
  sanitizeUrl,
  type SanitizeOptions,
} from './sanitize';

export {
  generateEncryptionKey,
  deriveKeyFromSecret,
  generateSalt,
  encrypt,
  decrypt,
  exportKey,
  importKey,
  EncryptionManager,
  serializeEncryptedData,
  deserializeEncryptedData,
  encryptFields,
  decryptFields,
  type EncryptedData,
  type EncryptedDataWithKeyId,
  type KeyDerivationConfig,
} from './encryption';
