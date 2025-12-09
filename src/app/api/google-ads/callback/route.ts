import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '365551544962-hi7tqlt88mgmdlpact7jgu6v27tmok5k.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://blockstory.onrender.com/api/google-ads/callback';

// GET - Handle OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // businessId
  const error = searchParams.get('error');

  if (error) {
    // Redirect to settings with error
    return NextResponse.redirect(
      new URL(`/settings?tab=google-ads&error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?tab=google-ads&error=missing_code', request.url)
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

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      return NextResponse.redirect(
        new URL(`/settings?tab=google-ads&error=${encodeURIComponent(tokens.error_description || 'token_exchange_failed')}`, request.url)
      );
    }

    // Save refresh token to database
    const { error: dbError } = await supabase
      .from('business_settings')
      .update({
        google_ads_refresh_token: tokens.refresh_token,
        google_ads_connected: true,
        google_ads_connected_at: new Date().toISOString(),
      })
      .eq('business_id', businessId);

    if (dbError) {
      console.error('DB error:', dbError);
      return NextResponse.redirect(
        new URL('/settings?tab=google-ads&error=db_error', request.url)
      );
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL('/settings?tab=google-ads&success=connected', request.url)
    );

  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings?tab=google-ads&error=unknown', request.url)
    );
  }
}
