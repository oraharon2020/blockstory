/**
 * AI Assistant Chat API - Pilot Module
 * 
 * מקבל הודעה מהמשתמש ומחזיר תשובה + פעולה לאישור
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `אתה עוזר AI לניהול מוצרים בחנות WooCommerce. 
אתה מדבר עברית ועוזר לבעל החנות לנהל מוצרים.

יכולות שלך:
1. להציג פרטי מוצר ווריאציות ותיאור קיים
2. להציע שינוי מחיר רגיל או מבצע (דורש אישור)
3. להפוך מחיר רגיל למחיר מבצע ולהעלות את המחיר הרגיל
4. לכתוב או לעדכן תיאור מוצר עם אופטימיזציה ל-SEO

סוגי action מותרים בלבד: price_update, convert_to_sale, update_description

כשמבקשים לעדכן מחירים, החזר:
{
  "message": "הסבר קצר",
  "action": {
    "type": "price_update",
    "productName": "שם המוצר",
    "priceType": "regular",
    "changeAmount": 100,
    "changeDirection": "increase",
    "filterWidth": "200"
  }
}

כשמבקשים להפוך מחיר רגיל למבצע ולהעלות את הרגיל:
{
  "message": "הסבר קצר",
  "action": {
    "type": "convert_to_sale",
    "productName": "שם המוצר",
    "regularPriceIncrease": 500,
    "filterWidth": "all"
  }
}

כשמבקשים לכתוב/לעדכן תיאור מוצר:
{
  "message": "הנה התיאור המוצע:",
  "action": {
    "type": "update_description",
    "productName": "שם המוצר",
    "description": "התיאור המלא בעברית עם HTML",
    "shortDescription": "תיאור קצר למוצר",
    "metaTitle": "כותרת SEO (עד 60 תווים)",
    "metaDescription": "תיאור מטא ל-SEO (עד 160 תווים)"
  }
}

עקרונות לכתיבת תיאור מוצר:
- כתוב בעברית תקנית ומקצועית
- השתמש ב-HTML לעיצוב (כותרות h2/h3, רשימות ul/li, פסקאות p, bold)
- כלול מילות מפתח רלוונטיות באופן טבעי
- הדגש יתרונות ותועלות למשתמש
- כלול מידע טכני ומפרט
- תיאור קצר: 1-2 משפטים תמציתיים
- metaTitle: עד 60 תווים, כולל שם המוצר ומילת מפתח
- metaDescription: עד 160 תווים, קריאה לפעולה ותועלת

להצגת מידע בלבד (חיפוש, הצגת תיאור קיים, שאלות):
החזר רק message ללא action!
{
  "message": "התשובה שלך עם המידע מהמוצר"
}

חשוב מאוד:
- אל תמציא סוגי action חדשים! רק price_update, convert_to_sale, update_description
- לשאלות והצגת מידע - החזר רק message ללא action
- אל תבנה רשימת וריאציות - המערכת תעשה את זה!`;

async function getWooCommerceCredentials(businessId: string) {
  console.log('🔍 Looking for WooCommerce credentials for business:', businessId);
  
  // First try business_settings (main WooCommerce config location)
  const { data: businessSettings, error: settingsError } = await supabase
    .from('business_settings')
    .select('woo_url, consumer_key, consumer_secret')
    .eq('business_id', businessId)
    .single();

  console.log('📋 business_settings result:', { 
    found: !!businessSettings, 
    hasUrl: !!businessSettings?.woo_url,
    hasKey: !!businessSettings?.consumer_key,
    hasSecret: !!businessSettings?.consumer_secret,
    error: settingsError?.message 
  });

  if (businessSettings?.woo_url && businessSettings?.consumer_key && businessSettings?.consumer_secret) {
    console.log('✅ Found credentials in business_settings, URL:', businessSettings.woo_url);
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

  console.log('📋 integrations result:', { found: !!data, error: error?.message });

  if (data?.credentials) {
    return {
      url: data.credentials.store_url,
      consumerKey: data.credentials.consumer_key,
      consumerSecret: data.credentials.consumer_secret,
    };
  }

  throw new Error('WooCommerce לא מחובר');
}

async function searchProducts(credentials: any, searchTerm: string) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  console.log(`🔎 Searching products for: "${searchTerm}" at ${url}`);
  
  const searchUrl = `${url}/wp-json/wc/v3/products?search=${encodeURIComponent(searchTerm)}&per_page=10`;
  console.log('🌐 Search URL:', searchUrl);
  
  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
    },
  });

  console.log('📡 Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Search error:', errorText);
    throw new Error('שגיאה בחיפוש מוצרים');
  }

  const products = await response.json();
  console.log(`✅ Found ${products.length} products`);
  if (products.length > 0) {
    console.log('📦 First product:', products[0].name, '(ID:', products[0].id, ')');
  }
  return products;
}

async function getProductWithVariations(credentials: any, productId: number) {
  const { url, consumerKey, consumerSecret } = credentials;
  
  console.log(`📥 Fetching product ${productId} with variations...`);
  
  const [productRes, variationsRes] = await Promise.all([
    fetch(`${url}/wp-json/wc/v3/products/${productId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
      },
    }),
    fetch(`${url}/wp-json/wc/v3/products/${productId}/variations?per_page=100`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
      },
    }),
  ]);

  const product = await productRes.json();
  
  // Always try to get variations - WooCommerce sometimes reports wrong type
  const variationsData = await variationsRes.json();
  const variations = Array.isArray(variationsData) ? variationsData : [];
  
  console.log(`📦 Product: ${product.name}, Type: ${product.type}, Variations found: ${variations.length}`);
  if (variations.length > 0) {
    console.log('📋 First 3 variations:', variations.slice(0, 3).map((v: any) => ({
      id: v.id,
      attributes: v.attributes,
      price: v.price
    })));
  }

  return { product, variations };
}

export async function POST(request: NextRequest) {
  try {
    const { message, businessId, history } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get WooCommerce credentials
    let wooCredentials;
    try {
      wooCredentials = await getWooCommerceCredentials(businessId);
    } catch (e) {
      return NextResponse.json({ 
        message: '❌ WooCommerce לא מחובר. יש לחבר את החנות בהגדרות האינטגרציות.' 
      });
    }

    // Extract search terms - look for product type AND model name
    // Also search in conversation history for context (but filter out JSON responses)
    let productsContext = '';
    
    // Get recent history but filter out JSON/code responses
    const recentHistory = (history || [])
      .slice(-4)
      .map((h: any) => h.content)
      .filter((content: string) => !content.includes('"type":') && !content.includes('<h2>') && !content.includes('```'))
      .join(' ');
    
    // Only use history for context if current message is short (like "תבדוק שוב")
    const useHistory = message.length < 30;
    const fullContext = useHistory ? `${message} ${recentHistory}` : message;
    
    const productTypes = fullContext.match(/מזנון|קומודה|שידה|שולחן|מיטה|ארון|כורסא|ספה|כיסא|מדף|ויטרינה|צף|קונסולה/gi);
    // Also extract English words (model names like Venice, Napoli, Diana, etc.)
    const modelNames = fullContext.match(/\b[A-Za-z]{3,}\b/g)?.filter((name: string) => 
      // Filter out common English words and code keywords
      !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'better', 'message', 'action', 'type', 'description', 'productName', 'strong', 'null', 'undefined', 'true', 'false'].includes(name.toLowerCase())
    );
    
    console.log('📨 Message received:', message);
    console.log('📜 Using history:', useHistory);
    console.log('🔍 Product types found:', productTypes);
    console.log('🔍 Model names found:', modelNames);
    // Extract quoted text like "Venice" or 'מזנון venice'
    const quotedText = fullContext.match(/["']([^"']+)["']/g)?.map((s: string) => s.replace(/["']/g, ''));
    // Extract Hebrew model names (דגם X)
    const hebrewModelMatch = fullContext.match(/דגם\s+([^\s,״"]+)/i);
    
    // Build multiple search queries to try
    const searchQueries: string[] = [];
    
    // Priority 1: Model name in English (e.g., "Venice")
    if (modelNames && modelNames.length > 0) {
      searchQueries.push(modelNames[0]);
    }
    
    // Priority 2: Hebrew model name after "דגם"
    if (hebrewModelMatch && hebrewModelMatch[1]) {
      searchQueries.push(hebrewModelMatch[1]);
    }
    
    // Priority 3: Quoted text
    if (quotedText && quotedText.length > 0) {
      searchQueries.push(...quotedText);
    }
    
    // Priority 4: Product type + model combined
    if (productTypes && productTypes.length > 0 && modelNames && modelNames.length > 0) {
      searchQueries.push(`${productTypes[0]} ${modelNames[0]}`);
    }
    
    // Priority 5: Model name alone (for queries like "מה התיאור של Diana")
    if (modelNames && modelNames.length > 0 && !searchQueries.includes(modelNames[0])) {
      searchQueries.push(modelNames[0]);
    }
    
    // Priority 6: Product type alone - ONLY if no model name
    if (productTypes && productTypes.length > 0 && (!modelNames || modelNames.length === 0)) {
      searchQueries.push(productTypes[0]);
    }
    
    console.log('🔎 Search queries:', searchQueries);
    
    // Try each search query until we find products
    let allProducts: any[] = [];
    let successfulQuery = '';
    
    for (const query of searchQueries) {
      if (allProducts.length > 0) break;
      try {
        console.log(`🔎 Searching for: "${query}"`);
        const products = await searchProducts(wooCredentials, query);
        console.log(`🔎 Found ${products.length} products for "${query}"`);
        if (products.length > 0) {
          allProducts = products;
          successfulQuery = query;
        }
      } catch (e) {
        console.error(`Error searching for "${query}":`, e);
      }
    }
    
    if (allProducts.length > 0) {
      // Try to find the best matching product
      let selectedProduct = allProducts[0];
      const searchLower = message.toLowerCase();
      
      // Extract model name from search (English words like Venice, Diana, Adele)
      const modelNameMatch = message.match(/[A-Za-z]{3,}/g);
      const modelName = modelNameMatch?.[0]?.toLowerCase();
      
      console.log('📊 Looking for model:', modelName);
      console.log('📊 Found products:', allProducts.map((p: any) => p.name).join(', '));
      
      // Priority 1: Find product with exact model name match
      if (modelName) {
        const exactMatch = allProducts.find((p: any) => 
          p.name.toLowerCase().includes(modelName)
        );
        if (exactMatch) {
          selectedProduct = exactMatch;
          console.log('📊 Found exact model match:', exactMatch.name);
        }
      }
      
      // Priority 2: If searching for specific Hebrew terms
      if (searchLower.includes('צף')) {
        const match = allProducts.find((p: any) => p.name.includes('צף'));
        if (match) selectedProduct = match;
      } else if (searchLower.includes('סט')) {
        const match = allProducts.find((p: any) => p.name.includes('סט'));
        if (match) selectedProduct = match;
      }
      
      console.log('📊 Selected product:', selectedProduct.name, '(ID:', selectedProduct.id, ')');
      
      // Get variations for the selected product
      try {
        const { product, variations } = await getProductWithVariations(wooCredentials, selectedProduct.id);
        
        console.log('📊 Product type:', product.type);
        console.log('📊 Variations count:', variations.length);
        
        // Group variations by width for easier reading
        let variationsText = '(אין וריאציות)';
        if (variations.length > 0) {
          // Group by width
          const byWidth: Record<string, any[]> = {};
          variations.forEach((v: any) => {
            const widthAttr = v.attributes.find((a: any) => a.name.includes('רוחב'));
            const width = widthAttr?.option || 'ללא רוחב';
            if (!byWidth[width]) byWidth[width] = [];
            byWidth[width].push(v);
          });
          
          console.log('📊 Widths found:', Object.keys(byWidth));
          console.log('📊 Sample variation:', JSON.stringify(variations[0]?.attributes));
          
          variationsText = Object.entries(byWidth).map(([width, vars]) => {
            return `\n📏 ${width}:\n${(vars as any[]).map((v: any) => {
              const color = v.attributes.find((a: any) => a.name.includes('צבע'))?.option || '';
              const stockText = v.stock_status === 'instock' ? '✓' : '✗';
              return `  • ID: ${v.id} | ${color} | מחיר: ${v.price} ₪ | ${stockText}`;
            }).join('\n')}`;
          }).join('\n');
        }
        
        // Clean and truncate descriptions safely
        const cleanDescription = (html: string | undefined, maxLen: number = 300) => {
          if (!html) return '';
          try {
            return html
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, maxLen) + (html.length > maxLen ? '...' : '');
          } catch {
            return '(שגיאה בקריאת תיאור)';
          }
        };
        
        const shortDesc = cleanDescription(product.short_description, 200);
        const fullDesc = cleanDescription(product.description, 400);
        
        console.log('📝 Product descriptions loaded:', { 
          hasShort: !!product.short_description, 
          hasFull: !!product.description,
          shortLen: shortDesc.length,
          fullLen: fullDesc.length 
        });
        
        productsContext = `
🔍 חיפוש: "${successfulQuery}"

מוצרים שנמצאו:
${allProducts.slice(0, 5).map((p: any) => `- ${p.name} (ID: ${p.id}) - מחיר: ${p.price} ₪`).join('\n')}

📦 פרטי המוצר הראשון:
שם: ${product.name}
ID מוצר: ${product.id}
סוג: ${product.type}
מחיר בסיס: ${product.price} ₪

📝 תיאור קצר נוכחי:
${shortDesc || '(אין תיאור קצר)'}

📄 תיאור מלא נוכחי:
${fullDesc || '(אין תיאור)'}

📋 וריאציות (${variations.length} סה"כ):
${variationsText}
`;
      } catch (e) {
        console.error('Error getting product variations:', e);
        productsContext = `
🔍 חיפוש: "${successfulQuery}"

מוצרים שנמצאו:
${allProducts.slice(0, 5).map((p: any) => `- ${p.name} (ID: ${p.id}) - מחיר: ${p.price} ₪`).join('\n')}
`;
      }
    } else if (searchQueries.length > 0) {
      productsContext = `לא נמצאו מוצרים עבור: ${searchQueries.slice(0, 3).join(', ')}`;
    }

    // Check if Anthropic API key exists
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    // Store variations for later use in fixing Claude's response
    let storedVariations: any[] = [];
    let storedProduct: any = null;
    
    if (!anthropicKey) {
      // Fallback response without AI
      return NextResponse.json({
        message: `🔍 חיפשתי את "${successfulQuery || message}"

${productsContext || 'לא נמצאו מוצרים תואמים.'}

⚠️ שים לב: Claude API לא מוגדר. הוסף ANTHROPIC_API_KEY לקובץ .env.local כדי להפעיל את העוזר החכם.`,
      });
    }

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: anthropicKey,
    });

    console.log('🤖 Calling Claude API...');
    console.log('📊 Context length:', productsContext?.length || 0);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        ...(history || []).map((h: any) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        {
          role: 'user',
          content: `${message}

${productsContext ? `מידע על מוצרים מהחנות:\n${productsContext}` : ''}

החזר תשובה בפורמט JSON בלבד.`,
        },
      ],
    });
    
    console.log('✅ Claude response received');

    // Parse the response
    const assistantContent = response.content[0];
    if (assistantContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    console.log('🤖 Raw Claude response:', assistantContent.text.substring(0, 200) + '...');

    let parsedResponse;
    try {
      // Try to extract JSON from the response
      let jsonText = assistantContent.text;
      
      // Check if JSON is truncated (starts with { but doesn't end with })
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1) {
        if (lastBrace > firstBrace) {
          // Complete JSON found
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        } else {
          // JSON is truncated - try to close it
          console.log('⚠️ JSON appears truncated, attempting to fix...');
          jsonText = jsonText.substring(firstBrace);
          // Count open braces and close them
          const openBraces = (jsonText.match(/\{/g) || []).length;
          const closeBraces = (jsonText.match(/\}/g) || []).length;
          const missing = openBraces - closeBraces;
          // Add closing braces and fix any unclosed strings/arrays
          if (jsonText.endsWith('"')) {
            jsonText += '}';
          } else if (!jsonText.endsWith('}')) {
            jsonText += '"' + '}'.repeat(missing);
          } else {
            jsonText += '}'.repeat(missing);
          }
        }
        
        console.log('📋 Extracted JSON length:', jsonText.length);
        parsedResponse = JSON.parse(jsonText);
        console.log('✅ Parsed response:', { 
          hasMessage: !!parsedResponse.message, 
          hasAction: !!parsedResponse.action,
          actionType: parsedResponse.action?.type 
        });
      } else {
        console.log('⚠️ No JSON found in response');
        parsedResponse = { message: assistantContent.text };
      }
    } catch (e: any) {
      console.error('❌ JSON parse error:', e.message);
      // If JSON parse fails, try to extract just the message field
      const messageMatch = assistantContent.text.match(/"message"\s*:\s*"([^"]+)"/);
      const actionTypeMatch = assistantContent.text.match(/"type"\s*:\s*"([^"]+)"/);
      
      if (messageMatch) {
        parsedResponse = { message: messageMatch[1], action: undefined as any };
        // If it was an update_description, extract what we can
        if (actionTypeMatch && actionTypeMatch[1] === 'update_description') {
          const descMatch = assistantContent.text.match(/"description"\s*:\s*"([\s\S]*?)(?:",|"\s*\}|"\s*$)/);
          const shortDescMatch = assistantContent.text.match(/"shortDescription"\s*:\s*"([^"]+)"/);
          const productNameMatch = assistantContent.text.match(/"productName"\s*:\s*"([^"]+)"/);
          
          parsedResponse.action = {
            type: 'update_description',
            productName: productNameMatch?.[1] || '',
            description: descMatch?.[1]?.replace(/\\n/g, '\n') || '',
            shortDescription: shortDescMatch?.[1] || ''
          };
          console.log('🔧 Reconstructed update_description action from truncated JSON');
        }
      } else {
        parsedResponse = { message: 'קיבלתי את הבקשה. איך אוכל לעזור?' };
      }
    }

    // Handle ANY price-related action from Claude - we build the real action ourselves
    console.log('🔍 Checking action processing:', { 
      hasAction: !!parsedResponse.action, 
      actionType: parsedResponse.action?.type,
      productsCount: allProducts.length 
    });
    
    // Check if this is a convert_to_sale action
    const isConvertToSaleAction = parsedResponse.action?.type === 'convert_to_sale';
    
    // Check if this is a price update action (any type that involves price changes)
    const isPriceAction = parsedResponse.action && (
      parsedResponse.action.type === 'price_update' ||
      parsedResponse.action.type === 'price_change_request' ||
      parsedResponse.action.type === 'bulk_update_price' ||
      parsedResponse.action.changeAmount ||
      parsedResponse.action.details?.changeAmount
    );
    
    // Handle convert_to_sale action
    if (isConvertToSaleAction) {
      try {
        console.log('🔄 Processing convert_to_sale action:', parsedResponse.action);
        
        const regularPriceIncrease = parsedResponse.action.regularPriceIncrease || 500;
        let filterWidth = parsedResponse.action.filterWidth || 'all';
        
        // Get product
        let selectedProduct = allProducts[0];
        if (!selectedProduct) {
          const productName = parsedResponse.action.productName || '';
          if (productName) {
            const searchResults = await searchProducts(wooCredentials, productName);
            selectedProduct = searchResults[0];
          }
          if (!selectedProduct) {
            const productPatterns = ['diana', 'דיאנה', 'מזנון'];
            for (const pattern of productPatterns) {
              if (message.toLowerCase().includes(pattern)) {
                const results = await searchProducts(wooCredentials, pattern);
                if (results.length > 0) {
                  selectedProduct = results[0];
                  break;
                }
              }
            }
          }
        }
        
        if (selectedProduct) {
          const { product, variations } = await getProductWithVariations(wooCredentials, selectedProduct.id);
          
          let targetVariations = variations;
          if (filterWidth !== 'all') {
            targetVariations = variations.filter((v: any) => {
              const widthAttr = v.attributes.find((a: any) => 
                a.name.includes('רוחב') || a.name.toLowerCase().includes('width')
              );
              return widthAttr?.option?.includes(filterWidth);
            });
          }
          
          // Build variations: current regular becomes sale, new regular = current + increase
          const realVariations = targetVariations.map((v: any) => {
            const color = v.attributes.find((a: any) => a.name.includes('צבע'))?.option || '';
            const width = v.attributes.find((a: any) => a.name.includes('רוחב'))?.option || '';
            const currentRegularPrice = parseInt(v.regular_price) || parseInt(v.price) || 0;
            const newSalePrice = currentRegularPrice;
            const newRegularPrice = currentRegularPrice + regularPriceIncrease;
            
            return {
              variationId: v.id,
              variationName: `${color}${width ? ', ' + width : ''}`.trim() || `וריאציה ${v.id}`,
              currentRegularPrice: currentRegularPrice.toString(),
              newRegularPrice: newRegularPrice.toString(),
              newSalePrice: newSalePrice.toString()
            };
          });
          
          const filterDesc = filterWidth !== 'all' ? ` (${filterWidth} ס"מ)` : '';
          
          parsedResponse.action = {
            type: 'convert_to_sale',
            description: `להפוך מחיר רגיל למבצע ולהעלות ב-${regularPriceIncrease} ₪`,
            details: {
              productId: product.id,
              productName: product.name,
              regularPriceIncrease,
              variations: realVariations
            }
          };
          
          parsedResponse.message = `מציע להפוך את המחיר הרגיל למחיר מבצע ולהעלות את המחיר הרגיל ב-${regularPriceIncrease} ₪ ל-${realVariations.length} וריאציות של ${product.name}${filterDesc}:\n\n` +
            realVariations.slice(0, 5).map((v: any) => `• ${v.variationName}:\n  מחיר רגיל: ${v.currentRegularPrice} ₪ → ${v.newRegularPrice} ₪\n  מחיר מבצע: ${v.newSalePrice} ₪`).join('\n') +
            (realVariations.length > 5 ? `\n... ועוד ${realVariations.length - 5} וריאציות` : '');
        }
      } catch (e) {
        console.error('Error building convert_to_sale action:', e);
      }
    }
    // Handle regular price update action
    else if (isPriceAction) {
      try {
        console.log('🎯 Processing action from Claude:', parsedResponse.action);
        
        // Get change amount - could be in different places
        let changeAmount = 
          parsedResponse.action.changeAmount ||
          parsedResponse.action.details?.changeAmount ||
          0;
        if (typeof changeAmount === 'string') {
          changeAmount = parseInt(changeAmount.replace(/[^-\d]/g, '')) || 0;
        }
        
        // Get direction
        const direction = 
          parsedResponse.action.changeDirection ||
          parsedResponse.action.details?.changeDirection ||
          'increase';
        
        // Get price type (regular or sale)
        const priceType = 
          parsedResponse.action.priceType ||
          parsedResponse.action.details?.priceType ||
          'regular';
        
        // Get filter width
        let filterWidth = 
          parsedResponse.action.filterWidth ||
          parsedResponse.action.details?.filter?.value ||
          parsedResponse.action.details?.filterWidth ||
          'all';
        
        // Also try to extract width from user message
        const widthFromMessage = message.match(/(\d+)\s*(?:ס[״"]?מ|cm)/i)?.[1];
        if (widthFromMessage && filterWidth === 'all') {
          filterWidth = widthFromMessage;
        }
        
        console.log('🔧 Parsed: amount=', changeAmount, 'direction=', direction, 'priceType=', priceType, 'width=', filterWidth);
        
        console.log('🔧 Parsed: amount=', changeAmount, 'direction=', direction, 'width=', filterWidth);
        
        if (changeAmount > 0) {
          // Get the product - either from allProducts or search by name
          let selectedProduct = allProducts[0];
          
          if (!selectedProduct) {
            // Try to get product name from Claude's action or response
            const productName = 
              parsedResponse.action.productName ||
              parsedResponse.action.details?.productName ||
              parsedResponse.productName ||
              '';
            
            console.log('🔎 No products loaded, searching for:', productName);
            
            if (productName) {
              const searchResults = await searchProducts(wooCredentials, productName);
              selectedProduct = searchResults[0];
              console.log('📦 Found product:', selectedProduct?.name || 'None');
            }
            
            // If still no product, try to extract from the message
            if (!selectedProduct) {
              const productPatterns = ['diana', 'דיאנה', 'מזנון'];
              for (const pattern of productPatterns) {
                if (message.toLowerCase().includes(pattern)) {
                  console.log('🔎 Trying pattern search:', pattern);
                  const results = await searchProducts(wooCredentials, pattern);
                  if (results.length > 0) {
                    selectedProduct = results[0];
                    console.log('📦 Found by pattern:', selectedProduct.name);
                    break;
                  }
                }
              }
            }
          }
          
          if (!selectedProduct) {
            throw new Error('לא נמצא מוצר לעדכון');
          }
          
          const { product, variations } = await getProductWithVariations(wooCredentials, selectedProduct.id);
          
          console.log(`📦 Got ${variations.length} variations for ${product.name}`);
          
          if (variations.length > 0) {
            // Filter by width if needed
            let targetVariations = variations;
            if (filterWidth !== 'all') {
              targetVariations = variations.filter((v: any) => {
                const widthAttr = v.attributes.find((a: any) => 
                  a.name.includes('רוחב') || a.name.toLowerCase().includes('width')
                );
                return widthAttr?.option?.includes(filterWidth);
              });
              console.log(`🔍 Filtered to ${targetVariations.length} variations with width "${filterWidth}"`);
            }
            
            // Build the variations array with REAL IDs
            // Use sale_price if updating sale price and it exists, otherwise regular_price
            const realVariations = targetVariations.map((v: any) => {
              const color = v.attributes.find((a: any) => a.name.includes('צבע'))?.option || '';
              const width = v.attributes.find((a: any) => a.name.includes('רוחב'))?.option || '';
              
              // Get the right price based on priceType
              let oldPrice: number;
              if (priceType === 'sale') {
                oldPrice = parseInt(v.sale_price) || parseInt(v.price) || 0;
              } else {
                oldPrice = parseInt(v.regular_price) || parseInt(v.price) || 0;
              }
              
              const actualChange = direction === 'decrease' ? -changeAmount : changeAmount;
              const newPrice = Math.max(0, oldPrice + actualChange);
              
              return {
                variationId: v.id,
                variationName: `${color}${width ? ', ' + width : ''}`.trim() || `וריאציה ${v.id}`,
                oldPrice: oldPrice.toString(),
                newPrice: newPrice.toString()
              };
            });
            
            console.log('✅ Built', realVariations.length, 'variations with IDs:', realVariations.slice(0, 3).map((v: any) => v.variationId));
            
            // Build the final action for execute API
            const changeSign = direction === 'decrease' ? '-' : '+';
            const filterDesc = filterWidth !== 'all' ? ` (${filterWidth} ס"מ)` : '';
            const priceTypeText = priceType === 'sale' ? 'מחיר מבצע' : 'מחיר רגיל';
            const directionText = direction === 'decrease' ? 'להוריד' : 'להעלות';
            
            parsedResponse.action = {
              type: 'bulk_update_price',
              description: `${directionText} ${priceTypeText} ב-${changeAmount} ₪`,
              details: {
                productId: product.id,
                productName: product.name,
                changeAmount: `${changeSign}${changeAmount}`,
                priceType: priceType,
                variations: realVariations
              }
            };
            
            parsedResponse.message = `מציע ${directionText} את ה${priceTypeText} ב-${changeAmount} ₪ ל-${realVariations.length} וריאציות של ${product.name}${filterDesc}:\n\n` +
              realVariations.slice(0, 5).map((v: any) => `• ${v.variationName}: ${v.oldPrice} ₪ → ${v.newPrice} ₪`).join('\n') +
              (realVariations.length > 5 ? `\n... ועוד ${realVariations.length - 5} וריאציות` : '');
          }
        }
      } catch (e) {
        console.error('Error building action:', e);
      }
    }

    // Handle update_description action
    if (parsedResponse.action?.type === 'update_description') {
      try {
        console.log('📝 Processing update_description action:', JSON.stringify(parsedResponse.action).substring(0, 200));
        
        // Get product
        let selectedProduct = allProducts[0];
        console.log('📦 Selected product from allProducts:', selectedProduct?.name || 'none');
        
        if (!selectedProduct) {
          const productName = parsedResponse.action.productName || '';
          console.log('🔎 Searching for product by name:', productName);
          if (productName) {
            const searchResults = await searchProducts(wooCredentials, productName);
            selectedProduct = searchResults[0];
            console.log('📦 Found product:', selectedProduct?.name || 'none');
          }
        }
        
        if (selectedProduct) {
          // Get current product details
          const { product } = await getProductWithVariations(wooCredentials, selectedProduct.id);
          
          // Store the new description from Claude before overwriting action
          const newDesc = parsedResponse.action.description || '';
          const newShortDesc = parsedResponse.action.shortDescription || '';
          const metaTitle = parsedResponse.action.metaTitle || '';
          const metaDesc = parsedResponse.action.metaDescription || '';
          
          parsedResponse.action = {
            type: 'update_description',
            description: 'עדכון תיאור מוצר',
            details: {
              productId: product.id,
              productName: product.name,
              currentDescription: product.description || '',
              currentShortDescription: product.short_description || '',
              newDescription: newDesc,
              newShortDescription: newShortDesc,
              metaTitle: metaTitle,
              metaDescription: metaDesc
            }
          };
          
          // Build preview message - clean and readable
          const cleanDesc = newDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          parsedResponse.message = `📝 **תיאור חדש מוצע ל-${product.name}:**\n\n` +
            `**תיאור קצר:**\n${newShortDesc || '(לא הוגדר)'}\n\n` +
            `**תיאור מלא (תקציר):**\n${cleanDesc.substring(0, 400)}${cleanDesc.length > 400 ? '...' : ''}\n\n` +
            `**SEO:**\n• כותרת: ${metaTitle || '(לא הוגדר)'}\n• תיאור מטא: ${metaDesc || '(לא הוגדר)'}`;
            
          console.log('✅ Built update_description action and message');
        } else {
          // No product found - just show Claude's message without action
          console.log('⚠️ No product found for update_description');
          parsedResponse.action = undefined;
        }
      } catch (e) {
        console.error('Error building update_description action:', e);
      }
    }

    // Filter out unknown action types - only allow valid ones
    const validActionTypes = ['price_update', 'bulk_update_price', 'convert_to_sale', 'update_description'];
    if (parsedResponse.action && !validActionTypes.includes(parsedResponse.action.type)) {
      console.log('⚠️ Ignoring unknown action type:', parsedResponse.action.type);
      parsedResponse.action = undefined;
    }

    // Final cleanup - ensure message is not JSON-like
    let finalMessage = parsedResponse.message || '';
    if (finalMessage.trim().startsWith('{') && finalMessage.trim().endsWith('}')) {
      // Message looks like raw JSON - try to extract just the message field
      try {
        const parsed = JSON.parse(finalMessage);
        finalMessage = parsed.message || 'קיבלתי את הבקשה. איך אוכל לעזור?';
      } catch {
        // Not valid JSON, keep as is
      }
    }

    return NextResponse.json({
      message: finalMessage,
      action: parsedResponse.action ? {
        ...parsedResponse.action,
        status: 'pending',
      } : undefined,
    });

  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
