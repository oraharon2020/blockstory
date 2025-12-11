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
      .select('email, connected_at, expiry_date')
      .eq('business_id', businessId)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ 
        isConnected: false 
      });
    }
    
    // Check if token is expired
    const isExpired = new Date(data.expiry_date) < new Date();
    
    return NextResponse.json({
      isConnected: !isExpired,
      email: data.email,
      lastSync: data.connected_at,
      needsRefresh: isExpired,
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
