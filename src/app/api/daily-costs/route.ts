import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get total product costs for a specific date or date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const businessId = searchParams.get('businessId');

    if (!date && !startDate) {
      return NextResponse.json({ error: 'Date or date range is required' }, { status: 400 });
    }

    let query = supabase.from(TABLES.ORDER_ITEM_COSTS).select('*');

    // Filter by business_id
    if (businessId) {
      query = query.eq('business_id', businessId);
    } else {
      query = query.is('business_id', null);
    }

    if (date) {
      // Single date
      query = query.eq('order_date', date);
    } else if (startDate && endDate) {
      // Date range
      query = query.gte('order_date', startDate).lte('order_date', endDate);
    }

    const { data: costs, error } = await query;

    if (error) {
      console.error('Error fetching daily costs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (date) {
      // Single date - return total (item_cost * quantity)
      const totalCost = (costs || []).reduce((sum, item) => {
        const cost = parseFloat(item.item_cost) || 0;
        const qty = item.quantity || 1;
        return sum + (cost * qty);
      }, 0);
      return NextResponse.json({ 
        date,
        totalCost,
        itemsCount: costs?.length || 0,
      });
    } else {
      // Date range - return grouped by date (item_cost * quantity)
      const costsByDate: Record<string, number> = {};
      const shippingByDate: Record<string, number> = {};
      const quantityByDate: Record<string, number> = {};
      
      (costs || []).forEach(item => {
        if (item.order_date) {
          // Materials cost
          if (!costsByDate[item.order_date]) {
            costsByDate[item.order_date] = 0;
          }
          const cost = parseFloat(item.item_cost) || 0;
          const qty = item.quantity || 1;
          costsByDate[item.order_date] += cost * qty;
          
          // Quantity sold
          if (!quantityByDate[item.order_date]) {
            quantityByDate[item.order_date] = 0;
          }
          quantityByDate[item.order_date] += qty;
          
          // Shipping cost (stored without VAT, returned without VAT)
          if (!shippingByDate[item.order_date]) {
            shippingByDate[item.order_date] = 0;
          }
          shippingByDate[item.order_date] += parseFloat(item.shipping_cost) || 0;
        }
      });

      return NextResponse.json({ 
        costsByDate,
        shippingByDate,
        quantityByDate,
        totalCost: Object.values(costsByDate).reduce((sum, cost) => sum + cost, 0),
        totalShipping: Object.values(shippingByDate).reduce((sum, cost) => sum + cost, 0),
        totalQuantity: Object.values(quantityByDate).reduce((sum, qty) => sum + qty, 0),
      });
    }
  } catch (error: any) {
    console.error('Error in daily-costs GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
