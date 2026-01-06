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
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
];

// Max attachment size (10MB)
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

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
  // תקשורת
  { domain: 'bezeq.co.il', name: 'בזק' },
  { domain: 'partner.co.il', name: 'פרטנר' },
  { domain: 'cellcom.co.il', name: 'סלקום' },
  { domain: 'hot.net.il', name: 'הוט' },
  { domain: 'yes.co.il', name: 'יס' },
  { domain: 'pelephone.co.il', name: 'פלאפון' },
  { domain: 'golan-telecom.co.il', name: 'גולן טלקום' },
  { domain: '012.net.il', name: '012' },
  { domain: 'netvision.net.il', name: 'נטוויז\'ן' },
  // חשמל ומים
  { domain: 'iec.co.il', name: 'חברת חשמל' },
  { domain: 'israel-electric.co.il', name: 'חברת חשמל' },
  { domain: 'mekorot.co.il', name: 'מקורות' },
  { domain: 'hagihon.co.il', name: 'הגיחון' },
  // ביטוח
  { domain: 'harel-group.co.il', name: 'הראל' },
  { domain: 'clal.co.il', name: 'כלל' },
  { domain: 'migdal.co.il', name: 'מגדל' },
  { domain: 'phoenix.co.il', name: 'הפניקס' },
  { domain: 'menora.co.il', name: 'מנורה' },
  { domain: 'ayalon-ins.co.il', name: 'איילון' },
  // בנקים
  { domain: 'bankhapoalim.co.il', name: 'בנק הפועלים' },
  { domain: 'leumi.co.il', name: 'לאומי' },
  { domain: 'discountbank.co.il', name: 'דיסקונט' },
  { domain: 'mizrahi-tefahot.co.il', name: 'מזרחי טפחות' },
  // ספקים נפוצים
  { domain: 'office-depot.co.il', name: 'אופיס דיפו' },
  { domain: 'ksp.co.il', name: 'KSP' },
  { domain: 'ivory.co.il', name: 'איווורי' },
  { domain: 'bug.co.il', name: 'באג' },
  { domain: 'zap.co.il', name: 'זאפ' },
  { domain: 'wolt.com', name: 'וולט' },
  { domain: 'bolt.eu', name: 'בולט' },
  { domain: 'gett.com', name: 'גט' },
  // SaaS וטכנולוגיה
  { domain: 'google.com', name: 'Google' },
  { domain: 'microsoft.com', name: 'Microsoft' },
  { domain: 'amazon.com', name: 'Amazon' },
  { domain: 'aws.amazon.com', name: 'AWS' },
  { domain: 'zoom.us', name: 'Zoom' },
  { domain: 'monday.com', name: 'Monday' },
  { domain: 'wix.com', name: 'Wix' },
  { domain: 'fiverr.com', name: 'Fiverr' },
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
