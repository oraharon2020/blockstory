import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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
    // Get all settings as key-value pairs
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('key, value');

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert array of {key, value} to object
    const settings: Record<string, string> = {};
    if (data) {
      data.forEach((item: { key: string; value: string }) => {
        settings[item.key] = item.value;
      });
    }

    return NextResponse.json({ data: settings });
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
    
    // Save each setting as a separate row
    const entries = Object.entries(body);
    
    for (const [key, value] of entries) {
      const { error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert(
          { key, value: String(value), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      
      if (error) {
        console.error(`Error saving setting ${key}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
