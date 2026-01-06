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
  searchInvoiceEmails,
  downloadAttachment,
  processInvoiceBatch,
  ScannedInvoice,
} from '@/lib/gmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes - Vercel Pro allows up to 300 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, year, month, startDate, endDate } = body;
    
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
      expiry_date: connection.expiry_date ? new Date(connection.expiry_date).getTime() : 0,
      token_type: 'Bearer',
      scope: '',
    };
    
    console.log('🔍 Gmail token check:', {
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none',
      isExpired: tokens.expiry_date ? Date.now() >= tokens.expiry_date - 5 * 60 * 1000 : true,
    });
    
    let validTokens: GmailTokens;
    try {
      validTokens = await ensureValidTokens(tokens);
      
      // Update tokens if refreshed
      if (validTokens.access_token !== tokens.access_token) {
        console.log('🔄 Gmail token refreshed, updating database...');
        const updateData: any = {
          access_token: validTokens.access_token,
          expiry_date: new Date(validTokens.expiry_date).toISOString(),
        };
        
        // Also update refresh_token if a new one was returned
        if (validTokens.refresh_token && validTokens.refresh_token !== tokens.refresh_token) {
          updateData.refresh_token = validTokens.refresh_token;
        }
        
        const { error: updateError } = await supabase
          .from('gmail_connections')
          .update(updateData)
          .eq('business_id', businessId);
          
        if (updateError) {
          console.error('❌ Failed to update Gmail tokens:', updateError);
        } else {
          console.log('✅ Gmail tokens updated successfully');
        }
      }
    } catch (tokenError: any) {
      console.error('❌ Gmail token refresh failed:', tokenError.message);
      return NextResponse.json({ 
        error: 'Token refresh failed: ' + tokenError.message,
        needsAuth: true 
      }, { status: 401 });
    }
    
    // Scan emails - either by date range or by month
    let emails;
    let scanStats;
    if (startDate && endDate) {
      // Use custom date range
      const scanResult = await searchInvoiceEmails(validTokens, {
        afterDate: new Date(startDate),
        beforeDate: new Date(endDate),
        maxResults: 100, // סריקה אגרסיבית עם timeout של 300 שניות
      });
      emails = scanResult.emails;
      scanStats = scanResult.stats;
    } else {
      // Use month/year
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth() + 1;
      const monthResult = await getMonthlyEmails(validTokens, targetYear, targetMonth);
      // getMonthlyEmails עדיין מחזיר את הפורמט הישן
      emails = Array.isArray(monthResult) ? monthResult : monthResult.emails;
      scanStats = Array.isArray(monthResult) ? null : monthResult.stats;
    }
    
    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        invoices: [],
        message: 'לא נמצאו מיילים עם קבצים מצורפים בחודש זה',
        scanStats,
      });
    }
    
    // Process invoices with Claude Vision
    const { results: invoices, hasMore, totalFound } = await processInvoiceBatch(
      emails,
      async (emailId, attachmentId) => {
        return downloadAttachment(validTokens, emailId, attachmentId);
      },
      businessId
    );
    
    // Filter out non-invoices (confidence === 'skip')
    const validInvoices = invoices.filter(inv => inv.extractedData.confidence !== 'skip');
    const skippedNonInvoices = invoices.length - validInvoices.length;
    
    // Separate new and duplicate invoices
    const newInvoices = validInvoices.filter(inv => !inv.isDuplicate);
    const duplicates = validInvoices.filter(inv => inv.isDuplicate);
    
    return NextResponse.json({
      success: true,
      invoices: validInvoices,
      summary: {
        totalEmails: emails.length,
        totalAttachments: invoices.length,
        totalFound, // כמה קבצים נמצאו בסה"כ
        hasMore, // האם יש עוד קבצים שלא נסרקו
        skippedNonInvoices,
        newInvoices: newInvoices.length,
        duplicates: duplicates.length,
      },
      scanStats, // סטטיסטיקות סריקה מפורטות
    });
  } catch (error: any) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
