/**
 * Gmail Status API
 * בדיקת סטטוס חיבור Gmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ 
        isConnected: false,
        error: 'Missing businessId' 
      });
    }
    
    // Get connection from database
    const { data, error } = await supabase
      .from('gmail_connections')
      .select('email, connected_at, expiry_date, refresh_token')
      .eq('business_id', businessId)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ 
        isConnected: false 
      });
    }
    
    // Check if access token is expired
    const isExpired = data.expiry_date ? new Date(data.expiry_date) < new Date() : true;
    
    // If we have a refresh token, we can still connect (even if access token expired)
    const hasRefreshToken = !!data.refresh_token;
    const isConnected = hasRefreshToken; // As long as we have refresh token, we're connected
    
    return NextResponse.json({
      isConnected,
      email: data.email,
      lastSync: data.connected_at,
      needsRefresh: isExpired,
      hasRefreshToken,
    });
  } catch (error: any) {
    console.error('Gmail status error:', error);
    return NextResponse.json({ 
      isConnected: false,
      error: error.message 
    }, { status: 500 });
  }
}

// Disconnect Gmail
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('business_id', businessId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
