/**
 * Gmail Integration Types
 * מודול טיפוסים לאינטגרציית Gmail
 */

// Token types
export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

// Email attachment
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // Base64 encoded
}

// Email message
export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;
  attachments: EmailAttachment[];
}

// Scanned invoice data (extracted by Claude)
export interface ScannedInvoice {
  emailId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  fileData?: string; // Base64 encoded file data (for upload)
  fileUrl?: string;
  extractedData: {
    supplier_name: string;
    amount: number;
    vat_amount: number;
    invoice_number: string;
    invoice_date: string;
    description: string;
    has_vat: boolean;
    confidence: 'high' | 'medium' | 'low';
  };
  isDuplicate: boolean;
  duplicateOf?: number; // ID of existing expense
  status: 'pending' | 'approved' | 'rejected' | 'added';
  matchReason?: string;
}

// Duplicate check result
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: 'exact' | 'similar' | 'unlikely';
  matchedExpenseId?: number;
  matchReason?: string;
}

// Scan progress
export interface ScanProgress {
  status: 'idle' | 'connecting' | 'scanning' | 'processing' | 'done' | 'error';
  totalEmails: number;
  processedEmails: number;
  foundInvoices: number;
  currentStep: string;
  error?: string;
}

// Gmail connection status
export interface GmailConnectionStatus {
  isConnected: boolean;
  email?: string;
  lastSync?: Date;
  error?: string;
}
