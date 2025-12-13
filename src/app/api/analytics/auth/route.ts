/**
 * Google Analytics OAuth Authentication
 * 
 * מתחבר ל-GA4 באמצעות OAuth2
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
];

const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/analytics/callback`
  : 'http://localhost:3000/api/analytics/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: businessId, // Pass businessId through state
  });

  return NextResponse.json({ authUrl });
}
