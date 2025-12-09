import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Create admin client with service role key for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Regular client for database queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET - List users for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    // Get users associated with this business
    const { data: userBusinesses, error: ubError } = await supabase
      .from('user_businesses')
      .select(`
        user_id,
        role,
        created_at
      `)
      .eq('business_id', businessId);

    if (ubError) {
      console.error('Error fetching user_businesses:', ubError);
      return NextResponse.json({ error: ubError.message }, { status: 500 });
    }

    // Get user details from auth.users via admin API
    const users = [];
    for (const ub of userBusinesses || []) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(ub.user_id);
      
      if (!authError && authUser?.user) {
        users.push({
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          last_sign_in_at: authUser.user.last_sign_in_at,
          role: ub.role,
          joined_business_at: ub.created_at
        });
      }
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, businessId, role = 'viewer', name } = body;

    if (!email || !password || !businessId) {
      return NextResponse.json({ 
        error: 'חסרים שדות חובה: email, password, businessId' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'הסיסמא חייבת להכיל לפחות 6 תווים' 
      }, { status: 400 });
    }

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || email.split('@')[0]
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Handle specific errors
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ 
          error: 'כתובת המייל כבר רשומה במערכת' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Link user to business
    const { error: linkError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: authData.user.id,
        business_id: businessId,
        role: role
      });

    if (linkError) {
      console.error('Error linking user to business:', linkError);
      // Try to delete the auth user if linking fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
        created_at: authData.user.created_at
      },
      message: `המשתמש ${email} נוצר בהצלחה!`
    });

  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove user from business (or delete entirely)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const businessId = searchParams.get('businessId');
    const deleteCompletely = searchParams.get('deleteCompletely') === 'true';

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Missing userId or businessId' }, { status: 400 });
    }

    // Remove user from business
    const { error: unlinkError } = await supabase
      .from('user_businesses')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (unlinkError) {
      console.error('Error unlinking user:', unlinkError);
      return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    // If deleteCompletely, also delete from auth
    if (deleteCompletely) {
      // First check if user has other businesses
      const { data: otherBusinesses } = await supabase
        .from('user_businesses')
        .select('business_id')
        .eq('user_id', userId);

      if (!otherBusinesses || otherBusinesses.length === 0) {
        // User has no other businesses, safe to delete
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error('Error deleting auth user:', deleteAuthError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'המשתמש הוסר בהצלחה'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update user role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId, role } = body;

    if (!userId || !businessId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validRoles = ['owner', 'admin', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_businesses')
      .update({ role })
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'התפקיד עודכן בהצלחה'
    });

  } catch (error: any) {
    console.error('Error in PATCH /api/users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
