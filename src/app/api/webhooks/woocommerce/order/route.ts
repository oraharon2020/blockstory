import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Webhook endpoint for WooCommerce order created
// Set up in WooCommerce -> Settings -> Advanced -> Webhooks
// Topic: Order created
// Delivery URL: https://your-crm.com/api/webhooks/woocommerce/order

export async function POST(request: NextRequest) {
  try {
    const order = await request.json();
    
    console.log('📦 Webhook received - Order:', order.id, order.number);

    // Check if order has coupon codes
    const couponCodes = order.coupon_lines?.map((c: any) => c.code.toUpperCase()) || [];
    
    if (couponCodes.length === 0) {
      console.log('No coupons, skipping');
      return NextResponse.json({ status: 'no_coupon' });
    }

    console.log('🎟️ Coupons found:', couponCodes);

    // Find designer with matching referral code
    const { data: designer, error: designerError } = await supabase
      .from('designers')
      .select('id, name, commission_rate')
      .in('referral_code', couponCodes)
      .eq('status', 'active')
      .single();

    if (!designer) {
      console.log('No matching designer found');
      return NextResponse.json({ status: 'no_designer' });
    }

    console.log('👤 Designer found:', designer.name);

    // Check if order already assigned
    const { data: existingOrder } = await supabase
      .from('designer_orders')
      .select('id')
      .eq('woo_order_id', order.id)
      .single();

    if (existingOrder) {
      console.log('Order already assigned');
      return NextResponse.json({ status: 'already_assigned' });
    }

    // Calculate commission
    const orderTotal = parseFloat(order.total);
    const commissionAmount = orderTotal * (designer.commission_rate / 100);
    const orderDate = new Date(order.date_created);
    const monthYear = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

    // Create designer order
    const { error: orderError } = await supabase
      .from('designer_orders')
      .insert({
        designer_id: designer.id,
        woo_order_id: order.id,
        order_number: order.number,
        order_date: order.date_created.split('T')[0],
        customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
        order_total: orderTotal,
        commission_amount: commissionAmount,
        status: 'pending',
        month_year: monthYear,
      });

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    // Update or create invoice
    const { data: existingInvoice } = await supabase
      .from('designer_invoices')
      .select('*')
      .eq('designer_id', designer.id)
      .eq('month_year', monthYear)
      .single();

    if (existingInvoice) {
      await supabase
        .from('designer_invoices')
        .update({
          total_orders: existingInvoice.total_orders + 1,
          total_sales: Number(existingInvoice.total_sales) + orderTotal,
          commission_total: Number(existingInvoice.commission_total) + commissionAmount,
        })
        .eq('id', existingInvoice.id);
    } else {
      await supabase
        .from('designer_invoices')
        .insert({
          designer_id: designer.id,
          month_year: monthYear,
          total_orders: 1,
          total_sales: orderTotal,
          commission_total: commissionAmount,
          status: 'open',
        });
    }

    console.log('✅ Order assigned successfully');

    return NextResponse.json({ 
      status: 'success',
      designer: designer.name,
      order: order.number,
      commission: commissionAmount,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Verify WooCommerce webhook signature (optional but recommended)
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-wc-webhook-signature');
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  
  if (!signature || !secret) return true; // Skip if not configured
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  
  return signature === expectedSignature;
}
