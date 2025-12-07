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
      // Single date - return total
      const totalCost = (costs || []).reduce((sum, item) => sum + (parseFloat(item.item_cost) || 0), 0);
      return NextResponse.json({ 
        date,
        totalCost,
        itemsCount: costs?.length || 0,
      });
    } else {
      // Date range - return grouped by date
      const costsByDate: Record<string, number> = {};
      (costs || []).forEach(item => {
        if (item.order_date) {
          if (!costsByDate[item.order_date]) {
            costsByDate[item.order_date] = 0;
          }
          costsByDate[item.order_date] += parseFloat(item.item_cost) || 0;
        }
      });

      return NextResponse.json({ 
        costsByDate,
        totalCost: Object.values(costsByDate).reduce((sum, cost) => sum + cost, 0),
      });
    }
  } catch (error: any) {
    console.error('Error in daily-costs GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
