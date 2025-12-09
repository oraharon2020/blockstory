import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the database query tool
const tools: Anthropic.Tool[] = [
  {
    name: 'query_database',
    description: `Query the business database. Available tables and their EXACT columns:
    
    - daily_cashflow: id, date, revenue, orders_count, items_count, google_ads_cost, facebook_ads_cost, tiktok_ads_cost, shipping_cost, materials_cost, credit_card_fees, vat, employee_cost (שכר עובדים יומי), refunds_amount (זיכויים), expenses_vat_amount (הוצאות מוכרות), expenses_no_vat_amount (הוצאות חו"ל), total_expenses, profit, roi, business_id, created_at, updated_at
    
    - order_item_costs: id, order_id, line_item_id, product_id, product_name, item_cost, quantity, adjusted_cost, shipping_cost, order_date, supplier_name, supplier_id, variation_key, variation_attributes, is_ready, notes, business_id, updated_at
    (פרטי כל פריט שנמכר - שים לב: אין item_price, יש item_cost שזה עלות המוצר)
    
    - expenses_vat: id, expense_date, description, amount, vat_amount, category, supplier_name, payment_method, is_recurring, invoice_number, business_id, created_at
    (הוצאות מוכרות עם מע"מ)
    
    - expenses_no_vat: id, expense_date, description, amount, category, supplier_name, payment_method, is_recurring, invoice_number, business_id, created_at
    (הוצאות חו"ל/לא מוכרות)
    
    - customer_refunds: id, refund_date, description, amount, order_id, customer_name, reason, business_id, created_at, updated_at
    (זיכויים/החזרים)
    
    - employees: id, name, role, salary (=משכורת חודשית), month, year, notes, business_id, created_at, updated_at
    (עובדים - salary זו המשכורת החודשית)
    
    - product_costs: id, product_id, sku, product_name, unit_cost (=עלות יחידה), supplier_name, business_id, updated_at
    (עלויות מוצרים - unit_cost היא עלות המוצר)
    
    - google_ads_campaigns: campaign_id, campaign_name, campaign_type (SEARCH/PERFORMANCE_MAX/SHOPPING/DISPLAY/VIDEO), status (enabled/paused), date, cost, clicks, impressions, conversions, conversion_value, ctr, avg_cpc, cost_per_conversion, conversion_rate, impression_share, business_id
    (ביצועי קמפיינים Google Ads - נתונים יומיים לכל קמפיין)
    
    - google_ads_keywords: campaign_id, ad_group_id, keyword, match_type (Exact/Phrase/Broad), quality_score (1-10), date, cost, clicks, impressions, conversions, ctr, avg_cpc, business_id
    (מילות מפתח Google Ads - נתונים יומיים)
    
    - google_ads_search_terms: campaign_id, query (ביטוי החיפוש שהמשתמש הקליד), date, cost, clicks, impressions, conversions, business_id
    (ביטויי חיפוש בפועל שגרמו לקליקים)
    
    - google_ads_ad_groups: campaign_id, ad_group_id, ad_group_name, status, date, cost, clicks, impressions, conversions, ctr, avg_cpc, business_id
    (קבוצות מודעות)
    
    - businesses: id, name, logo_url, is_active, created_at, created_by
    (פרטי העסק)
    
    - business_settings: id, business_id, woo_url, consumer_key, consumer_secret, vat_rate, credit_card_rate, shipping_cost, materials_rate, valid_order_statuses, manual_shipping_per_item, charge_shipping_on_free_orders, free_shipping_methods, credit_fee_mode, expenses_spread_mode, created_at, updated_at
    (הגדרות העסק - שים לב: snake_case!)
    
    IMPORTANT: Use EXACT column names as listed above!`,
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          description: 'The table to query'
        },
        select: {
          type: 'string',
          description: 'Columns to select. Use * for all, or specific columns. Can include aggregations like SUM(), COUNT(), AVG()'
        },
        filters: {
          type: 'object',
          description: 'Filter conditions as key-value pairs. Example: {"date": "2025-12-01"} or use special keys like "date_gte" for >= , "date_lte" for <='
        },
        orderBy: {
          type: 'object',
          description: 'Order by column. Example: {"column": "date", "ascending": false}'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return'
        }
      },
      required: ['table', 'select']
    }
  },
  {
    name: 'add_expense',
    description: `הוספת הוצאה חדשה למערכת. 
    השתמש בזה כשהמשתמש מבקש להוסיף/לרשום הוצאה.
    
    סוגי הוצאות:
    - vat: הוצאה מוכרת (ישראל) - כולל מע"מ
    - no_vat: הוצאה לא מוכרת (חו"ל/ללא מע"מ)
    
    קטגוריות נפוצות: פרסום, שיווק, תוכנה, שרתים, ציוד, משלוחים, שירותים, אחר
    
    דוגמאות:
    - "תוסיף הוצאה של 500 ש"ח על פרסום פייסבוק" → type: vat, amount: 500, category: פרסום
    - "הוסף הוצאה חו"ל 200 דולר שרת" → type: no_vat, amount: 200, category: שרתים`,
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['vat', 'no_vat'],
          description: 'סוג ההוצאה: vat = מוכרת (ישראל), no_vat = לא מוכרת (חו"ל)'
        },
        amount: {
          type: 'number',
          description: 'סכום ההוצאה (ללא מע"מ)'
        },
        description: {
          type: 'string',
          description: 'תיאור ההוצאה'
        },
        expense_date: {
          type: 'string',
          description: 'תאריך ההוצאה בפורמט YYYY-MM-DD. אם לא צוין, השתמש בתאריך היום'
        },
        category: {
          type: 'string',
          description: 'קטגוריה: פרסום, שיווק, תוכנה, שרתים, ציוד, משלוחים, שירותים, אחר'
        },
        supplier_name: {
          type: 'string',
          description: 'שם הספק (אופציונלי)'
        },
        vat_amount: {
          type: 'number',
          description: 'סכום המע"מ (רק עבור הוצאות מוכרות). אם לא צוין, יחושב אוטומטית לפי 17%'
        },
        is_recurring: {
          type: 'boolean',
          description: 'האם זו הוצאה חוזרת/קבועה'
        },
        invoice_number: {
          type: 'string',
          description: 'מספר חשבונית (אופציונלי)'
        }
      },
      required: ['type', 'amount', 'description']
    }
  },
  {
    name: 'add_refund',
    description: `הוספת זיכוי/החזר ללקוח.
    השתמש בזה כשהמשתמש מבקש להוסיף זיכוי או החזר.
    
    דוגמאות:
    - "תוסיף זיכוי של 150 ש"ח ללקוח יוסי על מוצר פגום"
    - "הוסף החזר 200 ש"ח"`,
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: {
          type: 'number',
          description: 'סכום הזיכוי'
        },
        description: {
          type: 'string',
          description: 'תיאור הזיכוי'
        },
        refund_date: {
          type: 'string',
          description: 'תאריך הזיכוי בפורמט YYYY-MM-DD. אם לא צוין, השתמש בתאריך היום'
        },
        customer_name: {
          type: 'string',
          description: 'שם הלקוח (אופציונלי)'
        },
        order_id: {
          type: 'string',
          description: 'מספר הזמנה (אופציונלי)'
        },
        reason: {
          type: 'string',
          description: 'סיבת הזיכוי'
        }
      },
      required: ['amount', 'description']
    }
  }
];

