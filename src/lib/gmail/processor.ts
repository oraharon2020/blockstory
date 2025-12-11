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
    mimeType: attachment.mimeType,
    fileData: attachmentData, // Keep base64 for later upload
    extractedData,
    isDuplicate: duplicateCheck.isDuplicate,
    duplicateOf: duplicateCheck.matchedExpenseId,
    matchReason: duplicateCheck.matchReason,
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
  
  console.log(`Processing file: ${filename}, type: ${mimeType}, data length: ${base64Data.length}`);
  
  // Build the content array based on file type
  const content: any[] = [];
  
  // For PDFs, use document type with proper format
  if (mimeType === 'application/pdf') {
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64Data,
      },
    });
  } else {
    // For images (jpg, png, etc.)
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: base64Data,
      },
    });
  }
  
  // Add the prompt
  content.push({
    type: 'text',
    text: `אתה מומחה בקריאת חשבוניות וקבלות ישראליות.
נא לנתח את המסמך המצורף ולחלץ את הפרטים הבאים.

חפש בקפידה:
1. שם הספק/העסק - בדרך כלל מופיע בראש המסמך בגדול
2. סכום סופי לתשלום - חפש "סה"כ", "לתשלום", "Total", המספר הכי גדול בסוף
3. מע"מ - חפש "מע"מ", "VAT", לפעמים 17% מהסכום
4. מספר חשבונית/קבלה - חפש "חשבונית מס", "קבלה", "מס'", "#"
5. תאריך - חפש תאריך בפורמט DD/MM/YYYY או YYYY-MM-DD
6. תיאור - מה נרכש או שירות שניתן

החזר JSON בלבד בפורמט הזה (בלי טקסט נוסף לפני או אחרי):
{
  "supplier_name": "שם הספק",
  "amount": 123.45,
  "vat_amount": 17.90,
  "invoice_number": "12345",
  "invoice_date": "2024-12-01",
  "description": "תיאור קצר",
  "has_vat": true,
  "confidence": "high"
}

שים לב:
- amount = הסכום הסופי כולל מע"מ (מספר בלבד, בלי ₪)
- vat_amount = רק המע"מ (אם לא מצוין, חשב 17/117 מהסכום)
- confidence: "high" אם ברור, "medium" אם לא בטוח, "low" אם מנחש
- אם לא מצאת ערך, השתמש ב: supplier_name="לא ידוע", amount=0, invoice_number=""`,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });

    // Parse response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text response from Claude');
      return getDefaultExtractedData();
    }

    console.log('Claude response:', textContent.text.substring(0, 500));

    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Parse amount - handle string with commas or currency symbols
      let amount = 0;
      if (parsed.amount) {
        const amountStr = String(parsed.amount).replace(/[₪,\s]/g, '');
        amount = parseFloat(amountStr) || 0;
      }
      
      let vatAmount = 0;
      if (parsed.vat_amount) {
        const vatStr = String(parsed.vat_amount).replace(/[₪,\s]/g, '');
        vatAmount = parseFloat(vatStr) || 0;
      }
      
      // If no VAT specified but has_vat is true, calculate it
      if (vatAmount === 0 && parsed.has_vat && amount > 0) {
        vatAmount = Math.round((amount * 17 / 117) * 100) / 100;
      }
      
      const result = {
        supplier_name: parsed.supplier_name || 'לא ידוע',
        amount: amount,
        vat_amount: vatAmount,
        invoice_number: String(parsed.invoice_number || ''),
        invoice_date: parsed.invoice_date || new Date().toISOString().split('T')[0],
        description: parsed.description || filename,
        has_vat: parsed.has_vat ?? true,
        confidence: parsed.confidence || 'medium',
      };
      
      console.log('Extracted data:', result);
      return result;
    }
  } catch (e) {
    console.error('Error processing invoice with Claude:', e);
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
 * Limited to 10 attachments for performance
 */
export async function processInvoiceBatch(
  emails: EmailMessage[],
  getAttachmentData: (emailId: string, attachmentId: string) => Promise<string>,
  businessId: string,
  onProgress?: (current: number, total: number) => void
): Promise<ScannedInvoice[]> {
  const results: ScannedInvoice[] = [];
  let processed = 0;
  
  // Flatten all attachments with their email context
  const allAttachments: { email: EmailMessage; attachment: EmailAttachment }[] = [];
  for (const email of emails) {
    for (const attachment of email.attachments) {
      allAttachments.push({ email, attachment });
    }
  }
  
  // Process all attachments (no limit)
  const toProcess = allAttachments;
  const totalAttachments = toProcess.length;
  
  console.log(`Processing ${totalAttachments} attachments`);
  
  // Process 3 at a time in parallel for speed
  const batchSize = 3;
  
  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async ({ email, attachment }): Promise<ScannedInvoice> => {
        try {
          const attachmentData = await getAttachmentData(email.id, attachment.id);
          return await processInvoiceAttachment(email, attachment, attachmentData, businessId);
        } catch (error) {
          console.error(`Error processing ${attachment.filename}:`, error);
          // Add failed invoice with error status
          return {
            emailId: email.id,
            attachmentId: attachment.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            extractedData: getDefaultExtractedData(),
            isDuplicate: false,
            status: 'rejected',
          };
        }
      })
    );
    
    results.push(...batchResults);
    processed += batch.length;
    onProgress?.(processed, totalAttachments);
  }
  
  return results;
}
