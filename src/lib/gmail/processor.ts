/**
 * Invoice Processor
 * עיבוד חשבוניות עם Claude Vision וזיהוי כפילויות
 */

import Anthropic from '@anthropic-ai/sdk';
import { ScannedInvoice, DuplicateCheckResult, EmailAttachment, EmailMessage } from './types';
import { supabase, TABLES } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Process attachment with Claude Vision
 */
export async function processInvoiceAttachment(
  email: EmailMessage,
  attachment: EmailAttachment,
  attachmentData: string, // Base64
  businessId: string
): Promise<ScannedInvoice> {
  // Extract invoice data using Claude Vision
  const extractedData = await extractInvoiceData(
    attachmentData,
    attachment.mimeType,
    attachment.filename
  );
  
  // Check for duplicates
  const duplicateCheck = await checkForDuplicates(
    extractedData,
    businessId
  );
  
  return {
    emailId: email.id,
    attachmentId: attachment.id,
    filename: attachment.filename,
    extractedData,
    isDuplicate: duplicateCheck.isDuplicate,
    duplicateOf: duplicateCheck.matchedExpenseId,
    status: 'pending',
  };
}

/**
 * Extract invoice data using Claude Vision
 */
async function extractInvoiceData(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<ScannedInvoice['extractedData']> {
  const isPdf = mimeType === 'application/pdf';
  
  const content: any[] = [
    {
      type: isPdf ? 'document' : 'image',
      source: {
        type: 'base64',
        media_type: mimeType as any,
        data: base64Data,
      },
    } as any,
    {
      type: 'text',
      text: `אנא קרא את החשבונית/קבלה הזו וחלץ את המידע הבא בפורמט JSON בלבד:
{
  "supplier_name": "שם הספק/עסק",
  "amount": 0.00,
  "vat_amount": 0.00,
  "invoice_number": "מספר חשבונית",
  "invoice_date": "YYYY-MM-DD",
  "description": "תיאור קצר של השירות/מוצר",
  "has_vat": true/false,
  "confidence": "high/medium/low"
}

הערות:
- amount הוא הסכום הכולל כולל מע"מ
- vat_amount הוא סכום המע"מ בלבד (אם מצוין)
- אם אין מע"מ, שים has_vat: false ו-vat_amount: 0
- confidence: high אם כל הנתונים ברורים, medium אם חלק לא ברור, low אם הרבה לא ברור
- החזר JSON בלבד, בלי טקסט נוסף`,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    messages: [{ role: 'user', content }],
  });

  // Parse response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return getDefaultExtractedData();
  }

  try {
    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        supplier_name: parsed.supplier_name || 'לא ידוע',
        amount: parseFloat(parsed.amount) || 0,
        vat_amount: parseFloat(parsed.vat_amount) || 0,
        invoice_number: parsed.invoice_number || '',
        invoice_date: parsed.invoice_date || new Date().toISOString().split('T')[0],
        description: parsed.description || filename,
        has_vat: parsed.has_vat ?? true,
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (e) {
    console.error('Error parsing invoice data:', e);
  }

  return getDefaultExtractedData();
}

/**
 * Default extracted data when parsing fails
 */
function getDefaultExtractedData(): ScannedInvoice['extractedData'] {
  return {
    supplier_name: 'לא ידוע',
    amount: 0,
    vat_amount: 0,
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    description: 'חשבונית',
    has_vat: true,
    confidence: 'low',
  };
}

/**
 * Check for duplicate invoices
 */
export async function checkForDuplicates(
  invoiceData: ScannedInvoice['extractedData'],
  businessId: string
): Promise<DuplicateCheckResult> {
  const { supplier_name, amount, invoice_number, invoice_date } = invoiceData;
  
  // 1. Check exact invoice number match
  if (invoice_number) {
    const { data: exactMatch } = await supabase
      .from(TABLES.EXPENSES_VAT)
      .select('id')
      .eq('business_id', businessId)
      .eq('invoice_number', invoice_number)
      .single();
    
    if (exactMatch) {
      return {
        isDuplicate: true,
        confidence: 'exact',
        matchedExpenseId: exactMatch.id,
        matchReason: `מספר חשבונית זהה: ${invoice_number}`,
      };
    }
  }
  
  // 2. Check similar expense (same supplier + similar amount + close date)
  const dateObj = new Date(invoice_date);
  const startDate = new Date(dateObj);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(dateObj);
  endDate.setDate(endDate.getDate() + 7);
  
  const { data: similarExpenses } = await supabase
    .from(TABLES.EXPENSES_VAT)
    .select('id, amount, expense_date, supplier_name')
    .eq('business_id', businessId)
    .gte('expense_date', startDate.toISOString().split('T')[0])
    .lte('expense_date', endDate.toISOString().split('T')[0]);
  
  if (similarExpenses) {
    for (const expense of similarExpenses) {
      const amountDiff = Math.abs(expense.amount - amount) / amount;
      const supplierMatch = expense.supplier_name?.toLowerCase().includes(supplier_name.toLowerCase()) ||
                           supplier_name.toLowerCase().includes(expense.supplier_name?.toLowerCase() || '');
      
      // Similar if: same supplier AND amount within 5%
      if (supplierMatch && amountDiff < 0.05) {
        return {
          isDuplicate: true,
          confidence: 'similar',
          matchedExpenseId: expense.id,
          matchReason: `ספק דומה (${expense.supplier_name}) וסכום קרוב (${expense.amount}₪)`,
        };
      }
    }
  }
  
  return {
    isDuplicate: false,
    confidence: 'unlikely',
  };
}

/**
 * Process multiple invoices in batch
 */
export async function processInvoiceBatch(
  emails: EmailMessage[],
  getAttachmentData: (emailId: string, attachmentId: string) => Promise<string>,
  businessId: string,
  onProgress?: (current: number, total: number) => void
): Promise<ScannedInvoice[]> {
  const results: ScannedInvoice[] = [];
  let processed = 0;
  
  // Count total attachments
  const totalAttachments = emails.reduce((sum, email) => sum + email.attachments.length, 0);
  
  for (const email of emails) {
    for (const attachment of email.attachments) {
      try {
        const attachmentData = await getAttachmentData(email.id, attachment.id);
        const invoice = await processInvoiceAttachment(email, attachment, attachmentData, businessId);
        results.push(invoice);
      } catch (error) {
        console.error(`Error processing ${attachment.filename}:`, error);
        // Add failed invoice with error status
        results.push({
          emailId: email.id,
          attachmentId: attachment.id,
          filename: attachment.filename,
          extractedData: getDefaultExtractedData(),
          isDuplicate: false,
          status: 'rejected',
        });
      }
      
      processed++;
      onProgress?.(processed, totalAttachments);
    }
  }
  
  return results;
}