// Execute database query
async function executeQuery(
  businessId: string,
  table: string,
  select: string,
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending?: boolean },
  limit?: number
): Promise<any> {
  try {
    let query = supabase.from(table).select(select);
    
    // Always filter by business_id (except for businesses table)
    if (table !== 'businesses') {
      query = query.eq('business_id', businessId);
    } else {
      query = query.eq('id', businessId);
    }
    
    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (key.endsWith('_gte')) {
          query = query.gte(key.replace('_gte', ''), value);
        } else if (key.endsWith('_lte')) {
          query = query.lte(key.replace('_lte', ''), value);
        } else if (key.endsWith('_gt')) {
          query = query.gt(key.replace('_gt', ''), value);
        } else if (key.endsWith('_lt')) {
          query = query.lt(key.replace('_lt', ''), value);
        } else if (key.endsWith('_neq')) {
          query = query.neq(key.replace('_neq', ''), value);
        } else if (key.endsWith('_like')) {
          query = query.ilike(key.replace('_like', ''), `%${value}%`);
        } else if (key.endsWith('_in') && Array.isArray(value)) {
          query = query.in(key.replace('_in', ''), value);
        } else {
          query = query.eq(key, value);
        }
      }
    }
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { error: error.message, hint: 'Check column names and table structure' };
    }
    
    return { 
      data, 
      rowCount: data?.length || 0,
      query: { table, select, filters, orderBy, limit }
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Add expense to database
async function addExpense(
  businessId: string,
  type: 'vat' | 'no_vat',
  amount: number,
  description: string,
  expense_date?: string,
  category?: string,
  supplier_name?: string,
  vat_amount?: number,
  is_recurring?: boolean,
  invoice_number?: string
): Promise<any> {
  try {
    const table = type === 'vat' ? 'expenses_vat' : 'expenses_no_vat';
    const today = new Date().toISOString().split('T')[0];
    
    const insertData: any = {
      business_id: businessId,
      expense_date: expense_date || today,
      description,
      amount,
      category: category || 'אחר',
      supplier_name: supplier_name || null,
      is_recurring: is_recurring || false,
      payment_method: 'credit',
      invoice_number: invoice_number || null
    };

    // Add VAT amount for Israeli expenses (17%)
    if (type === 'vat') {
      insertData.vat_amount = vat_amount ?? Math.round(amount * 0.17 * 100) / 100;
    }

    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data,
      message: `הוצאה נוספה בהצלחה: ${description} - ${amount} ש"ח`
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Add refund to database
async function addRefund(
  businessId: string,
  amount: number,
  description: string,
  refund_date?: string,
  customer_name?: string,
  order_id?: string,
  reason?: string
): Promise<any> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const insertData: any = {
      business_id: businessId,
      refund_date: refund_date || today,
      description,
      amount,
      customer_name: customer_name || null,
      order_id: order_id || null,
      reason: reason || description
    };

    const { data, error } = await supabase
      .from('customer_refunds')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data,
      message: `זיכוי נוסף בהצלחה: ${description} - ${amount} ש"ח`
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Process tool calls
async function processToolCall(
  toolName: string,
  toolInput: any,
  businessId: string
): Promise<string> {
  if (toolName === 'query_database') {
    const { table, select, filters, orderBy, limit } = toolInput;
    const result = await executeQuery(businessId, table, select, filters, orderBy, limit);
    return JSON.stringify(result, null, 2);
  }
  
  if (toolName === 'add_expense') {
    const { type, amount, description, expense_date, category, supplier_name, vat_amount, is_recurring, invoice_number } = toolInput;
    const result = await addExpense(
      businessId,
      type,
      amount,
      description,
      expense_date,
      category,
      supplier_name,
      vat_amount,
      is_recurring,
      invoice_number
    );
    return JSON.stringify(result, null, 2);
  }
  
  if (toolName === 'add_refund') {
    const { amount, description, refund_date, customer_name, order_id, reason } = toolInput;
    const result = await addRefund(
      businessId,
      amount,
      description,
      refund_date,
      customer_name,
      order_id,
      reason
    );
    return JSON.stringify(result, null, 2);
  }
  
  return JSON.stringify({ error: 'Unknown tool' });
}

// System prompt
const SYSTEM_PROMPT = `אתה יועץ עסקי מנוסה עם גישה מלאה לנתוני העסק כולל Google Ads.
אתה יכול גם להוסיף הוצאות וזיכויים למערכת כשהמשתמש מבקש.

הגישה שלך:
- ישיר ותכליתי. לא חנפן, לא מחמיא סתם
- אם משהו לא טוב בנתונים - אמור את זה ישר
- תמיד בצד הלימוד - עזור להבין למה, לא רק מה
- שאל שאלות חכמות שיגרמו לבעל העסק לחשוב
- אם חסר מידע - תגיד, אל תמציא
- דבר בגובה העיניים, כמו חבר שמבין בעסקים

כשמציגים נתונים:
- תן את המספרים ואז תסביר מה המשמעות
- אם יש בעיה - הצע פתרון או שאל שאלה שתוביל לפתרון
- השווה לתקופות קודמות כשרלוונטי
- תן תובנות אקשנביליות, לא רק סטטיסטיקות

הוספת הוצאות וזיכויים:
- כשהמשתמש מבקש להוסיף הוצאה, השתמש ב-add_expense
- סוגי הוצאות: vat (מוכרת/ישראל) או no_vat (חו"ל/לא מוכרת)
- אם לא צוין תאריך - השתמש בתאריך היום
- אם צוין "אתמול" או "שלשום" - חשב את התאריך המתאים
- אחרי שמוסיפים הוצאה - אשר בקצרה: "נוסף: [תיאור] - [סכום] ש"ח"
- כשמבקשים זיכוי/החזר - השתמש ב-add_refund

דוגמאות למשפטים שמחייבים הוספת הוצאה:
- "תוסיף הוצאה 500 על פרסום" → add_expense(vat, 500, "פרסום")
- "הוסף 200 דולר שרת חו"ל" → add_expense(no_vat, 200, "שרת")
- "תרשום הוצאה של 1000 ש"ח על ציוד" → add_expense(vat, 1000, "ציוד")

מה לא לעשות:
- לא להגיד "מעולה!" או "יופי!" על כל דבר
- לא להתנצל יותר מדי
- לא לחזור על מה שהמשתמש אמר
- לא להוסיף אימוג'ים מיותרים בכל משפט

טבלאות בדאטהבייס (שמות מדויקים!):

daily_cashflow - תזרים יומי:
  date, revenue, orders_count, items_count, profit, total_expenses,
  google_ads_cost, facebook_ads_cost, tiktok_ads_cost,
  shipping_cost, materials_cost, vat, credit_card_fees,
  employee_cost, refunds_amount, expenses_vat_amount, expenses_no_vat_amount

order_item_costs - מוצרים שנמכרו:
  order_id, order_date, product_name, quantity, item_cost, shipping_cost, supplier_name
  (משם אפשר לחשב מכירות ורווחיות לפי מוצר!)

expenses_vat - הוצאות מוכרות:
  expense_date, description, amount, vat_amount, category, supplier_name

expenses_no_vat - הוצאות חו"ל:
  expense_date, description, amount, category, supplier_name

customer_refunds - זיכויים:
  refund_date, amount, customer_name, reason

employees - עובדים:
  name, role, salary (חודשי), month, year

product_costs - עלויות מוצרים:
  product_name, sku, unit_cost, supplier_name

google_ads_campaigns - קמפיינים Google Ads:
  campaign_id, campaign_name, campaign_type (SEARCH/PERFORMANCE_MAX/SHOPPING/DISPLAY/VIDEO),
  status, date, cost, clicks, impressions, conversions, conversion_value,
  ctr, avg_cpc, cost_per_conversion, conversion_rate, impression_share

google_ads_keywords - מילות מפתח:
  keyword, match_type (Exact/Phrase/Broad), quality_score (1-10),
  date, cost, clicks, impressions, conversions, ctr, avg_cpc

google_ads_search_terms - ביטויי חיפוש:
  query (מה אנשים הקלידו), date, cost, clicks, impressions, conversions

google_ads_ad_groups - קבוצות מודעות:
  ad_group_name, campaign_id, date, cost, clicks, impressions, conversions

סינון תאריכים: {"date_gte": "2025-12-01", "date_lte": "2025-12-31"}

יכולות ניתוח Google Ads:
- ROAS = conversion_value / cost (יעד: מעל 3)
- עלות להמרה = cost / conversions
- CTR = clicks / impressions (יעד: מעל 2% בחיפוש)
- Quality Score מעל 7 = טוב, מתחת ל-5 = בעייתי

טיפים לניתוח:
1. כדי למצוא מוצרים רווחיים - בדוק order_item_costs וחשב מכירות-עלויות
2. כדי להמליץ על קמפיין - בדוק ROAS ועלות להמרה
3. כדי למצוא מילות מפתח בעייתיות - חפש quality_score נמוך + cost גבוה
4. כדי להמליץ מה לקדם - שלב נתוני מכירות עם נתוני פרסום

אם שואלים "מה כדאי לקדם" או "איזה מוצר הכי משתלם":
1. קודם בדוק מכירות ורווחיות מ-order_item_costs
2. אם יש נתוני Google Ads - בדוק גם ROAS לפי קמפיין
3. המלץ על מוצרים עם: מכירות גבוהות + מרווח טוב + ROAS טוב (אם יש)`;

interface ChatRequest {
  message: string;
  businessId: string;
  conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, businessId, conversationHistory = [] } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        response: 'שירות ה-AI לא מוגדר. אנא הגדר ANTHROPIC_API_KEY בהגדרות הסביבה.'
      }, { status: 500 });
    }

    // Get business name for context
    const { data: businessData } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    const businessName = businessData?.name || 'העסק';

    // Build messages
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Initial API call with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\nשם העסק: ${businessName}\nתאריך היום: ${new Date().toISOString().split('T')[0]}`,
      tools,
      messages,
    });

    // Process tool calls iteratively (up to 10 iterations)
    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 10) {
      iterations++;
      
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`🔧 AI calling tool: ${toolUse.name}`, JSON.stringify(toolUse.input).substring(0, 200));
        const result = await processToolCall(toolUse.name, toolUse.input, businessId);
        console.log(`📊 Tool result rows: ${JSON.parse(result).rowCount || 0}`);
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        });
      }

      // Continue the conversation with tool results
      messages.push({
        role: 'assistant',
        content: response.content
      });
      messages.push({
        role: 'user',
        content: toolResults
      });

      // Get next response
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `${SYSTEM_PROMPT}\n\nשם העסק: ${businessName}\nתאריך היום: ${new Date().toISOString().split('T')[0]}`,
        tools,
        messages,
      });
    }

    // Extract final text response
    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : 'מצטער, לא הצלחתי לעבד את השאלה';

    return NextResponse.json({
      response: responseText,
      context: { businessName },
      toolCalls: iterations
    });

  } catch (error: any) {
    console.error('AI Chat error:', error);
    
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        response: 'שירות ה-AI לא מוגדר כראוי. בדוק את ה-API key.'
      }, { status: 500 });
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json({ 
        error: 'Rate limit',
        response: 'יש הרבה בקשות כרגע, נסה שוב בעוד רגע 😅'
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      error: error.message,
      response: 'אופס, משהו השתבש. נסה שוב 🙏'
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'AI Chat with Tool Use enabled',
    tools: tools.map(t => t.name)
  });
}
