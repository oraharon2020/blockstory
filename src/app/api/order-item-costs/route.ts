import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// GET - Get cost for specific order item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const lineItemId = searchParams.get('lineItemId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let query = supabase.from(TABLES.ORDER_ITEM_COSTS).select('*').eq('order_id', orderId);

    if (lineItemId) {
      query = query.eq('line_item_id', lineItemId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching order item costs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in order-item-costs GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Save cost for order item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, line_item_id, product_id, product_name, item_cost, save_as_default } = body;

    if (!order_id || !line_item_id) {
      return NextResponse.json({ error: 'Order ID and Line Item ID are required' }, { status: 400 });
    }

    // Check if cost already exists for this order item
    const { data: existing } = await supabase
      .from(TABLES.ORDER_ITEM_COSTS)
      .select('id')
      .eq('order_id', order_id)
      .eq('line_item_id', line_item_id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .update({
          item_cost: item_cost || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating order item cost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // If save_as_default, also update product_costs table
      if (save_as_default && product_name) {
        await saveProductCost(product_id, product_name, item_cost);
      }

      return NextResponse.json({ data, updated: true });
    } else {
      // Insert new
      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .insert({
          order_id,
          line_item_id,
          product_id: product_id || null,
          product_name: product_name || '',
          item_cost: item_cost || 0,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting order item cost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // If save_as_default, also update product_costs table
      if (save_as_default && product_name) {
        await saveProductCost(product_id, product_name, item_cost);
      }

      return NextResponse.json({ data, created: true });
    }
  } catch (error: any) {
    console.error('Error in order-item-costs POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to save product cost as default
async function saveProductCost(product_id: number | null, product_name: string, unit_cost: number) {
  try {
    // Check if product already exists
    let query = supabase.from(TABLES.PRODUCT_COSTS).select('id');
    
    if (product_id) {
      query = query.eq('product_id', product_id);
    } else {
      query = query.eq('product_name', product_name);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase
        .from(TABLES.PRODUCT_COSTS)
        .update({
          unit_cost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from(TABLES.PRODUCT_COSTS)
        .insert({
          product_id: product_id || null,
          product_name,
          unit_cost,
          updated_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error saving product cost:', error);
  }
}
