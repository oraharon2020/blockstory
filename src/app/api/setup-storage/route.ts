import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET - Create the invoices bucket (one-time setup)
export async function GET(request: NextRequest) {
  try {
    // First check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const bucketExists = buckets?.some(b => b.name === 'invoices');
    
    if (bucketExists) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bucket "invoices" already exists' 
      });
    }

    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket('invoices', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bucket "invoices" created successfully',
      data 
    });

  } catch (error: any) {
    console.error('Error creating bucket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
