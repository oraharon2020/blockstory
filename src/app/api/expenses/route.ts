import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get expenses by date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');
    const businessId = searchParams.get('businessId');

    // Query for VAT expenses
    let vatQuery = supabase.from(TABLES.EXPENSES_VAT).select('*');
    let noVatQuery = supabase.from(TABLES.EXPENSES_NO_VAT).select('*');

    // Filter by business_id
    if (businessId) {
      vatQuery = vatQuery.eq('business_id', businessId);
      noVatQuery = noVatQuery.eq('business_id', businessId);
    } else {
      vatQuery = vatQuery.is('business_id', null);
      noVatQuery = noVatQuery.is('business_id', null);
    }

    if (date) {
      vatQuery = vatQuery.eq('expense_date', date);
      noVatQuery = noVatQuery.eq('expense_date', date);
    } else if (startDate && endDate) {
      vatQuery = vatQuery.gte('expense_date', startDate).lte('expense_date', endDate);
      noVatQuery = noVatQuery.gte('expense_date', startDate).lte('expense_date', endDate);
    }

    const [vatResult, noVatResult] = await Promise.all([
      vatQuery.order('expense_date', { ascending: false }),
      noVatQuery.order('expense_date', { ascending: false }),
    ]);

    if (vatResult.error) {
      console.error('Error fetching VAT expenses:', vatResult.error);
    }
    if (noVatResult.error) {
      console.error('Error fetching no-VAT expenses:', noVatResult.error);
    }

    // Calculate totals by date
    const vatByDate: Record<string, { total: number; vatTotal: number }> = {};
    const noVatByDate: Record<string, number> = {};

    (vatResult.data || []).forEach(exp => {
      if (!vatByDate[exp.expense_date]) {
        vatByDate[exp.expense_date] = { total: 0, vatTotal: 0 };
      }
      vatByDate[exp.expense_date].total += parseFloat(exp.amount) || 0;
      vatByDate[exp.expense_date].vatTotal += parseFloat(exp.vat_amount) || 0;
    });

    (noVatResult.data || []).forEach(exp => {
      if (!noVatByDate[exp.expense_date]) {
        noVatByDate[exp.expense_date] = 0;
      }
      noVatByDate[exp.expense_date] += parseFloat(exp.amount) || 0;
    });

    return NextResponse.json({
      vatExpenses: vatResult.data || [],
      noVatExpenses: noVatResult.data || [],
      vatByDate,
      noVatByDate,
    });
  } catch (error: any) {
    console.error('Error in expenses GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, expense_date, description, amount, vat_amount, supplier_name, is_recurring, category, businessId, payment_method, invoice_number, file_url } = body;

    if (!expense_date || !description || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const table = type === 'vat' ? TABLES.EXPENSES_VAT : TABLES.EXPENSES_NO_VAT;
    
    const insertData: any = {
      expense_date,
      description,
      amount: parseFloat(amount) || 0,
      supplier_name: supplier_name || null,
      is_recurring: is_recurring || false,
      category: category || null,
      payment_method: payment_method || 'credit',
      invoice_number: invoice_number || null,
      file_url: file_url || null,
    };

    // Add business_id if provided
    if (businessId) {
      insertData.business_id = businessId;
    }

    // Only add vat_amount for VAT expenses
    if (type === 'vat') {
      insertData.vat_amount = parseFloat(vat_amount) || 0;
    }

    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, created: true });
  } catch (error: any) {
    console.error('Error in expenses POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    const table = type === 'vat' ? TABLES.EXPENSES_VAT : TABLES.EXPENSES_NO_VAT;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in expenses DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, expense_date, description, amount, vat_amount, supplier_name, businessId, payment_method, is_recurring, invoice_number } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const table = type === 'vat' ? TABLES.EXPENSES_VAT : TABLES.EXPENSES_NO_VAT;
    
    // Build update data - only include provided fields
    const updateData: any = {};
    
    if (expense_date !== undefined) updateData.expense_date = expense_date;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name || null;
    if (payment_method !== undefined) updateData.payment_method = payment_method || 'credit';
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (invoice_number !== undefined) updateData.invoice_number = invoice_number || null;

    // Only add vat_amount for VAT expenses
    if (type === 'vat' && vat_amount !== undefined) {
      updateData.vat_amount = parseFloat(vat_amount) || 0;
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, updated: true });
  } catch (error: any) {
    console.error('Error in expenses PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
