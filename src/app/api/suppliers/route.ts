import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

const TABLES = {
  SUPPLIERS: 'suppliers',
  PRODUCT_SUPPLIERS: 'product_suppliers',
};

// GET - Get all suppliers for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const productId = searchParams.get('productId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // If productId is provided, get suppliers for that product with their costs
    if (productId) {
      const { data, error } = await supabase
        .from(TABLES.PRODUCT_SUPPLIERS)
        .select(`
          id,
          product_id,
          cost,
          sku,
          is_default,
          supplier_id,
          suppliers (
            id,
            name,
            contact_name,
            phone,
            email
          )
        `)
        .eq('business_id', businessId)
        .eq('product_id', productId)
        .eq('is_active', true);

      if (error) throw error;

      // Flatten the response
      const productSuppliers = (data || []).map(ps => ({
        id: ps.id,
        product_id: ps.product_id,
        supplier_id: ps.supplier_id,
        cost: ps.cost,
        sku: ps.sku,
        is_default: ps.is_default,
        supplier: ps.suppliers,
      }));

      return NextResponse.json({ productSuppliers });
    }

    // Get all suppliers for the business
    const { data, error } = await supabase
      .from(TABLES.SUPPLIERS)
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ suppliers: data || [] });
  } catch (error: any) {
    console.error('Error in suppliers GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new supplier or link supplier to product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Action: add_supplier - Add a new supplier
    if (action === 'add_supplier') {
      const { name, contact_name, phone, email, address, notes } = body;

      if (!name) {
        return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from(TABLES.SUPPLIERS)
        .insert({
          business_id: businessId,
          name,
          contact_name: contact_name || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ supplier: data });
    }

    // Action: link_product - Link a supplier to a product with cost
    if (action === 'link_product') {
      const { supplier_id, product_id, cost, sku, is_default } = body;

      if (!supplier_id || !product_id || cost === undefined) {
        return NextResponse.json({ error: 'supplier_id, product_id and cost are required' }, { status: 400 });
      }

      // If setting as default, unset other defaults first
      if (is_default) {
        await supabase
          .from(TABLES.PRODUCT_SUPPLIERS)
          .update({ is_default: false })
          .eq('business_id', businessId)
          .eq('product_id', product_id);
      }

      // Check if link already exists
      const { data: existing } = await supabase
        .from(TABLES.PRODUCT_SUPPLIERS)
        .select('id')
        .eq('business_id', businessId)
        .eq('product_id', product_id)
        .eq('supplier_id', supplier_id)
        .single();

      if (existing) {
        // Update existing link
        const { data, error } = await supabase
          .from(TABLES.PRODUCT_SUPPLIERS)
          .update({
            cost: parseFloat(cost),
            sku: sku || null,
            is_default: is_default || false,
            is_active: true,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ productSupplier: data, updated: true });
      } else {
        // Create new link
        const { data, error } = await supabase
          .from(TABLES.PRODUCT_SUPPLIERS)
          .insert({
            business_id: businessId,
            supplier_id,
            product_id,
            cost: parseFloat(cost),
            sku: sku || null,
            is_default: is_default || false,
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ productSupplier: data, created: true });
      }
    }

    // Action: update_supplier - Update supplier details
    if (action === 'update_supplier') {
      const { id, name, contact_name, phone, email, address, notes } = body;

      if (!id || !name) {
        return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from(TABLES.SUPPLIERS)
        .update({
          name,
          contact_name: contact_name || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: notes || null,
        })
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ supplier: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in suppliers POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete supplier or unlink from product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const supplierId = searchParams.get('supplierId');
    const productSupplierId = searchParams.get('productSupplierId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Delete product-supplier link
    if (productSupplierId) {
      const { error } = await supabase
        .from(TABLES.PRODUCT_SUPPLIERS)
        .delete()
        .eq('id', productSupplierId)
        .eq('business_id', businessId);

      if (error) throw error;
      return NextResponse.json({ success: true, deleted: 'product_supplier_link' });
    }

    // Soft delete supplier (set is_active = false)
    if (supplierId) {
      const { error } = await supabase
        .from(TABLES.SUPPLIERS)
        .update({ is_active: false })
        .eq('id', supplierId)
        .eq('business_id', businessId);

      if (error) throw error;
      return NextResponse.json({ success: true, deleted: 'supplier' });
    }

    return NextResponse.json({ error: 'supplierId or productSupplierId is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in suppliers DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
