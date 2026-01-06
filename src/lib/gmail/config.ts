/**
 * Gmail Configuration
 * הגדרות קבועות לאינטגרציית Gmail
 */

// OAuth2 scopes needed for Gmail
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Supported invoice file types
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Max attachment size (5MB)
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

// Search filters for finding invoices
export const INVOICE_SEARCH_QUERIES = [
  'has:attachment filename:pdf חשבונית',
  'has:attachment filename:pdf invoice',
  'has:attachment filename:pdf קבלה',
  'has:attachment filename:pdf receipt',
  'from:noreply has:attachment',
  'subject:חשבונית has:attachment',
  'subject:invoice has:attachment',
];

// Known invoice senders (Israeli companies)
export const KNOWN_INVOICE_SENDERS = [
  { domain: 'bezeq.co.il', name: 'בזק' },
  { domain: 'partner.co.il', name: 'פרטנר' },
  { domain: 'cellcom.co.il', name: 'סלקום' },
  { domain: 'hot.net.il', name: 'הוט' },
  { domain: 'iec.co.il', name: 'חברת חשמל' },
  { domain: 'mekorot.co.il', name: 'מקורות' },
  { domain: 'bezek-online.co.il', name: 'בזק אונליין' },
  { domain: 'yes.co.il', name: 'יס' },
  { domain: 'pelephone.co.il', name: 'פלאפון' },
  { domain: 'golan-telecom.co.il', name: 'גולן טלקום' },
  { domain: 'israel-electric.co.il', name: 'חברת חשמל' },
];

// OAuth redirect URI
export const getRedirectUri = () => {
  // בסביבת production ב-Vercel, משתמשים בדומיין האמתי
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }
  
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }
  
  return `${baseUrl}/api/gmail/callback`;
};

// Client credentials
export const getGmailCredentials = () => ({
  clientId: process.env.GOOGLE_GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_GMAIL_CLIENT_SECRET || '',
});
