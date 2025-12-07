import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

// GET - Get variation costs for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const productId = searchParams.get('productId');
    const variationKey = searchParams.get('variationKey');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('product_variation_costs')
      .select('*')
      .eq('business_id', businessId);

    if (productId) {
      query = query.eq('product_id', parseInt(productId));
    }

    if (variationKey) {
      query = query.eq('variation_key', variationKey);
    }

    const { data, error } = await query.order('variation_key', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error in product-variation-costs GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add or update variation cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both camelCase and snake_case field names
    const businessId = body.businessId || body.business_id;
    const productId = body.productId || body.product_id;
    const productName = body.productName || body.product_name;
    const variationId = body.variationId || body.variation_id;
    const variationKey = body.variationKey || body.variation_key;
    const variationAttributes = body.variationAttributes || body.variation_attributes;
    const supplierId = body.supplierId || body.supplier_id;
    const supplierName = body.supplierName || body.supplier_name;
    const unitCost = body.unitCost ?? body.unit_cost;
    const sku = body.sku;
    const isDefault = body.isDefault || body.is_default;
    const notes = body.notes;
    const updateId = body.id; // For updating existing record

    if (!businessId || !productId || !productName) {
      return NextResponse.json({ 
        error: 'businessId, productId and productName are required' 
      }, { status: 400 });
    }

    // Use empty string for base product (no variation)
    const varKey = variationKey || '';

    // Check if entry exists - either by ID or by unique key
    let existing = null;
    
    if (updateId) {
      // If ID is provided, use it directly
      const { data } = await supabase
        .from('product_variation_costs')
        .select('id')
        .eq('id', updateId)
        .maybeSingle();
      existing = data;
    } else {
      // Otherwise, search by business_id + product_id + variation_key + supplier
      let existingQuery = supabase
        .from('product_variation_costs')
        .select('id')
        .eq('business_id', businessId)
        .eq('product_id', productId)
        .eq('variation_key', varKey);

      if (supplierId) {
        existingQuery = existingQuery.eq('supplier_id', supplierId);
      } else {
        existingQuery = existingQuery.is('supplier_id', null);
      }

      const { data } = await existingQuery.maybeSingle();
      existing = data;
    }

    // If setting as default, unset other defaults for this product+variation
    if (isDefault) {
      await supabase
        .from('product_variation_costs')
        .update({ is_default: false })
        .eq('business_id', businessId)
        .eq('product_id', productId)
        .eq('variation_key', varKey);
    }

    const costData = {
      business_id: businessId,
      product_id: productId,
      product_name: productName,
      variation_id: variationId || null,
      variation_key: varKey,
      variation_attributes: variationAttributes || null,
      supplier_id: supplierId || null,
      supplier_name: supplierName || null,
      unit_cost: unitCost || 0,
      sku: sku || null,
      is_default: isDefault || false,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('product_variation_costs')
        .update(costData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = { data, updated: true };
    } else {
      // Insert
      const { data, error } = await supabase
        .from('product_variation_costs')
        .insert(costData)
        .select()
        .single();

      if (error) throw error;
      result = { data, created: true };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in product-variation-costs POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove variation cost
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('product_variation_costs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in product-variation-costs DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
