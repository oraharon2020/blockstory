import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
  }

  // Create admin client with service key
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get user_businesses for this business
    const { data: userBusinesses, error: ubError } = await supabaseAdmin
      .from('user_businesses')
      .select('id, user_id, role, invited_at, accepted_at')
      .eq('business_id', businessId);

    if (ubError) throw ubError;

    // Get user details for each
    const usersWithDetails = [];

    for (const ub of userBusinesses || []) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(ub.user_id);
      
      if (!userError && userData?.user) {
        usersWithDetails.push({
          id: ub.id,
          user_id: ub.user_id,
          email: userData.user.email,
          full_name: userData.user.user_metadata?.full_name,
          role: ub.role,
          invited_at: ub.invited_at,
          accepted_at: ub.accepted_at,
        });
      } else {
        // User not found in auth, still include with unknown email
        usersWithDetails.push({
          id: ub.id,
          user_id: ub.user_id,
          email: 'משתמש לא נמצא',
          full_name: null,
          role: ub.role,
          invited_at: ub.invited_at,
          accepted_at: ub.accepted_at,
        });
      }
    }

    return NextResponse.json({ users: usersWithDetails });
  } catch (error: any) {
    console.error('Error fetching business users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
