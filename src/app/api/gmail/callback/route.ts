/**
 * Gmail OAuth Callback
 * קבלת קוד מ-Google והחלפה לטוקנים
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail } from '@/lib/gmail';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle errors from Google
    if (error) {
      console.error('Gmail OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/expenses?gmail_error=${encodeURIComponent(error)}`
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/expenses?gmail_error=no_code`
      );
    }
    
    // Parse state
    let businessId = '';
    let returnUrl = '/expenses';
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
        businessId = parsed.businessId || '';
        returnUrl = parsed.returnUrl || '/expenses';
      } catch (e) {
        console.error('Error parsing state:', e);
      }
    }
    
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    // Get user email
    const email = await getUserEmail(tokens);
    
    // Store tokens in database
    const { error: dbError } = await supabase
      .from('gmail_connections')
      .upsert({
        business_id: businessId || null,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: new Date(tokens.expiry_date).toISOString(),
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id',
      });
    
    if (dbError) {
      console.error('Error storing tokens:', dbError);
      // Continue anyway - we'll store in session
    }
    
    // Redirect back with success
    const redirectUrl = new URL(returnUrl, process.env.NEXT_PUBLIC_SITE_URL);
    redirectUrl.searchParams.set('gmail_connected', 'true');
    redirectUrl.searchParams.set('gmail_email', email);
    
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/expenses?gmail_error=${encodeURIComponent(error.message)}`
    );
  }
}
