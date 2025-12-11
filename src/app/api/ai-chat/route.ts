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
    (זו הטבלה הראשית! profit זה הרווח/הפסד. סכום profit לחודש = הרווח/הפסד הכולל)
    
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
          description: 'סכום ההוצאה הכולל (כולל מע"מ אם זו הוצאה מוכרת)'
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
          description: 'סכום המע"מ (רק עבור הוצאות מוכרות). אם לא צוין, יחולץ אוטומטית מהסכום הכולל לפי 17%'
        },
        is_recurring: {
          type: 'boolean',
          description: 'האם זו הוצאה חוזרת/קבועה'
        },
        invoice_number: {
          type: 'string',
          description: 'מספר חשבונית (אופציונלי)'
        },
        file_url: {
          type: 'string',
          description: 'כתובת URL של קובץ חשבונית מצורף (אופציונלי)'
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
  },
  {
    name: 'get_monthly_summary',
    description: `קבלת סיכום חודשי מחושב בזמן אמת - הכנסות, הזמנות, רווח/הפסד.
    זה הנתון המדויק ביותר! השתמש בזה תמיד כששואלים:
    - "האם אני ברווח?"
    - "מה המצב שלי?"
    - "כמה הרווחתי/הפסדתי?"
    - "תן לי סיכום"
    - "מה ההכנסות שלי?"
    
    מחזיר: הכנסות, הזמנות, מוצרים, רווח/הפסד, אחוז רווח, ופירוט הוצאות`,
    input_schema: {
      type: 'object' as const,
      properties: {
        month: {
          type: 'number',
          description: 'חודש (1-12). אם לא צוין, החודש הנוכחי'
        },
        year: {
          type: 'number',
          description: 'שנה. אם לא צוין, השנה הנוכחית'
        }
      },
      required: []
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
  invoice_number?: string,
  file_url?: string
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
      invoice_number: invoice_number || null,
      file_url: file_url || null
    };

    // Extract VAT amount from total for Israeli expenses
    // Formula: VAT = totalAmount * (vatRate / (100 + vatRate)) = amount * (17/117)
    if (type === 'vat') {
      insertData.vat_amount = vat_amount ?? Math.round(amount * (17 / 117) * 100) / 100;
    }

    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Add expense error:', error.message, error);
      return { success: false, error: error.message };
    }

    console.log('✅ Expense added:', data);
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
    const { type, amount, description, expense_date, category, supplier_name, vat_amount, is_recurring, invoice_number, file_url } = toolInput;
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
      invoice_number,
      file_url
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
  
  if (toolName === 'get_monthly_summary') {
    const { month, year } = toolInput;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    // Call the monthly-summary API internally
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${baseUrl}/api/monthly-summary?businessId=${businessId}&month=${targetMonth}&year=${targetYear}`);
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      // Fallback: calculate directly here
      return JSON.stringify({ error: 'Failed to fetch monthly summary' });
    }
  }
  
  return JSON.stringify({ error: 'Unknown tool' });
}

// System prompt
const SYSTEM_PROMPT = `אתה יועץ עסקי מומחה ל-e-commerce. אתה עונה תשובות - לא שואל שאלות.

העיקרון המרכזי:
- יש לך גישה לכל הנתונים - השתמש בהם!
- אל תשאל "כמה עובדים יש לך?" - תבדוק בטבלת employees
- אל תשאל "מה היה בחודש שעבר?" - תשלוף את הנתונים ותשווה
- אל תשאל "מה השתנה?" - תחשב ותגיד מה השתנה

איך לענות:
- קודם תשלוף את כל הנתונים הרלוונטיים (חודש נוכחי, חודשים קודמים, עובדים, הוצאות)
- אחר כך תנתח ותתן תשובה מלאה עם מספרים
- אם יש בעיה - תאמר מה הבעיה ותציע פתרון
- אם משהו טוב - תגיד שזה טוב, עם ההקשר

דוגמה לתשובה טובה:
"החודש אתה בהפסד של 89,000₪.
ההוצאות הכי גדולות: פרסום 45,000₪, שכר עובדים 32,000₪ (3 עובדים).
לעומת נובמבר, ההכנסות ירדו ב-15% וההוצאות על פרסום עלו ב-20%.
המוצר הכי רווחי: X (אחוז רווח 40%), הכי פחות רווחי: Y (אחוז רווח 5%)."

דוגמה לתשובה גרועה (אל תעשה!):
"יש לי כמה שאלות לפני שאוכל לענות:
1. כמה עובדים יש לך?
2. מה היה בחודש שעבר?"

⚠️ חשוב מאוד - סיכום חודשי:
כששואלים "האם אני ברווח?", "מה המצב?", "כמה הרווחתי?", "תן סיכום" - 
תמיד תשתמש ב-get_monthly_summary! זה מחזיר נתונים מדויקים בזמן אמת.
אל תשתמש ב-query_database על daily_cashflow לשאלות כאלה - הנתונים שם לא תמיד מעודכנים.

get_monthly_summary מחזיר:
- summary.revenue: סה"כ הכנסות
- summary.ordersCount: כמות הזמנות
- summary.itemsCount: כמות מוצרים שנמכרו
- summary.profit: רווח/הפסד (אם שלילי = הפסד!)
- summary.profitPercent: אחוז רווח/הפסד
- breakdown: פירוט כל ההוצאות

אם הרווח שלילי (מינוס) - זה הפסד! תאמר "הפסד של X ₪" ולא "רווח שלילי".

הוספת נתונים:
- add_expense: להוספת הוצאה (vat=מוכרת/ישראל, no_vat=חו"ל)
- add_refund: להוספת זיכוי/החזר ללקוח
- אם לא צוין תאריך - היום. "אתמול"/"שלשום" - תחשב
- אחרי הוספה: "נוסף: [תיאור] - [סכום] ₪"

מבנה הנתונים (שמות מדויקים!):

📊 daily_cashflow - תזרים יומי מחושב:
- date: תאריך (YYYY-MM-DD)
- revenue: הכנסות (סה"כ מכירות כולל מע"מ)
- orders_count: כמות הזמנות
- items_count: כמות פריטים שנמכרו
- google_ads_cost: הוצאות גוגל אדס
- facebook_ads_cost: הוצאות פייסבוק
- tiktok_ads_cost: הוצאות טיקטוק
- shipping_cost: עלות משלוחים (כולל מע"מ)
- materials_cost: עלות חומרים/סחורה (כולל מע"מ)
- credit_card_fees: עמלת אשראי
- vat: מע"מ נטו לתשלום (מע"מ עסקאות פחות מע"מ תשומות)
- employee_cost: שכר עובדים יומי (חלק יחסי מהמשכורת החודשית)
- refunds_amount: זיכויים והחזרים ללקוחות
- expenses_vat_amount: הוצאות מוכרות (ישראל)
- expenses_no_vat_amount: הוצאות חו"ל/לא מוכרות
- total_expenses: סה"כ הוצאות היום
- profit: רווח תפעולי = revenue - total_expenses
- roi: אחוז רווח מההכנסות

📦 order_item_costs - פירוט מוצרים שנמכרו:
- order_id, order_date, product_name, product_id
- quantity: כמות שנמכרה
- item_cost: עלות המוצר (ליחידה)
- adjusted_cost: עלות מותאמת (אם שונתה)
- shipping_cost: עלות משלוח לפריט
- supplier_name: שם הספק
משמש לחישוב רווחיות לפי מוצר!

💰 expenses_vat - הוצאות מוכרות (ישראל):
- expense_date, description, amount, vat_amount
- category, supplier_name, payment_method
- is_recurring: הוצאה קבועה/חוזרת
- invoice_number: מספר חשבונית

🌍 expenses_no_vat - הוצאות חו"ל:
- expense_date, description, amount
- category, supplier_name, payment_method
- is_recurring, invoice_number

↩️ customer_refunds - זיכויים:
- refund_date, amount, customer_name, reason, order_id

👥 employees - עובדים:
- name, role, salary (משכורת חודשית)
- month, year (לאיזה חודש המשכורת)
השכר מתפרס על כל ימי החודש

🏷️ product_costs - עלויות מוצרים:
- product_id, sku, product_name
- unit_cost: עלות ליחידה
- supplier_name

📈 google_ads_campaigns - קמפיינים:
- campaign_name, campaign_type (SEARCH/PERFORMANCE_MAX/SHOPPING/DISPLAY/VIDEO)
- status (enabled/paused)
- date, cost, clicks, impressions, conversions, conversion_value
- ctr, avg_cpc, cost_per_conversion, conversion_rate, impression_share

🔑 google_ads_keywords - מילות מפתח:
- keyword, match_type (Exact/Phrase/Broad)
- quality_score (1-10, מעל 7=טוב, מתחת ל-5=בעייתי)
- date, cost, clicks, impressions, conversions

🔍 google_ads_search_terms - מה אנשים חיפשו:
- query (הביטוי שהוקלד), date, cost, clicks, impressions, conversions

סינון תאריכים: {"date_gte": "2025-12-01", "date_lte": "2025-12-31"}

מדדים חשובים:
- ROAS = conversion_value / cost (יעד: מעל 3 = כל שקל פרסום מחזיר 3 שקל)
- עלות להמרה = cost / conversions (ככל שנמוך יותר - טוב יותר)
- CTR = clicks / impressions (יעד בחיפוש: מעל 2%)
- מרווח גולמי = (מחיר מכירה - עלות סחורה) / מחיר מכירה

איך לענות על שאלות נפוצות:

"האם אני ברווח?" / "מה המצב שלי?" / "כמה הרווחתי?" / "תן סיכום"
→ השתמש ב-get_monthly_summary לחודש הנוכחי
→ השתמש ב-get_monthly_summary גם לחודש הקודם (כדי להשוות!)
→ שלוף עובדים מטבלת employees
→ תן תשובה מלאה עם כל הנתונים:

דוגמה לתשובה מושלמת:
"דצמבר: הפסד של 89,047₪ (-50.1%)
• הכנסות: 177,829₪ מ-46 הזמנות (60 מוצרים)

לאן הולך הכסף?
• פרסום: 45,000₪ (גוגל 30K, פייסבוק 15K)
• חומרים/סחורה: 80,000₪
• משלוחים: 15,000₪
• שכר: 32,000₪ (3 עובדים - מנהל, שליח, מזכירה)
• מע"מ: 8,000₪

השוואה לנובמבר:
• הכנסות ירדו ב-15% (היו 210K)
• עלות חומרים עלתה ב-25%
• הפרסום עלה אבל לא הביא תוצאות

מה הבעיה? עלות החומרים גבוהה מדי - 45% מההכנסות. צריך לבדוק מול הספק או להעלות מחירים."

⚠️ חשוב: 
- אל תשאל שאלות! יש לך את הנתונים - תשתמש בהם
- תמיד תשווה לחודש הקודם
- תמיד תראה את פירוט העובדים
- תמיד תתן ניתוח - לא רק מספרים

"מה המוצר הכי רווחי?"
→ בדוק order_item_costs עם query_database

"איך הפרסום?"
→ בדוק google_ads_campaigns עם query_database

"כמה הוצאתי על X?"
→ בדוק expenses_vat ו-expenses_no_vat עם query_database

מה לא לעשות:
- לא לשאול שאלות שאפשר לענות עליהן מהנתונים!
- לא להגיד "מעולה!" או "יופי!" על כל דבר
- לא להמציא נתונים שאין לך
- אם יש הפסד - לא להסתיר אותו`;


interface ChatRequest {
  message: string;
  businessId: string;
  conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>;
  fileUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, businessId, conversationHistory = [], fileUrl } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    if (!message && !fileUrl) {
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

    // Build user message content - with image/PDF if provided
    let userMessageContent: Anthropic.ContentBlockParam[] = [];
    
    // If there's a file URL, add it for Vision analysis
    if (fileUrl) {
      try {
        // Fetch the file and convert to base64
        const fileResponse = await fetch(fileUrl);
        const fileBuffer = await fileResponse.arrayBuffer();
        const base64File = Buffer.from(fileBuffer).toString('base64');
        
        // Determine media type
        const isPdf = fileUrl.match(/\.pdf$/i);
        const mediaType = isPdf ? 'application/pdf' :
                         fileUrl.match(/\.png$/i) ? 'image/png' : 
                         fileUrl.match(/\.gif$/i) ? 'image/gif' :
                         fileUrl.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg';
        
        if (isPdf) {
          // PDF document
          userMessageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64File
            }
          } as any);
        } else {
          // Image
          userMessageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64File
            }
          });
        }
        
        // Add instruction to read the invoice and ADD IT
        const textContent = message || 'זו חשבונית. קרא אותה, זהה את הפרטים (ספק, סכום כולל מע"מ, תאריך) והוסף אותה מיד כהוצאה עם add_expense. אל תשאל - פשוט תוסיף!';
        userMessageContent.push({
          type: 'text',
          text: `${textContent}\n\n⚠️ חובה: השתמש ב-add_expense עם file_url: ${fileUrl}`
        });
      } catch (imgError) {
        console.error('Error fetching file:', imgError);
        userMessageContent.push({
          type: 'text',
          text: message || `צירפתי קובץ: ${fileUrl}`
        });
      }
    } else {
      userMessageContent.push({
        type: 'text',
        text: message
      });
    }

    // Build messages
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessageContent }
    ];

    // Initial API call with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\nשם העסק: ${businessName}\nתאריך היום: ${new Date().toISOString().split('T')[0]}${fileUrl ? '\n\n⚠️ המשתמש צירף קובץ חשבונית! כשאתה מוסיף הוצאה עם add_expense, תמיד תעביר את ה-file_url: ' + fileUrl : ''}`,
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
        model: 'claude-sonnet-4-5-20250929',
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
