import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '365551544962-hi7tqlt88mgmdlpact7jgu6v27tmok5k.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://blockstory.onrender.com/api/google-ads/callback';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://blockstory.onrender.com';

// GET - Handle OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // businessId
  const error = searchParams.get('error');

  if (error) {
    // Redirect to settings with error
    return NextResponse.redirect(
      `${BASE_URL}/settings?tab=googleads&error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${BASE_URL}/settings?tab=googleads&error=missing_code`
    );
  }

  const businessId = state;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token response:', { ok: tokenResponse.ok, hasRefreshToken: !!tokens.refresh_token });

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      return NextResponse.redirect(
        `${BASE_URL}/settings?tab=googleads&error=${encodeURIComponent(tokens.error_description || 'token_exchange_failed')}`
      );
    }

    if (!tokens.refresh_token) {
      console.error('No refresh token received! tokens:', tokens);
      return NextResponse.redirect(
        `${BASE_URL}/settings?tab=googleads&error=no_refresh_token`
      );
    }

    // Save refresh token to database
    console.log('Saving refresh token for business:', businessId);
    const { data: updateData, error: dbError } = await supabase
      .from('business_settings')
      .update({
        google_ads_refresh_token: tokens.refresh_token,
      })
      .eq('business_id', businessId)
      .select();

    console.log('DB update result:', { data: updateData, error: dbError });

    if (dbError) {
      console.error('DB error:', dbError);
      return NextResponse.redirect(
        `${BASE_URL}/settings?tab=googleads&error=db_error`
      );
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      `${BASE_URL}/settings?tab=googleads&success=connected`
    );

  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${BASE_URL}/settings?tab=googleads&error=unknown`
    );
  }
}
