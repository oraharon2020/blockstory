import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// Convert snake_case from DB to camelCase for frontend
function toCamelCase(data: any): any {
  if (Array.isArray(data)) {
    return data.map(toCamelCase);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

// Convert camelCase to snake_case for DB
function toSnakeCase(data: any): any {
  if (Array.isArray(data)) {
    return data.map(toSnakeCase);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const businessId = searchParams.get('businessId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing start or end date' },
        { status: 400 }
      );
    }

    // Fetch data from Supabase
    let query = supabase
      .from(TABLES.DAILY_DATA)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    // Filter by business_id if provided
    if (businessId) {
      query = query.eq('business_id', businessId);
    } else {
      // Legacy support - get data without business_id
      query = query.is('business_id', null);
    }
    
    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data || []) });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, ...rest } = body;
    const dbData = toSnakeCase(rest);

    if (!dbData.date) {
      return NextResponse.json(
        { error: 'Missing date' },
        { status: 400 }
      );
    }

    // Add business_id if provided
    if (businessId) {
      dbData.business_id = businessId;
    }

    // Upsert data to Supabase - use composite key if businessId provided
    const conflictTarget = businessId ? 'date,business_id' : 'date';
    const { data, error } = await supabase
      .from(TABLES.DAILY_DATA)
      .upsert(
        { ...dbData, updated_at: new Date().toISOString() },
        { onConflict: conflictTarget }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
