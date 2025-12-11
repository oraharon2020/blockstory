/**
 * Gmail Scan API
 * סריקת מיילים וחילוץ חשבוניות
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  GmailTokens,
  ensureValidTokens,
  getMonthlyEmails,
  downloadAttachment,
  processInvoiceBatch,
  ScannedInvoice,
} from '@/lib/gmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for scanning

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, year, month } = body;
    
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }
    
    // Get tokens from database
    const { data: connection, error: connError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (connError || !connection) {
      return NextResponse.json({ 
        error: 'Gmail not connected',
        needsAuth: true 
      }, { status: 401 });
    }
    
    // Ensure tokens are valid
    const tokens: GmailTokens = {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expiry_date: new Date(connection.expiry_date).getTime(),
      token_type: 'Bearer',
      scope: '',
    };
    
    let validTokens: GmailTokens;
    try {
      validTokens = await ensureValidTokens(tokens);
      
      // Update tokens if refreshed
      if (validTokens.access_token !== tokens.access_token) {
        await supabase
          .from('gmail_connections')
          .update({
            access_token: validTokens.access_token,
            expiry_date: new Date(validTokens.expiry_date).toISOString(),
          })
          .eq('business_id', businessId);
      }
    } catch (tokenError) {
      return NextResponse.json({ 
        error: 'Token refresh failed',
        needsAuth: true 
      }, { status: 401 });
    }
    
    // Scan emails for the specified month
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    const emails = await getMonthlyEmails(validTokens, targetYear, targetMonth);
    
    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        invoices: [],
        message: 'לא נמצאו מיילים עם קבצים מצורפים בחודש זה',
      });
    }
    
    // Process invoices with Claude Vision
    const invoices = await processInvoiceBatch(
      emails,
      async (emailId, attachmentId) => {
        return downloadAttachment(validTokens, emailId, attachmentId);
      },
      businessId
    );
    
    // Separate new and duplicate invoices
    const newInvoices = invoices.filter(inv => !inv.isDuplicate);
    const duplicates = invoices.filter(inv => inv.isDuplicate);
    
    return NextResponse.json({
      success: true,
      invoices,
      summary: {
        totalEmails: emails.length,
        totalAttachments: invoices.length,
        newInvoices: newInvoices.length,
        duplicates: duplicates.length,
      },
    });
  } catch (error: any) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
