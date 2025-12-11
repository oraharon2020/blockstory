/**
 * Gmail Add Invoices API
 * הוספת חשבוניות שנסרקו לטבלת ההוצאות
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { ScannedInvoice } from '@/lib/gmail';

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
      
      const { extractedData, fileUrl, filename } = invoice;
      
      try {
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
          file_url: fileUrl || null,
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
