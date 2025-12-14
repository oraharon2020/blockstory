/**
 * AI Assistant Execute API - ביצוע פעולות לאחר אישור
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getWooCommerceCredentials(businessId: string) {
  // First try business_settings (main WooCommerce config location)
  const { data: businessSettings, error: settingsError } = await supabase
    .from('business_settings')
    .select('woo_url, consumer_key, consumer_secret')
    .eq('business_id', businessId)
    .single();

  if (businessSettings?.woo_url && businessSettings?.consumer_key && businessSettings?.consumer_secret) {
    return {
      url: businessSettings.woo_url.trim(),
      consumerKey: businessSettings.consumer_key.trim(),
      consumerSecret: businessSettings.consumer_secret.trim(),
    };
  }

  // Fallback to integrations table if not found in business_settings
  const { data, error } = await supabase
    .from('integrations')
    .select('credentials, settings')
    .eq('business_id', businessId)
    .eq('type', 'woocommerce')
    .eq('is_active', true)
    .single();

  if (data?.credentials) {
    return {
      url: data.credentials.store_url,
      consumerKey: data.credentials.consumer_key,
      consumerSecret: data.credentials.consumer_secret,
    };
  }

  throw new Error('WooCommerce לא מחובר');
}

async function updateProductPrice(
  credentials: any, 
  productId: number, 
  price: number, 
  variationId?: number,
  priceType: 'regular' | 'sale' = 'regular'
) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  const endpoint = variationId 
    ? `${url}/wp-json/wc/v3/products/${productId}/variations/${variationId}`
    : `${url}/wp-json/wc/v3/products/${productId}`;

  const priceData = priceType === 'sale' 
    ? { sale_price: price.toString() }
    : { regular_price: price.toString() };

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(priceData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאה בעדכון המחיר: ${errorText}`);
  }

  return response.json();
}

async function updateStock(credentials: any, productId: number, stockQuantity: number, variationId?: number) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  const endpoint = variationId 
    ? `${url}/wp-json/wc/v3/products/${productId}/variations/${variationId}`
    : `${url}/wp-json/wc/v3/products/${productId}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      manage_stock: true,
      stock_quantity: stockQuantity,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאה בעדכון המלאי: ${errorText}`);
  }

  return response.json();
}

async function addVariation(credentials: any, productId: number, variationData: any) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  const response = await fetch(`${url}/wp-json/wc/v3/products/${productId}/variations`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(variationData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאה בהוספת וריאציה: ${errorText}`);
  }

  return response.json();
}

async function uploadImage(credentials: any, imageUrl: string, filename: string) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  // First, download the image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  
  // Then upload to WordPress media
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer]), filename);

  const response = await fetch(`${url}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('שגיאה בהעלאת התמונה');
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId } = body;

    console.log('📥 Execute API received:', JSON.stringify({ businessId, actionType: action?.type, details: action?.details }, null, 2));

    if (!businessId || !action) {
      console.log('❌ Missing fields - businessId:', !!businessId, 'action:', !!action);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Handle price_change_request or price_update as bulk_update_price
    if (action.type === 'price_change_request' || action.type === 'price_update') {
      console.log('⚠️ Converting', action.type, 'to bulk_update_price');
      action.type = 'bulk_update_price';
    }

    const credentials = await getWooCommerceCredentials(businessId);
    let result;

    switch (action.type) {
      case 'update_price':
        result = await updateProductPrice(
          credentials,
          action.details.productId,
          parseFloat(action.details.newValue),
          action.details.variationId
        );
        return NextResponse.json({
          success: true,
          message: `✅ המחיר עודכן בהצלחה!\n\n${action.details.productName}${action.details.variationName ? ` - ${action.details.variationName}` : ''}\n${action.details.oldValue} ₪ ➜ ${action.details.newValue} ₪`,
          result,
        });

      case 'bulk_update_price':
        // Update multiple variations
        console.log('🔄 bulk_update_price action received');
        console.log('📦 Product ID:', action.details.productId);
        console.log('📋 Variations:', JSON.stringify(action.details.variations, null, 2));
        
        // Validate variations is an array
        if (!action.details.variations || !Array.isArray(action.details.variations)) {
          console.error('❌ variations is not an array:', typeof action.details.variations);
          return NextResponse.json({
            success: false,
            error: 'לא נמצאו וריאציות לעדכון. נסה שוב.',
          }, { status: 400 });
        }
        
        if (action.details.variations.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'רשימת הוריאציות ריקה.',
          }, { status: 400 });
        }
        
        const priceType = action.details.priceType || 'regular';
        const priceTypeText = priceType === 'sale' ? 'מחיר מבצע' : 'מחיר רגיל';
        console.log(`💰 Price type: ${priceType}`);
        
        const results: any[] = [];
        const errors: string[] = [];
        
        for (const variation of action.details.variations) {
          try {
            console.log(`🔧 Updating ${priceType} price for variation ${variation.variationId}: ${variation.oldPrice} → ${variation.newPrice}`);
            const res = await updateProductPrice(
              credentials,
              action.details.productId,
              parseFloat(variation.newPrice),
              variation.variationId,
              priceType
            );
            console.log(`✅ Variation ${variation.variationId} updated successfully`);
            results.push({ variationId: variation.variationId, success: true });
          } catch (e: any) {
            console.error(`❌ Variation ${variation.variationId} failed:`, e.message);
            errors.push(`${variation.variationName}: ${e.message}`);
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        const totalCount = action.details.variations.length;
        
        console.log(`📊 Results: ${successCount}/${totalCount} successful`);
        
        return NextResponse.json({
          success: errors.length === 0,
          message: `✅ עודכנו ${successCount}/${totalCount} וריאציות!\n\n${action.details.productName}\n${priceTypeText}: ${action.details.changeAmount} ₪${errors.length > 0 ? `\n\n❌ שגיאות:\n${errors.join('\n')}` : ''}`,
          results,
        });

      case 'convert_to_sale':
        // Convert regular price to sale price and increase regular price
        console.log('🔄 convert_to_sale action received');
        console.log('📦 Product ID:', action.details.productId);
        console.log('📋 Variations:', JSON.stringify(action.details.variations?.slice(0, 2), null, 2));
        
        if (!action.details.variations || action.details.variations.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'לא נמצאו וריאציות לעדכון.',
          }, { status: 400 });
        }
        
        const convertResults: any[] = [];
        const convertErrors: string[] = [];
        
        for (const variation of action.details.variations) {
          try {
            console.log(`🔧 Converting variation ${variation.variationId}: regular ${variation.currentRegularPrice} → ${variation.newRegularPrice}, sale → ${variation.newSalePrice}`);
            
            // Update both prices in a single API call
            const endpoint = `${credentials.url}/wp-json/wc/v3/products/${action.details.productId}/variations/${variation.variationId}`;
            const response = await fetch(endpoint, {
              method: 'PUT',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64'),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                regular_price: variation.newRegularPrice,
                sale_price: variation.newSalePrice,
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
            
            console.log(`✅ Variation ${variation.variationId} converted successfully`);
            convertResults.push({ variationId: variation.variationId, success: true });
          } catch (e: any) {
            console.error(`❌ Variation ${variation.variationId} failed:`, e.message);
            convertErrors.push(`${variation.variationName}: ${e.message}`);
          }
        }
        
        const convertSuccessCount = convertResults.filter(r => r.success).length;
        const convertTotalCount = action.details.variations.length;
        
        return NextResponse.json({
          success: convertErrors.length === 0,
          message: `✅ הומרו ${convertSuccessCount}/${convertTotalCount} וריאציות!\n\n${action.details.productName}\nמחיר רגיל הועלה ב-${action.details.regularPriceIncrease} ₪\nמחיר מבצע = המחיר הרגיל הקודם${convertErrors.length > 0 ? `\n\n❌ שגיאות:\n${convertErrors.join('\n')}` : ''}`,
          results: convertResults,
        });

      case 'update_description':
        // Update product description and SEO meta
        console.log('📝 update_description action received');
        console.log('📦 Product ID:', action.details.productId);
        
        try {
          const { url, consumerKey, consumerSecret } = credentials;
          
          // Build update data
          const updateData: any = {};
          
          if (action.details.newDescription) {
            updateData.description = action.details.newDescription;
          }
          if (action.details.newShortDescription) {
            updateData.short_description = action.details.newShortDescription;
          }
          
          // Add Yoast SEO meta if provided (requires Yoast SEO plugin)
          if (action.details.metaTitle || action.details.metaDescription) {
            updateData.meta_data = [];
            if (action.details.metaTitle) {
              updateData.meta_data.push({
                key: '_yoast_wpseo_title',
                value: action.details.metaTitle
              });
            }
            if (action.details.metaDescription) {
              updateData.meta_data.push({
                key: '_yoast_wpseo_metadesc',
                value: action.details.metaDescription
              });
            }
          }
          
          console.log('📤 Updating product with:', JSON.stringify(updateData, null, 2));
          
          const response = await fetch(`${url}/wp-json/wc/v3/products/${action.details.productId}`, {
            method: 'PUT',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
          }
          
          const updatedProduct = await response.json();
          console.log('✅ Product description updated successfully');
          
          return NextResponse.json({
            success: true,
            message: `✅ התיאור עודכן בהצלחה!\n\n${action.details.productName}\n\n` +
              `• תיאור מלא: עודכן ✓\n` +
              `• תיאור קצר: ${action.details.newShortDescription ? 'עודכן ✓' : 'ללא שינוי'}\n` +
              `• כותרת SEO: ${action.details.metaTitle ? 'עודכן ✓' : 'ללא שינוי'}\n` +
              `• תיאור מטא: ${action.details.metaDescription ? 'עודכן ✓' : 'ללא שינוי'}`,
            result: updatedProduct,
          });
        } catch (e: any) {
          console.error('❌ Failed to update description:', e.message);
          return NextResponse.json({
            success: false,
            error: `שגיאה בעדכון התיאור: ${e.message}`,
          }, { status: 500 });
        }

      case 'update_stock':
        result = await updateStock(
          credentials,
          action.details.productId,
          action.details.newValue,
          action.details.variationId
        );
        return NextResponse.json({
          success: true,
          message: `✅ המלאי עודכן בהצלחה!\n\n${action.details.productName}${action.details.variationName ? ` - ${action.details.variationName}` : ''}\nמלאי: ${action.details.oldValue} ➜ ${action.details.newValue}`,
          result,
        });

      case 'add_variation':
        const variationData: any = {
          regular_price: action.details.price?.toString(),
          attributes: action.details.attributes,
        };

        // If there's an image URL, upload it first
        if (action.details.imageUrl) {
          try {
            const uploadedImage = await uploadImage(
              credentials,
              action.details.imageUrl,
              `variation-${Date.now()}.jpg`
            );
            variationData.image = { id: uploadedImage.id };
          } catch (e) {
            console.error('Error uploading image:', e);
          }
        }

        result = await addVariation(credentials, action.details.productId, variationData);
        return NextResponse.json({
          success: true,
          message: `✅ הוריאציה נוספה בהצלחה!\n\n${action.details.productName}\nוריאציה חדשה: ${action.details.attributes?.map((a: any) => `${a.name}: ${a.option}`).join(', ')}`,
          result,
        });

      default:
        console.log('❌ Unknown action type:', action.type);
        console.log('❌ Full action:', JSON.stringify(action, null, 2));
        return NextResponse.json({ error: `Unknown action type: ${action.type}` }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Execute Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
