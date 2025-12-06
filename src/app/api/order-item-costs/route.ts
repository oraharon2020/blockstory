import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// Helper function to update daily shipping cost
async function updateDailyShippingCost(orderDate: string, businessId: string) {
  try {
    // Check if manual shipping per item is enabled
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('manual_shipping_per_item')
      .eq('business_id', businessId)
      .single();
    
    if (!businessSettings?.manual_shipping_per_item) {
      return; // Don't update if manual shipping is not enabled
    }
    
    // Get all shipping costs for orders on this date
    const { data: itemCosts } = await supabase
      .from(TABLES.ORDER_ITEM_COSTS)
      .select('shipping_cost')
      .eq('order_date', orderDate)
      .eq('business_id', businessId);
    
    const totalShippingCost = itemCosts?.reduce((sum, item) => sum + (parseFloat(item.shipping_cost) || 0), 0) || 0;
    
    // Get existing daily data
    const { data: existingDaily } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('*')
      .eq('date', orderDate)
      .eq('business_id', businessId)
      .single();
    
    if (existingDaily) {
      // Recalculate total expenses and profit
      const totalExpenses = 
        (existingDaily.google_ads_cost || 0) +
        (existingDaily.facebook_ads_cost || 0) +
        (existingDaily.tiktok_ads_cost || 0) +
        totalShippingCost +
        (existingDaily.materials_cost || 0) +
        (existingDaily.credit_card_fees || 0) +
        (existingDaily.vat || 0);
      
      const revenue = existingDaily.revenue || 0;
      const profit = revenue - totalExpenses;
      // % רווח מההכנסות
      const roi = revenue > 0 ? (profit / revenue) * 100 : (profit < 0 ? -100 : 0);
      
      // Update daily data
      await supabase
        .from(TABLES.DAILY_DATA)
        .update({
          shipping_cost: totalShippingCost,
          total_expenses: totalExpenses,
          profit,
          roi,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDaily.id);
      
      console.log(`Updated daily shipping cost for ${orderDate}: ${totalShippingCost}`);
    }
  } catch (error) {
    console.error('Error updating daily shipping cost:', error);
  }
}

// GET - Get cost for specific order item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const lineItemId = searchParams.get('lineItemId');
    const businessId = searchParams.get('businessId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let query = supabase.from(TABLES.ORDER_ITEM_COSTS).select('*').eq('order_id', orderId);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

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
    const { 
      order_id, 
      line_item_id, 
      product_id, 
      product_name, 
      item_cost, 
      supplier_name,
      supplier_id,
      variation_key,
      variation_attributes,
      save_as_default, 
      order_date, 
      businessId, 
      shipping_cost 
    } = body;

    if (!order_id || !line_item_id) {
      return NextResponse.json({ error: 'Order ID and Line Item ID are required' }, { status: 400 });
    }

    // Check if cost already exists for this order item
    // Note: The unique constraint is on (order_id, line_item_id) only, not business_id
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
          supplier_name: supplier_name || null,
          supplier_id: supplier_id || null,
          variation_key: variation_key || null,
          variation_attributes: variation_attributes || null,
          order_date: order_date || null,
          business_id: businessId || null,
          shipping_cost: shipping_cost !== undefined ? shipping_cost : null,
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
        console.log('save_as_default is true, saving to product_costs...');
        await saveProductCost(product_id, product_name, item_cost, supplier_name, businessId);
      } else {
        console.log('save_as_default:', save_as_default, 'product_name:', product_name);
      }

      // Update daily shipping cost if shipping_cost was provided
      if (shipping_cost !== undefined && order_date && businessId) {
        await updateDailyShippingCost(order_date, businessId);
      }

      return NextResponse.json({ data, updated: true });
    } else {
      // Insert new
      const insertData: any = {
        order_id,
        line_item_id,
        product_id: product_id || null,
        product_name: product_name || '',
        item_cost: item_cost || 0,
        supplier_name: supplier_name || null,
        supplier_id: supplier_id || null,
        variation_key: variation_key || null,
        variation_attributes: variation_attributes || null,
        shipping_cost: shipping_cost !== undefined ? shipping_cost : null,
        order_date: order_date || null,
        updated_at: new Date().toISOString(),
      };
      
      if (businessId) {
        insertData.business_id = businessId;
      }
      
      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting order item cost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // If save_as_default, also update product_costs table
      if (save_as_default && product_name) {
        console.log('save_as_default is true (insert), saving to product_costs...');
        await saveProductCost(product_id, product_name, item_cost, supplier_name, businessId);
      } else {
        console.log('save_as_default (insert):', save_as_default, 'product_name:', product_name);
      }

      // Update daily shipping cost if shipping_cost was provided
      if (shipping_cost !== undefined && order_date && businessId) {
        await updateDailyShippingCost(order_date, businessId);
      }

      return NextResponse.json({ data, created: true });
    }
  } catch (error: any) {
    console.error('Error in order-item-costs POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to save product cost as default
async function saveProductCost(product_id: number | null, product_name: string, unit_cost: number, supplier_name?: string, businessId?: string) {
  console.log('saveProductCost called with:', { product_id, product_name, unit_cost, supplier_name, businessId });
  
  try {
    // Check if product already exists - first try by product_id, then by name
    let existing = null;
    
    if (product_id) {
      let query = supabase.from(TABLES.PRODUCT_COSTS).select('id').eq('product_id', product_id);
      if (businessId) {
        query = query.eq('business_id', businessId);
      }
      const { data } = await query.maybeSingle();
      existing = data;
    }
    
    // If not found by product_id, try by name
    if (!existing && product_name) {
      let query = supabase.from(TABLES.PRODUCT_COSTS).select('id').eq('product_name', product_name);
      if (businessId) {
        query = query.eq('business_id', businessId);
      }
      const { data } = await query.maybeSingle();
      existing = data;
    }

    console.log('Existing product cost:', existing);

    if (existing) {
      const { error } = await supabase
        .from(TABLES.PRODUCT_COSTS)
        .update({
          product_name,
          unit_cost,
          supplier_name: supplier_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error updating product cost:', error);
      } else {
        console.log('Product cost updated successfully');
      }
    } else {
      const insertData: any = {
        product_id: product_id || null,
        product_name,
        unit_cost,
        supplier_name: supplier_name || null,
        updated_at: new Date().toISOString(),
      };
      
      if (businessId) {
        insertData.business_id = businessId;
      }
      
      console.log('Inserting new product cost:', insertData);
      
      const { error } = await supabase
        .from(TABLES.PRODUCT_COSTS)
        .insert(insertData);
      
      if (error) {
        console.error('Error inserting product cost:', error);
      } else {
        console.log('Product cost inserted successfully');
      }
    }
  } catch (error) {
    console.error('Error saving product cost:', error);
  }
}
