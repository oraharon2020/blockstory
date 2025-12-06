import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// GET - Get all product costs or specific product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const sku = searchParams.get('sku');
    const productName = searchParams.get('productName');
    const businessId = searchParams.get('businessId');

    let query = supabase.from(TABLES.PRODUCT_COSTS).select('*');

    // Filter by business_id
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    } else if (sku) {
      query = query.eq('sku', sku);
    } else if (productName) {
      query = query.ilike('product_name', `%${productName}%`);
    }

    const { data, error } = await query.order('product_name', { ascending: true });

    if (error) {
      console.error('Error fetching product costs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in product-costs GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add or update product cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, sku, product_name, unit_cost, supplier_name, businessId } = body;

    if (!product_name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Check if product already exists (for this business)
    let query = supabase.from(TABLES.PRODUCT_COSTS).select('id');
    
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    
    if (product_id) {
      query = query.eq('product_id', product_id);
    } else if (sku) {
      query = query.eq('sku', sku);
    } else {
      query = query.eq('product_name', product_name);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from(TABLES.PRODUCT_COSTS)
        .update({
          product_name,
          sku: sku || null,
          unit_cost: unit_cost || 0,
          supplier_name: supplier_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product cost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, updated: true });
    } else {
      // Insert new
      const insertData: any = {
        product_id: product_id || null,
        sku: sku || null,
        product_name,
        unit_cost: unit_cost || 0,
        supplier_name: supplier_name || null,
        updated_at: new Date().toISOString(),
      };
      
      if (businessId) {
        insertData.business_id = businessId;
      }
      
      const { data, error } = await supabase
        .from(TABLES.PRODUCT_COSTS)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting product cost:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, created: true });
    }
  } catch (error: any) {
    console.error('Error in product-costs POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete product cost
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from(TABLES.PRODUCT_COSTS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product cost:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in product-costs DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
