/**
 * Gmail Add Invoices API
 * הוספת חשבוניות שנסרקו לטבלת ההוצאות + העלאה ל-Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { ScannedInvoice } from '@/lib/gmail';

// Helper to check for duplicate invoices
async function checkDuplicate(
  businessId: string,
  supplierName: string,
  invoiceNumber: string,
  amount: number,
  hasVat: boolean
): Promise<boolean> {
  const table = hasVat ? TABLES.EXPENSES_VAT : TABLES.EXPENSES_NO_VAT;
  
  // Check by invoice number + supplier (most accurate)
  if (invoiceNumber) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('business_id', businessId)
      .eq('invoice_number', invoiceNumber)
      .eq('supplier_name', supplierName)
      .limit(1);
    
    if (data && data.length > 0) {
      return true;
    }
  }
  
  // Also check by supplier + amount + recent date (within 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { data: recentData } = await supabase
    .from(table)
    .select('id')
    .eq('business_id', businessId)
    .eq('supplier_name', supplierName)
    .eq('amount', amount)
    .gte('expense_date', weekAgo.toISOString().split('T')[0])
    .limit(1);
  
  if (recentData && recentData.length > 0) {
    return true;
  }
  
  return false;
}

// Helper to upload file to Supabase Storage
async function uploadInvoiceFile(
  businessId: string,
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create unique filename
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${businessId}/invoices/${timestamp}-${safeFilename}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('expenses')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('expenses')
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, invoices } = body as { 
      businessId: string; 
      invoices: ScannedInvoice[] 
    };
    
    if (!businessId || !invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }
    
    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    for (const invoice of invoices) {
      // Skip if not approved
      if (invoice.status !== 'approved') {
        results.skipped++;
        continue;
      }
      
      const { extractedData, fileData, mimeType, filename } = invoice;
      
      try {
        // Check for duplicate invoice
        const isDuplicate = await checkDuplicate(
          businessId,
          extractedData.supplier_name,
          extractedData.invoice_number,
          extractedData.amount,
          extractedData.has_vat
        );
        
        if (isDuplicate) {
          console.log(`Skipping duplicate: ${extractedData.supplier_name} - ${extractedData.invoice_number}`);
          results.skipped++;
          results.errors.push(`${filename}: חשבונית כפולה - כבר קיימת במערכת`);
          continue;
        }
        
        // Upload file to Storage if we have the data
        let fileUrl: string | null = null;
        if (fileData && mimeType) {
          fileUrl = await uploadInvoiceFile(businessId, filename, mimeType, fileData);
          console.log(`Uploaded ${filename} -> ${fileUrl}`);
        }
        
        // Determine table based on VAT
        const table = extractedData.has_vat ? TABLES.EXPENSES_VAT : TABLES.EXPENSES_NO_VAT;
        
        const insertData: any = {
          business_id: businessId,
          expense_date: extractedData.invoice_date,
          description: extractedData.description,
          amount: extractedData.amount,
          supplier_name: extractedData.supplier_name,
          invoice_number: extractedData.invoice_number,
          payment_method: 'credit', // Default
          is_recurring: false,
          file_url: fileUrl,
        };
        
        // Add VAT amount for VAT expenses
        if (extractedData.has_vat) {
          insertData.vat_amount = extractedData.vat_amount;
        }
        
        const { error } = await supabase
          .from(table)
          .insert(insertData);
        
        if (error) {
          results.errors.push(`${filename}: ${error.message}`);
        } else {
          results.added++;
          console.log(`Added invoice: ${extractedData.supplier_name} - ${extractedData.amount}₪`);
        }
      } catch (err: any) {
        results.errors.push(`${filename}: ${err.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Add invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
