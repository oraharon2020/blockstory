import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API לניהול עובדים ושכר
 * 
 * GET - קבלת רשימת עובדים לחודש מסוים
 * POST - הוספה/עדכון עובד
 * DELETE - מחיקת עובד
 */

// GET - Get employees for a specific month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!businessId || !month || !year) {
      return NextResponse.json(
        { error: 'businessId, month, and year are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .eq('month', parseInt(month))
      .eq('year', parseInt(year))
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate total salary and daily cost
    const totalSalary = data?.reduce((sum, emp) => sum + (emp.salary || 0), 0) || 0;
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dailyCost = totalSalary / daysInMonth;

    return NextResponse.json({
      employees: data || [],
      totalSalary,
      daysInMonth,
      dailyCost,
    });
  } catch (error: any) {
    console.error('Error in employees GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add or update employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, salary, month, year, id } = body;

    if (!businessId || !name || salary === undefined || !month || !year) {
      return NextResponse.json(
        { error: 'businessId, name, salary, month, and year are required' },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing employee
      const { data, error } = await supabase
        .from('employees')
        .update({
          name,
          salary: parseFloat(salary) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, updated: true });
    } else {
      // Insert new employee
      const { data, error } = await supabase
        .from('employees')
        .insert({
          business_id: businessId,
          name,
          salary: parseFloat(salary) || 0,
          month: parseInt(month),
          year: parseInt(year),
        })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'עובד עם שם זה כבר קיים בחודש זה' },
            { status: 400 }
          );
        }
        console.error('Error inserting employee:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data, created: true });
    }
  } catch (error: any) {
    console.error('Error in employees POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete employee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in employees DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Copy employees from previous month
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, targetMonth, targetYear } = body;

    if (!businessId || !targetMonth || !targetYear) {
      return NextResponse.json(
        { error: 'businessId, targetMonth, and targetYear are required' },
        { status: 400 }
      );
    }

    // Calculate previous month
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    // Get employees from previous month
    const { data: prevEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('name, salary')
      .eq('business_id', businessId)
      .eq('month', prevMonth)
      .eq('year', prevYear);

    if (fetchError) {
      console.error('Error fetching previous employees:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!prevEmployees || prevEmployees.length === 0) {
      return NextResponse.json(
        { error: 'לא נמצאו עובדים בחודש הקודם' },
        { status: 404 }
      );
    }

    // Insert employees for new month (ignore duplicates)
    const newEmployees = prevEmployees.map((emp) => ({
      business_id: businessId,
      name: emp.name,
      salary: emp.salary,
      month: targetMonth,
      year: targetYear,
    }));

    const { data, error: insertError } = await supabase
      .from('employees')
      .upsert(newEmployees, { 
        onConflict: 'business_id,name,month,year',
        ignoreDuplicates: true 
      })
      .select();

    if (insertError) {
      console.error('Error copying employees:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      copied: prevEmployees.length,
      message: `הועתקו ${prevEmployees.length} עובדים מחודש קודם`,
    });
  } catch (error: any) {
    console.error('Error in employees PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
