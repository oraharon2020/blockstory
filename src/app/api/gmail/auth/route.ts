/**
 * Gmail OAuth - Initiate Connection
 * התחלת תהליך OAuth לחיבור Gmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/gmail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || '';
    const returnUrl = searchParams.get('returnUrl') || '/expenses';
    
    // Create state with business info
    const state = Buffer.from(JSON.stringify({ businessId, returnUrl })).toString('base64');
    
    // Generate auth URL
    const authUrl = getAuthUrl(state);
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Gmail auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
