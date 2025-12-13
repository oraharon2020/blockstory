/**
 * Google Analytics OAuth Callback
 * 
 * מקבל את הקוד מגוגל ושומר את ה-credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/analytics/callback`
  : 'http://localhost:3000/api/analytics/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const businessId = searchParams.get('state'); // businessId from state
  const error = searchParams.get('error');

  // Redirect URL
  const redirectBase = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${redirectBase}/settings?ga_error=${error}`);
  }

  if (!code || !businessId) {
    return NextResponse.redirect(`${redirectBase}/settings?ga_error=missing_params`);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(`${redirectBase}/settings?ga_error=no_access_token`);
    }

    // Save or update integration in database
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        business_id: businessId,
        type: 'google_analytics',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id,type',
      });

    if (dbError) {
      console.error('Failed to save GA credentials:', dbError);
      return NextResponse.redirect(`${redirectBase}/settings?ga_error=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}/settings?ga_success=true`);

  } catch (error: any) {
    console.error('GA OAuth error:', error);
    return NextResponse.redirect(`${redirectBase}/settings?ga_error=${encodeURIComponent(error.message)}`);
  }
}
