import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromMonth, fromYear, toMonth, toYear } = body;

    // Calculate date ranges
    const fromDaysInMonth = new Date(fromYear, fromMonth + 1, 0).getDate();
    const fromStartDate = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-01`;
    const fromEndDate = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-${String(fromDaysInMonth).padStart(2, '0')}`;

    let copiedCount = 0;

    // Copy VAT expenses
    const { data: vatExpenses, error: vatError } = await supabase
      .from(TABLES.EXPENSES_VAT)
      .select('*')
      .gte('expense_date', fromStartDate)
      .lte('expense_date', fromEndDate);

    if (vatError) throw vatError;

    if (vatExpenses && vatExpenses.length > 0) {
      for (const expense of vatExpenses) {
        // Calculate new date (same day but in new month)
        const oldDate = new Date(expense.expense_date);
        const day = oldDate.getDate();
        const newDaysInMonth = new Date(toYear, toMonth + 1, 0).getDate();
        const newDay = Math.min(day, newDaysInMonth); // Handle month length differences
        const newDate = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;

        const { error: insertError } = await supabase
          .from(TABLES.EXPENSES_VAT)
          .insert({
            expense_date: newDate,
            description: expense.description,
            amount: expense.amount,
            vat_amount: expense.vat_amount,
            supplier_name: expense.supplier_name,
            is_recurring: expense.is_recurring,
            category: expense.category,
          });

        if (!insertError) copiedCount++;
      }
    }

    // Copy non-VAT expenses
    const { data: noVatExpenses, error: noVatError } = await supabase
      .from(TABLES.EXPENSES_NO_VAT)
      .select('*')
      .gte('expense_date', fromStartDate)
      .lte('expense_date', fromEndDate);

    if (noVatError) throw noVatError;

    if (noVatExpenses && noVatExpenses.length > 0) {
      for (const expense of noVatExpenses) {
        // Calculate new date (same day but in new month)
        const oldDate = new Date(expense.expense_date);
        const day = oldDate.getDate();
        const newDaysInMonth = new Date(toYear, toMonth + 1, 0).getDate();
        const newDay = Math.min(day, newDaysInMonth);
        const newDate = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;

        const { error: insertError } = await supabase
          .from(TABLES.EXPENSES_NO_VAT)
          .insert({
            expense_date: newDate,
            description: expense.description,
            amount: expense.amount,
            supplier_name: expense.supplier_name,
            is_recurring: expense.is_recurring,
            category: expense.category,
          });

        if (!insertError) copiedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      copiedCount,
      message: `הועתקו ${copiedCount} הוצאות` 
    });

  } catch (error) {
    console.error('Error copying expenses:', error);
    return NextResponse.json({ error: 'Failed to copy expenses' }, { status: 500 });
  }
}
