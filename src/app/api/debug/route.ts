import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2025-11-30';
    
    // Get settings
    const { data: settingsData } = await supabase
      .from(TABLES.SETTINGS)
      .select('key, value');

    const settings: Record<string, string> = {};
    if (settingsData) {
      settingsData.forEach((item: { key: string; value: string }) => {
        settings[item.key] = item.value;
      });
    }

    if (!settings.wooUrl) {
      return NextResponse.json({ error: 'WooCommerce not configured' }, { status: 400 });
    }

    const api = new WooCommerceRestApi({
      url: settings.wooUrl,
      consumerKey: settings.consumerKey,
      consumerSecret: settings.consumerSecret,
      version: 'wc/v3',
    });

    // Try different approaches
    const results: any = { date, tests: [] };

    // Test 1: With dates_are_gmt=false
    try {
      const res1 = await api.get('orders', {
        after: `${date}T00:00:00`,
        before: `${date}T23:59:59`,
        per_page: 100,
        status: ['completed', 'processing', 'on-hold'],
        dates_are_gmt: false,
      });
      results.tests.push({
        name: 'dates_are_gmt=false',
        count: res1.data.length,
        orders: res1.data.map((o: any) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date_created: o.date_created,
          date_created_gmt: o.date_created_gmt,
        })),
      });
    } catch (e: any) {
      results.tests.push({ name: 'dates_are_gmt=false', error: e.message });
    }

    // Test 2: Without any timezone param
    try {
      const res2 = await api.get('orders', {
        after: `${date}T00:00:00`,
        before: `${date}T23:59:59`,
        per_page: 100,
        status: ['completed', 'processing', 'on-hold'],
      });
      results.tests.push({
        name: 'no timezone param',
        count: res2.data.length,
        orders: res2.data.map((o: any) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date_created: o.date_created,
        })),
      });
    } catch (e: any) {
      results.tests.push({ name: 'no timezone param', error: e.message });
    }

    // Test 3: Get all orders and filter
    try {
      const res3 = await api.get('orders', {
        per_page: 100,
        status: ['completed', 'processing', 'on-hold'],
      });
      const filtered = res3.data.filter((o: any) => o.date_created?.startsWith(date));
      results.tests.push({
        name: 'all orders filtered',
        totalFetched: res3.data.length,
        matchingDate: filtered.length,
        orders: filtered.map((o: any) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          date_created: o.date_created,
        })),
        allDates: res3.data.slice(0, 10).map((o: any) => ({
          id: o.id,
          date_created: o.date_created,
        })),
      });
    } catch (e: any) {
      results.tests.push({ name: 'all orders filtered', error: e.message });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
