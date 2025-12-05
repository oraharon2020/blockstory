import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// Convert snake_case from DB to camelCase for frontend
function toCamelCase(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(toCamelCase);
  }
  if (typeof data === 'object') {
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
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(toSnakeCase);
  }
  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) || null });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dbData = toSnakeCase(body);

    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .upsert({ id: 1, ...dbData, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
