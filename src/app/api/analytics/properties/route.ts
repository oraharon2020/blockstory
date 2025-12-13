/**
 * Google Analytics Properties List
 * 
 * מחזיר רשימת GA4 Properties שהמשתמש יכול לגשת אליהם
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

// Use Google Ads OAuth credentials
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  try {
    // Get stored credentials
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('credentials')
      .eq('business_id', businessId)
      .eq('type', 'google_analytics')
      .single();

    if (dbError || !integration?.credentials) {
      return NextResponse.json({ error: 'Not connected to Google Analytics', needsAuth: true }, { status: 401 });
    }

    const { access_token, refresh_token } = integration.credentials;

    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });

    // Use Admin API to list accounts and properties
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

    // Get all accounts
    const accountsResponse = await analyticsAdmin.accounts.list();
    const accounts = accountsResponse.data.accounts || [];

    // Get properties for each account
    const properties: Array<{
      id: string;
      name: string;
      displayName: string;
      account: string;
      accountName: string;
    }> = [];

    for (const account of accounts) {
      if (!account.name) continue;
      
      const propertiesResponse = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });

      const accountProperties = propertiesResponse.data.properties || [];
      
      for (const prop of accountProperties) {
        if (prop.name && prop.displayName) {
          // Extract property ID from name (format: properties/123456)
          const propertyId = prop.name.replace('properties/', '');
          properties.push({
            id: propertyId,
            name: prop.name,
            displayName: prop.displayName,
            account: account.name,
            accountName: account.displayName || account.name,
          });
        }
      }
    }

    return NextResponse.json({ properties });

  } catch (error: any) {
    console.error('Error fetching GA properties:', error);
    
    // If token expired, indicate need for re-auth
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'Token expired', needsAuth: true }, { status: 401 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save selected property
export async function POST(request: NextRequest) {
  try {
    const { businessId, propertyId, propertyName } = await request.json();

    if (!businessId || !propertyId) {
      return NextResponse.json({ error: 'businessId and propertyId are required' }, { status: 400 });
    }

    // Update integration with selected property
    const { error: dbError } = await supabase
      .from('integrations')
      .update({
        settings: {
          property_id: propertyId,
          property_name: propertyName,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('type', 'google_analytics');

    if (dbError) {
      console.error('Failed to save property selection:', dbError);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error saving property:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
