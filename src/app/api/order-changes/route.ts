import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get order changes/notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    let query = supabase
      .from('order_changes')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching order changes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('order_changes')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_read', false);

    return NextResponse.json({ 
      changes: data || [],
      unreadCount: unreadCount || 0
    });
  } catch (error: any) {
    console.error('Error in order-changes GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, changeIds, markAllRead } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    if (markAllRead) {
      // Mark all as read
      const { error } = await supabase
        .from('order_changes')
        .update({ is_read: true })
        .eq('business_id', businessId)
        .eq('is_read', false);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (changeIds && changeIds.length > 0) {
      // Mark specific ones as read
      const { error } = await supabase
        .from('order_changes')
        .update({ is_read: true })
        .in('id', changeIds);

      if (error) throw error;

      return NextResponse.json({ success: true, message: `${changeIds.length} marked as read` });
    }

    return NextResponse.json({ error: 'No changes to mark' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in order-changes POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
