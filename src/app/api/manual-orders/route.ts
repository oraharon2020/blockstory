/**
 * Manual Orders API
 * API לניהול הזמנות ידניות (לא מ-WooCommerce)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - קבלת הזמנות ידניות לפי תאריך ועסק
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const date = searchParams.get('date');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }
    
    let query = supabase
      .from('manual_orders')
      .select(`
        *,
        items:manual_order_items(*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (date) {
      query = query.eq('order_date', date);
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
      console.error('Error fetching manual orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Manual orders GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - יצירת הזמנה ידנית חדשה
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_id,
      order_date,
      customer_name,
      customer_phone,
      customer_email,
      payment_method,
      status,
      shipping_total,
      total,
      notes,
      items
    } = body;
    
    if (!business_id || !order_date) {
      return NextResponse.json({ error: 'business_id and order_date are required' }, { status: 400 });
    }
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    
    // יצירת ההזמנה
    const { data: order, error: orderError } = await supabase
      .from('manual_orders')
      .insert({
        business_id,
        order_date,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        payment_method: payment_method || 'cash',
        status: status || 'completed',
        shipping_total: shipping_total || 0,
        total: total || 0,
        notes: notes || null
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating manual order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }
    
    // יצירת הפריטים
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_name: item.product_name,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total: item.total || (item.quantity * item.unit_price),
      unit_cost: item.unit_cost || 0,
      supplier_name: item.supplier_name || null
    }));
    
    const { error: itemsError } = await supabase
      .from('manual_order_items')
      .insert(orderItems);
    
    if (itemsError) {
      console.error('Error creating manual order items:', itemsError);
      // מחיקת ההזמנה אם הפריטים נכשלו
      await supabase.from('manual_orders').delete().eq('id', order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ order, message: 'Order created successfully' });
  } catch (error: any) {
    console.error('Manual orders POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - מחיקת הזמנה ידנית
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    
    // הפריטים יימחקו אוטומטית בגלל ON DELETE CASCADE
    const { error } = await supabase
      .from('manual_orders')
      .delete()
      .eq('id', orderId);
    
    if (error) {
      console.error('Error deleting manual order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Manual orders DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
