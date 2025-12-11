/**
 * Gmail Scanner
 * סריקת מיילים וחילוץ קבצים מצורפים
 */

import type { gmail_v1 } from 'googleapis';
import { getGmailClient, ensureValidTokens } from './auth';
import { SUPPORTED_MIME_TYPES, MAX_ATTACHMENT_SIZE, INVOICE_SEARCH_QUERIES } from './config';
import { GmailTokens, EmailMessage, EmailAttachment } from './types';

/**
 * Search for emails with potential invoices
 */
export async function searchInvoiceEmails(
  tokens: GmailTokens,
  options: {
    maxResults?: number;
    afterDate?: Date;
    beforeDate?: Date;
  } = {}
): Promise<EmailMessage[]> {
  const validTokens = await ensureValidTokens(tokens);
  const gmail = getGmailClient(validTokens);
  
  const { maxResults = 50, afterDate, beforeDate } = options;
  
  // Build search query
  let query = 'has:attachment';
  if (afterDate) {
    query += ` after:${formatDateForSearch(afterDate)}`;
  }
  if (beforeDate) {
    query += ` before:${formatDateForSearch(beforeDate)}`;
  }
  
  // Search for messages
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });
  
  const messages = response.data.messages || [];
  const emailMessages: EmailMessage[] = [];
  
  // Fetch full message details
  for (const msg of messages) {
    if (!msg.id) continue;
    
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });
    
    const parsed = parseEmailMessage(fullMessage.data);
    if (parsed && parsed.attachments.length > 0) {
      emailMessages.push(parsed);
    }
  }
  
  return emailMessages;
}

/**
 * Parse Gmail message to our format
 */
function parseEmailMessage(message: gmail_v1.Schema$Message): EmailMessage | null {
  if (!message.id || !message.threadId) return null;
  
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
  
  const attachments = extractAttachments(message.payload);
  
  return {
    id: message.id,
    threadId: message.threadId,
    from: getHeader('from'),
    to: getHeader('to'),
    subject: getHeader('subject'),
    date: new Date(parseInt(message.internalDate || '0')),
    snippet: message.snippet || '',
    attachments,
  };
}

/**
 * Extract attachments from message payload
 */
function extractAttachments(payload?: gmail_v1.Schema$MessagePart): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  if (!payload) return attachments;
  
  // Check current part
  if (payload.filename && payload.body?.attachmentId) {
    const mimeType = payload.mimeType || '';
    const size = payload.body.size || 0;
    
    // Filter by supported types and size
    if (SUPPORTED_MIME_TYPES.includes(mimeType) && size <= MAX_ATTACHMENT_SIZE) {
      attachments.push({
        id: payload.body.attachmentId,
        filename: payload.filename,
        mimeType,
        size,
      });
    }
  }
  
  // Recursively check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      attachments.push(...extractAttachments(part));
    }
  }
  
  return attachments;
}

/**
 * Download attachment data
 */
export async function downloadAttachment(
  tokens: GmailTokens,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const validTokens = await ensureValidTokens(tokens);
  const gmail = getGmailClient(validTokens);
  
  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  
  // Data is base64url encoded, convert to base64
  const data = response.data.data || '';
  return data.replace(/-/g, '+').replace(/_/g, '/');
}

/**
 * Format date for Gmail search
 */
function formatDateForSearch(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Get emails from specific date range (for monthly scan)
 */
export async function getMonthlyEmails(
  tokens: GmailTokens,
  year: number,
  month: number
): Promise<EmailMessage[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  return searchInvoiceEmails(tokens, {
    afterDate: startDate,
    beforeDate: endDate,
    maxResults: 100,
  });
}
