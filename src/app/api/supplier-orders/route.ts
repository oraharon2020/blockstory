import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export const dynamic = 'force-dynamic';

// GET - Get orders filtered by status (and optionally supplier)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const supplierName = searchParams.get('supplierName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const orderIds = searchParams.get('orderIds');
    const statuses = searchParams.get('statuses');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Get business WooCommerce credentials
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('woo_url, consumer_key, consumer_secret')
      .eq('business_id', businessId)
      .single();

    if (settingsError || !settings?.woo_url) {
      return NextResponse.json({ error: 'Business WooCommerce settings not found' }, { status: 400 });
    }

    // Initialize WooCommerce client
    const wooClient = new WooCommerceRestApi({
      url: settings.woo_url,
      consumerKey: settings.consumer_key,
      consumerSecret: settings.consumer_secret,
      version: 'wc/v3',
    });

    // Fetch orders from WooCommerce
    const statusArray = statuses ? statuses.split(',') : ['processing'];
    
    const allOrders: any[] = [];
    
    // Fetch orders for each status
    for (const status of statusArray) {
      try {
        const response = await wooClient.get('orders', {
          status: status,
          per_page: 100,
          orderby: 'date',
          order: 'desc',
        });
        allOrders.push(...response.data);
      } catch (e) {
        console.error(`Error fetching orders with status ${status}:`, e);
      }
    }

    // Get saved costs from database
    const orderIdList = allOrders.map(o => o.id);
    const { data: savedCosts } = await supabase
      .from(TABLES.ORDER_ITEM_COSTS)
      .select('*')
      .eq('business_id', businessId)
      .in('order_id', orderIdList);

    // Create a map of saved costs by order_id + line_item_id
    const costsMap = new Map<string, any>();
    savedCosts?.forEach(cost => {
      costsMap.set(`${cost.order_id}_${cost.line_item_id}`, cost);
    });

    // Transform orders to supplier order items format
    const supplierOrders: any[] = [];
    
    for (const order of allOrders) {
      for (const item of order.line_items) {
        const savedCost = costsMap.get(`${order.id}_${item.id}`);
        
        // Filter by supplier if specified
        if (supplierName && savedCost?.supplier_name !== supplierName) {
          continue;
        }
        
        supplierOrders.push({
          id: savedCost?.id || null,
          order_id: order.id,
          item_id: item.id,
          line_item_id: item.id,
          product_id: item.product_id,
          product_name: item.name,
          variation_key: savedCost?.variation_key || null,
          variation_attributes: item.meta_data?.filter((m: any) => m.key.startsWith('pa_') || m.display_key)
            .reduce((acc: any, m: any) => ({ ...acc, [m.display_key || m.key]: m.display_value || m.value }), {}),
          unit_cost: savedCost?.item_cost || 0,
          adjusted_cost: savedCost?.adjusted_cost || null,
          quantity: item.quantity,
          shipping_cost: savedCost?.shipping_cost || 0,
          supplier_name: savedCost?.supplier_name || '',
          supplier_id: savedCost?.supplier_id || null,
          order_date: order.date_created?.split('T')[0] || '',
          is_ready: savedCost?.is_ready || false,
          notes: savedCost?.notes || null,
          business_id: businessId,
          updated_at: savedCost?.updated_at || null,
          // Order info
          order_number: order.number || order.id.toString(),
          order_status: order.status,
          customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
          customer_first_name: order.billing?.first_name || '',
          customer_last_name: order.billing?.last_name || '',
          total: order.total,
        });
      }
    }

    return NextResponse.json({ data: supplierOrders });
  } catch (error: any) {
    console.error('Error in supplier-orders GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update a specific order item (unit_cost, adjusted_cost, is_ready, notes, supplier_name)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      businessId, 
      orderId, 
      itemId,
      unit_cost,        // העלות הבסיסית - מסנכרנת לפופאפ בלוח התזרים
      adjusted_cost,    // עלות מותאמת (אופציונלי)
      is_ready,
      notes,
      product_name,
      product_id,
      supplier_name,
      quantity,
      order_date
    } = body;

    if (!businessId || !orderId || !itemId) {
      return NextResponse.json({ 
        error: 'businessId, orderId, and itemId are required' 
      }, { status: 400 });
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from(TABLES.ORDER_ITEM_COSTS)
      .select('id')
      .eq('business_id', businessId)
      .eq('order_id', orderId)
      .eq('line_item_id', itemId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Update item_cost (syncs with OrdersModal popup)
      if (unit_cost !== undefined) {
        updateData.item_cost = unit_cost;
      }
      if (adjusted_cost !== undefined) {
        updateData.adjusted_cost = adjusted_cost;
      }
      if (is_ready !== undefined) {
        updateData.is_ready = is_ready;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      if (supplier_name !== undefined) {
        updateData.supplier_name = supplier_name;
      }

      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data, success: true, updated: true });
    } else {
      // Insert new record
      const insertData: Record<string, any> = {
        business_id: businessId,
        order_id: orderId,
        line_item_id: itemId,
        product_id: product_id || null,
        product_name: product_name || '',
        item_cost: unit_cost || 0,
        quantity: quantity || 1,
        supplier_name: supplier_name || null,
        order_date: order_date || null,
        adjusted_cost: adjusted_cost || null,
        is_ready: is_ready || false,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data, success: true, created: true });
    }
  } catch (error: any) {
    console.error('Error in supplier-orders PATCH:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Bulk update ready status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, items, is_ready } = body;

    if (!businessId || !items || !Array.isArray(items)) {
      return NextResponse.json({ 
        error: 'businessId and items array are required' 
      }, { status: 400 });
    }

    const results = [];
    for (const item of items) {
      const { orderId, itemId } = item;
      
      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEM_COSTS)
        .update({ 
          is_ready, 
          updated_at: new Date().toISOString() 
        })
        .eq('business_id', businessId)
        .eq('order_id', orderId)
        .eq('line_item_id', itemId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating item ${orderId}-${itemId}:`, error);
      } else {
        results.push(data);
      }
    }

    return NextResponse.json({ 
      data: results, 
      success: true,
      updated: results.length 
    });
  } catch (error: any) {
    console.error('Error in supplier-orders POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
