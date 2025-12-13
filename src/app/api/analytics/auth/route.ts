/**
 * Google Analytics OAuth Authentication
 * 
 * מתחבר ל-GA4 באמצעות OAuth2
 * משתמש באותם credentials של Gmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.manage.users.readonly', // For listing properties
];

// Use same format as Gmail - always use NEXT_PUBLIC_SITE_URL
const getRedirectUri = () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/analytics/callback`;
};

// Use Google Ads OAuth credentials (has the redirect URI configured)
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ 
      error: 'Google OAuth credentials not configured',
      details: 'Missing GOOGLE_GMAIL_CLIENT_ID or GOOGLE_GMAIL_CLIENT_SECRET' 
    }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    getRedirectUri()
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: businessId, // Pass businessId through state
  });

  return NextResponse.json({ authUrl });
}
