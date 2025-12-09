import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '365551544962-hi7tqlt88mgmdlpact7jgu6v27tmok5k.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://blockstory.onrender.com/api/google-ads/callback';

// Google Ads API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
];

// GET - Start OAuth flow
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  // Build OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', businessId); // Pass businessId through state

  // Redirect directly to Google OAuth
  return NextResponse.redirect(authUrl.toString());
}
