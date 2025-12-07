import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This API processes pending invitations for a user
// Called after a user signs in via magic link

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Supabase service key not configured, skipping invitation processing');
      return NextResponse.json({ message: 'Invitation processing not configured', processed: 0 });
    }

    // Use service key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find pending invitations for this email
    const { data: pendingInvites, error: fetchError } = await supabase
      .from('pending_invitations')
      .select('*')
      .ilike('email', email);

    console.log('Processing invitations for:', email, 'Found:', pendingInvites?.length || 0);

    if (fetchError) {
      console.error('Error fetching pending invitations:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingInvites || pendingInvites.length === 0) {
      return NextResponse.json({ message: 'No pending invitations', processed: 0 });
    }

    let processed = 0;

    for (const invite of pendingInvites) {
      // Check if user is already associated with this business
      const { data: existing } = await supabase
        .from('user_businesses')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', invite.business_id)
        .single();

      if (!existing) {
        // Add user to business
        const { error: insertError } = await supabase
          .from('user_businesses')
          .insert({
            user_id: userId,
            business_id: invite.business_id,
            role: invite.role,
            invited_by: invite.invited_by,
            invited_at: invite.created_at,
          });

        if (insertError) {
          console.error('Error adding user to business:', insertError);
        } else {
          processed++;
        }
      }

      // Delete the processed invitation
      await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', invite.id);
    }

    return NextResponse.json({ message: 'Invitations processed', processed });
  } catch (error) {
    console.error('Error processing invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
