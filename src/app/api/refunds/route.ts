import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get refunds by date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');
    const businessId = searchParams.get('businessId');

    let query = supabase.from('customer_refunds').select('*');

    // Filter by business_id
    if (businessId) {
      query = query.eq('business_id', businessId);
    } else {
      query = query.is('business_id', null);
    }

    if (date) {
      query = query.eq('refund_date', date);
    } else if (startDate && endDate) {
      query = query.gte('refund_date', startDate).lte('refund_date', endDate);
    }

    const { data, error } = await query.order('refund_date', { ascending: false });

    if (error) {
      console.error('Error fetching refunds:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate totals by date
    const refundsByDate: Record<string, number> = {};
    (data || []).forEach(refund => {
      if (!refundsByDate[refund.refund_date]) {
        refundsByDate[refund.refund_date] = 0;
      }
      refundsByDate[refund.refund_date] += parseFloat(refund.amount) || 0;
    });

    return NextResponse.json({
      refunds: data || [],
      refundsByDate,
    });
  } catch (error: any) {
    console.error('Error in refunds GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new refund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refund_date, description, amount, order_id, customer_name, reason, businessId } = body;

    if (!refund_date || !amount) {
      return NextResponse.json({ error: 'Date and amount are required' }, { status: 400 });
    }

    const insertData: Record<string, any> = {
      refund_date,
      description: description || '',
      amount: parseFloat(amount),
      order_id: order_id || null,
      customer_name: customer_name || null,
      reason: reason || null,
    };

    if (businessId) {
      insertData.business_id = businessId;
    }

    const { data, error } = await supabase
      .from('customer_refunds')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating refund:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in refunds POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a refund
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customer_refunds')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error deleting refund:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in refunds DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update a refund
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, refund_date, description, amount, customer_name, businessId } = body;

    if (!id || !refund_date || !amount) {
      return NextResponse.json({ error: 'ID, date and amount are required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      refund_date,
      description: description || '',
      amount: parseFloat(amount),
      customer_name: customer_name || null,
    };

    const { data, error } = await supabase
      .from('customer_refunds')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating refund:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, updated: true });
  } catch (error: any) {
    console.error('Error in refunds PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
