import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const BUCKET_NAME = 'invoices';

// POST - Upload file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    const expenseId = formData.get('expenseId') as string;
    const type = formData.get('type') as string; // 'vat' or 'no_vat'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'pdf';
    const fileName = `${businessId}/${timestamp}_${expenseId || 'new'}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // If expenseId provided, update the expense with the file URL
    if (expenseId && type) {
      const table = type === 'vat' ? 'expenses_vat' : 'expenses_no_vat';
      const { error: updateError } = await supabase
        .from(table)
        .update({ file_url: fileUrl })
        .eq('id', expenseId)
        .eq('business_id', businessId);

      if (updateError) {
        console.error('Error updating expense with file URL:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName,
      message: 'הקובץ הועלה בהצלחה'
    });

  } catch (error: any) {
    console.error('Error in upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const businessId = searchParams.get('businessId');

    if (!fileName || !businessId) {
      return NextResponse.json({ error: 'Missing fileName or businessId' }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'הקובץ נמחק' });

  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
