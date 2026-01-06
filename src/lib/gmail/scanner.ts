/**
 * Gmail Scanner - Professional Invoice Detection
 * סריקת מיילים וחילוץ קבצים מצורפים - גרסה מקצועית
 */

import type { gmail_v1 } from 'googleapis';
import { getGmailClient, ensureValidTokens } from './auth';
import { SUPPORTED_MIME_TYPES, MAX_ATTACHMENT_SIZE, KNOWN_INVOICE_SENDERS } from './config';
import { GmailTokens, EmailMessage, EmailAttachment } from './types';

// מונה סטטיסטיקות סריקה
export interface ScanStats {
  totalEmailsSearched: number;
  emailsWithAttachments: number;
  totalAttachments: number;
  filteredByType: number;
  filteredBySize: number;
  fromKnownSenders: number;
}

/**
 * Search for emails with potential invoices - MULTI-STRATEGY APPROACH
 * משלב 3 אסטרטגיות חיפוש שונות למקסימום כיסוי
 */
export async function searchInvoiceEmails(
  tokens: GmailTokens,
  options: {
    maxResults?: number;
    afterDate?: Date;
    beforeDate?: Date;
  } = {}
): Promise<{ emails: EmailMessage[]; stats: ScanStats }> {
  const validTokens = await ensureValidTokens(tokens);
  const gmail = getGmailClient(validTokens);
  
  const { maxResults = 100, afterDate, beforeDate } = options;
  
  const stats: ScanStats = {
    totalEmailsSearched: 0,
    emailsWithAttachments: 0,
    totalAttachments: 0,
    filteredByType: 0,
    filteredBySize: 0,
    fromKnownSenders: 0,
  };
  
  // בניית תנאי תאריכים
  let dateQuery = '';
  if (afterDate) {
    dateQuery += ` after:${formatDateForSearch(afterDate)}`;
  }
  if (beforeDate) {
    dateQuery += ` before:${formatDateForSearch(beforeDate)}`;
  }
  
  // === אסטרטגיה 1: כל מייל עם קובץ PDF/תמונה מצורף ===
  const query1 = `has:attachment (filename:pdf OR filename:jpg OR filename:jpeg OR filename:png)${dateQuery}`;
  
  // === אסטרטגיה 2: חיפוש לפי מילות מפתח בשם קובץ או נושא ===
  const query2 = `has:attachment (` +
    `filename:חשבונית OR filename:קבלה OR filename:invoice OR filename:receipt OR ` +
    `filename:bill OR filename:BILL OR filename:INV OR filename:inv OR filename:tax OR ` +
    `filename:payment OR filename:order OR filename:מס OR filename:עסקה OR ` +
    `subject:חשבונית OR subject:קבלה OR subject:invoice OR subject:receipt OR ` +
    `subject:bill OR subject:payment OR subject:order OR subject:confirmation OR ` +
    `subject:הזמנה OR subject:תשלום OR subject:אישור OR subject:פירוט` +
  `)${dateQuery}`;
  
  // === אסטרטגיה 3: מיילים מספקים ידועים ===
  const knownDomainsQuery = KNOWN_INVOICE_SENDERS.map(s => `from:${s.domain}`).join(' OR ');
  const query3 = `has:attachment (${knownDomainsQuery})${dateQuery}`;
  
  // === אסטרטגיה 4: מיילים אוטומטיים (noreply) ===
  const query4 = `has:attachment (from:noreply OR from:no-reply OR from:billing OR from:invoice OR from:receipt OR from:orders)${dateQuery}`;
  
  console.log('🔍 Running multi-strategy search...');
  
  // מריצים את כל החיפושים במקביל
  const [result1, result2, result3, result4] = await Promise.all([
    gmail.users.messages.list({ userId: 'me', q: query1, maxResults: Math.floor(maxResults / 2) }),
    gmail.users.messages.list({ userId: 'me', q: query2, maxResults: Math.floor(maxResults / 4) }),
    gmail.users.messages.list({ userId: 'me', q: query3, maxResults: Math.floor(maxResults / 4) }),
    gmail.users.messages.list({ userId: 'me', q: query4, maxResults: Math.floor(maxResults / 4) }),
  ]);
  
  // איחוד כל התוצאות ללא כפילויות
  const allMessageIds = new Set<string>();
  const allMessages: { id: string }[] = [];
  
  for (const result of [result1, result2, result3, result4]) {
    for (const msg of result.data.messages || []) {
      if (msg.id && !allMessageIds.has(msg.id)) {
        allMessageIds.add(msg.id);
        allMessages.push({ id: msg.id });
      }
    }
  }
  
  stats.totalEmailsSearched = allMessages.length;
  console.log(`📧 Found ${allMessages.length} unique emails across all strategies`);
  
  // שליפת המיילים במקביל (batches של 15)
  const emailMessages: EmailMessage[] = [];
  const batchSize = 15;
  
  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (msg) => {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });
          return parseEmailMessage(fullMessage.data, stats);
        } catch (err) {
          console.error('Error fetching message:', msg.id, err);
          return null;
        }
      })
    );
    
    for (const parsed of results) {
      if (parsed && parsed.attachments.length > 0) {
        emailMessages.push(parsed);
        stats.emailsWithAttachments++;
        stats.totalAttachments += parsed.attachments.length;
        
        // בדיקה אם מספק ידוע
        const fromDomain = parsed.from.match(/@([^>]+)/)?.[1] || '';
        if (KNOWN_INVOICE_SENDERS.some(s => fromDomain.includes(s.domain))) {
          stats.fromKnownSenders++;
        }
      }
    }
  }
  
  console.log(`✅ Parsed ${emailMessages.length} emails with ${stats.totalAttachments} valid attachments`);
  console.log(`📊 Stats:`, stats);
  
  return { emails: emailMessages, stats };
}

/**
 * Parse Gmail message to our format
 */
function parseEmailMessage(message: gmail_v1.Schema$Message, stats?: ScanStats): EmailMessage | null {
  if (!message.id || !message.threadId) return null;
  
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) => 
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
  
  const attachments = extractAttachments(message.payload, stats);
  
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
 * מחלץ קבצים מצורפים עם פילטרים חכמים
 */
function extractAttachments(payload?: gmail_v1.Schema$MessagePart, stats?: ScanStats): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  if (!payload) return attachments;
  
  // Check current part
  if (payload.filename && payload.body?.attachmentId) {
    const mimeType = payload.mimeType || '';
    const size = payload.body.size || 0;
    const filename = payload.filename.toLowerCase();
    
    // בדיקה אם סוג הקובץ נתמך
    const isValidType = SUPPORTED_MIME_TYPES.includes(mimeType) || 
                        mimeType.startsWith('application/') && filename.endsWith('.pdf');
    
    // בדיקה אם גודל הקובץ תקין
    const isValidSize = size <= MAX_ATTACHMENT_SIZE;
    
    if (isValidType && isValidSize) {
      attachments.push({
        id: payload.body.attachmentId,
        filename: payload.filename,
        mimeType,
        size,
      });
    } else {
      // עדכון סטטיסטיקות
      if (stats) {
        if (!isValidType) stats.filteredByType++;
        if (!isValidSize) stats.filteredBySize++;
      }
    }
  }
  
  // Recursively check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      attachments.push(...extractAttachments(part, stats));
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
): Promise<{ emails: EmailMessage[]; stats: ScanStats }> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  return searchInvoiceEmails(tokens, {
    afterDate: startDate,
    beforeDate: endDate,
    maxResults: 100, // סריקה רחבה מאוד
  });
}
