import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2025-12-01';
    const businessId = searchParams.get('businessId');
    const mode = searchParams.get('mode') || 'compare'; // 'compare' or 'month'
    
    // Get business settings
    let settings: any = null;
    if (businessId) {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();
      settings = data;
    }

    if (!settings?.woo_url) {
      return NextResponse.json({ error: 'WooCommerce not configured for this business' }, { status: 400 });
    }

    const api = new WooCommerceRestApi({
      url: settings.woo_url,
      consumerKey: settings.consumer_key,
      consumerSecret: settings.consumer_secret,
      version: 'wc/v3',
    });

    const validStatuses = settings.valid_order_statuses || ['completed', 'processing', 'on-hold'];
    
    if (mode === 'month') {
      // Compare entire month
      const [year, month] = date.split('-').slice(0, 2);
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]; // Last day of month
      
      // Get from daily_data
      const { data: dailyData } = await supabase
        .from(TABLES.DAILY_DATA)
        .select('date, orders_count, revenue')
        .eq('business_id', businessId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      const dbTotalOrders = dailyData?.reduce((sum, d) => sum + (d.orders_count || 0), 0) || 0;
      const dbTotalRevenue = dailyData?.reduce((sum, d) => sum + (d.revenue || 0), 0) || 0;
      
      // Get from WooCommerce - using fixed date logic
      const dayBefore = new Date(startDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];
      
      const wooResponse = await api.get('orders', {
        after: `${dayBeforeStr}T23:59:59`,
        before: `${endDate}T23:59:59`,
        per_page: 100,
        status: validStatuses,
        dates_are_gmt: false,
      });
      
      const wooOrders = wooResponse.data || [];
      const wooTotalOrders = wooOrders.length;
      const wooTotalRevenue = wooOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
      
      return NextResponse.json({
        mode: 'month',
        period: { startDate, endDate },
        database: {
          totalOrders: dbTotalOrders,
          totalRevenue: dbTotalRevenue,
          dailyBreakdown: dailyData,
        },
        woocommerce: {
          totalOrders: wooTotalOrders,
          totalRevenue: wooTotalRevenue,
          orders: wooOrders.map((o: any) => ({
            id: o.id,
            total: o.total,
            status: o.status,
            date_created: o.date_created,
          })),
        },
        difference: {
          orders: dbTotalOrders - wooTotalOrders,
          revenue: dbTotalRevenue - wooTotalRevenue,
        },
      });
    }
    
    // Single day comparison
    // Calculate the day before for 'after' parameter (exclusive)
    const targetDate = new Date(date);
    const dayBefore = new Date(targetDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    const results: any = { 
      date, 
      businessId,
      validStatuses,
      tests: [] 
    };

    // Test with NEW fixed logic
    try {
      const res1 = await api.get('orders', {
        after: `${dayBeforeStr}T23:59:59`,
        before: `${date}T23:59:59`,
        per_page: 100,
        status: validStatuses,
        dates_are_gmt: false,
      });
      results.tests.push({
        name: 'NEW fixed logic',
        params: {
          after: `${dayBeforeStr}T23:59:59`,
          before: `${date}T23:59:59`,
        },
        count: res1.data.length,
        totalRevenue: res1.data.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0),
        orders: res1.data.map((o: any) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date_created: o.date_created,
        })),
      });
    } catch (e: any) {
      results.tests.push({ name: 'NEW fixed logic', error: e.message });
    }

    // Test with OLD logic (for comparison)
    try {
      const res2 = await api.get('orders', {
        after: `${date}T00:00:00`,
        before: `${date}T23:59:59`,
        per_page: 100,
        status: validStatuses,
        dates_are_gmt: false,
      });
      results.tests.push({
        name: 'OLD logic (buggy)',
        params: {
          after: `${date}T00:00:00`,
          before: `${date}T23:59:59`,
        },
        count: res2.data.length,
        totalRevenue: res2.data.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0),
        orders: res2.data.map((o: any) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date_created: o.date_created,
        })),
      });
    } catch (e: any) {
      results.tests.push({ name: 'OLD logic (buggy)', error: e.message });
    }

    // Get what's in the database for this date
    const { data: dbData } = await supabase
      .from(TABLES.DAILY_DATA)
      .select('*')
      .eq('business_id', businessId)
      .eq('date', date)
      .single();
    
    results.database = dbData ? {
      orders_count: dbData.orders_count,
      revenue: dbData.revenue,
    } : null;

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
