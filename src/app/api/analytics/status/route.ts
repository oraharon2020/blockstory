/**
 * Google Analytics Status Check
 * 
 * בודק אם יש חיבור פעיל ל-GA4
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ connected: false, error: 'businessId is required' });
  }

  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'google_analytics')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    // Check if tokens exist
    const hasTokens = data.credentials?.access_token && data.credentials?.refresh_token;
    
    // Check if property is selected
    const hasProperty = data.settings?.property_id;
    
    return NextResponse.json({ 
      connected: hasTokens && hasProperty,
      hasTokens,
      hasProperty,
      propertyId: data.settings?.property_id,
      propertyName: data.settings?.property_name,
      connectedAt: data.updated_at 
    });

  } catch (error: any) {
    console.error('Error checking GA status:', error);
    return NextResponse.json({ connected: false, error: error.message });
  }
}
