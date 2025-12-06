import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const isRecovery = requestUrl.searchParams.get('type') === 'recovery';

  // Use site URL for redirects (important for production behind proxy)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blockstory.onrender.com';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Handle password recovery
  if (type === 'recovery' || isRecovery) {
    // Redirect to password reset page with the token
    if (token_hash) {
      return NextResponse.redirect(`${siteUrl}/auth/reset-password?token_hash=${token_hash}`);
    }
    if (code) {
      return NextResponse.redirect(`${siteUrl}/auth/reset-password?code=${code}`);
    }
  }

  // Handle magic link (OTP) verification - includes magiclink, signup, invite
  if (token_hash && (type === 'magiclink' || type === 'signup' || type === 'invite' || type === 'email')) {
    const otpType = type === 'signup' ? 'signup' : type === 'invite' ? 'invite' : type === 'email' ? 'email' : 'magiclink';
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType as any,
    });

    if (error) {
      console.error('Error verifying OTP:', error);
      return NextResponse.redirect(`${siteUrl}/?error=invalid_link`);
    }

    if (data.user) {
      // For new signups, redirect to set password page
      const isNewUser = type === 'signup' || type === 'invite';
      
      // Check if user has any businesses (the trigger should have added them)
      const { data: userBusinesses } = await supabase
        .from('user_businesses')
        .select('business_id')
        .eq('user_id', data.user.id);

      // Process pending invitations if needed
      if (!userBusinesses || userBusinesses.length === 0) {
        const { data: pendingInvites } = await supabase
          .from('pending_invitations')
          .select('*')
          .ilike('email', data.user.email || '');

        if (pendingInvites && pendingInvites.length > 0) {
          // Process pending invitations manually
          for (const invite of pendingInvites) {
            await supabase
              .from('user_businesses')
              .insert({
                user_id: data.user.id,
                business_id: invite.business_id,
                role: invite.role,
                invited_by: invite.invited_by,
                invited_at: invite.created_at,
              });

            // Delete the processed invitation
            await supabase
              .from('pending_invitations')
              .delete()
              .eq('id', invite.id);
          }
        }
      }

      // If new user, redirect to set password with email pre-filled
      if (isNewUser) {
        const email = encodeURIComponent(data.user.email || '');
        return NextResponse.redirect(`${siteUrl}/auth/set-password?email=${email}`);
      }

      // Existing user - redirect to dashboard
      return NextResponse.redirect(siteUrl);
    }
  }

  // Handle OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code:', error);
      return NextResponse.redirect(`${siteUrl}/?error=auth_failed`);
    }
  }

  // Redirect to home page
  return NextResponse.redirect(siteUrl);
}
