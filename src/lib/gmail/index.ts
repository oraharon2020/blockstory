/**
 * Gmail Module Index
 * Export all Gmail integration utilities
 */

// Types
export * from './types';

// Config
export * from './config';

// Auth
export {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  getGmailClient,
  getUserEmail,
  isTokenExpired,
  ensureValidTokens,
} from './auth';

// Scanner
export {
  searchInvoiceEmails,
  downloadAttachment,
  getMonthlyEmails,
} from './scanner';

// Processor
export {
  processInvoiceAttachment,
  checkForDuplicates,
  processInvoiceBatch,
} from './processor';
