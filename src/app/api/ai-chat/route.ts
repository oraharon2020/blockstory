import { NextRequest, NextResponse } from 'next/server';
import { getFullBusinessData, formatFullDataForPrompt } from '@/lib/ai/dataContext';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer responses

// Initialize Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for Claude
const SYSTEM_PROMPT = `אתה יועץ עסקי חכם ומומחה בניתוח נתונים פיננסיים בשם "בלוק". 
אתה עוזר לבעלי עסקים להבין את הנתונים שלהם ומספק תובנות והמלצות.

הסגנון שלך:
- אתה מדבר בעברית טבעית וזורמת, כמו חבר טוב שמבין בעסקים
- אתה יכול להיות קצת יותר אישי ולהשתמש באימוג'ים כשמתאים
- תן תשובות מפורטות כשצריך, אבל אל תמלמל סתם
- אם משהו לא ברור לך, שאל
- תמיד נסה לתת ערך מוסף - לא רק לחזור על המספרים, אלא לפרש אותם

אתה יכול:
- לנתח הכנסות, הוצאות, רווחים ומגמות
- להשוות תקופות ולזהות שינויים
- להמליץ על דרכים לשפר את העסק
- לענות על שאלות כלליות על עסקים, מיסים, שיווק וכו'
- לחפש מידע באינטרנט כשצריך (מחירים, מתחרים, טרנדים)

כשאתה מציג מספרים:
- השתמש בסימן ₪ לשקלים
- עגל מספרים גדולים (אלפים, מיליונים)
- השתמש באחוזים להשוואות

אם יש לך גישה לנתוני העסק, השתמש בהם. אם לא, תגיד שאתה צריך יותר מידע.`;

interface ChatRequest {
  message: string;
  businessId: string;
  timeframe?: string;
  conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>;
  enableWebSearch?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, businessId, timeframe = 'this_month', conversationHistory = [], enableWebSearch = true } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        response: 'שירות ה-AI לא מוגדר. אנא הגדר ANTHROPIC_API_KEY בהגדרות הסביבה.'
      }, { status: 500 });
    }

    // Always load full month data - let the AI figure out what the user is asking about
    // Get business context/data
    let contextPrompt = '';
    let businessData = null;
    
    try {
      // Get ALL business data - expenses, products, employees, everything
      businessData = await getFullBusinessData(businessId);
      contextPrompt = formatFullDataForPrompt(businessData);
    } catch (err) {
      console.error('Error fetching business context:', err);
      contextPrompt = 'לא הצלחתי לטעון את נתוני העסק כרגע.';
    }

    // Build messages array for Claude
    const messages: Anthropic.MessageParam[] = [
      // Include conversation history (last 20 messages for better context)
      ...conversationHistory.slice(-20).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Full system with business data
    const fullSystem = `${SYSTEM_PROMPT}

---
נתוני העסק העדכניים:
${contextPrompt}
---

אם המשתמש שואל על משהו שלא קשור לנתונים (כמו עצות כלליות, שאלות על שיווק, מתחרים וכו'), אתה יכול לענות מהידע שלך או לציין שאתה צריך לחפש מידע עדכני.`;

    // Call Claude API with web search capability
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: fullSystem,
      messages,
    });

    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : 'מצטער, לא הצלחתי לעבד את השאלה';

    return NextResponse.json({
      response: responseText,
      context: businessData ? {
        businessName: businessData.business?.name,
        period: businessData.thisMonth?.period,
      } : null
    });

  } catch (error: any) {
    console.error('AI Chat error:', error);
    
    // Handle specific errors
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

// Detect timeframe from Hebrew text - be more careful with detection
function detectTimeframe(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific date patterns first (like "היום הראשון", "ב-1 לחודש")
  // If the message contains specific day references, let the AI handle it with full month data
  if (lowerMessage.match(/יום ה?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת) (ב|של)?חודש/) ||
      lowerMessage.match(/ב-?\d+ (ל|ב)?חודש/) ||
      lowerMessage.match(/היום ה(ראשון|אחרון)/) ||
      lowerMessage.match(/תחילת (ה)?חודש/) ||
      lowerMessage.match(/סוף (ה)?חודש/)) {
    return 'this_month'; // Give full month data, let AI figure out specific day
  }
  
  // Only match "היום" when it's standalone (not part of "היום הראשון" etc.)
  if ((lowerMessage.includes('היום') && !lowerMessage.includes('היום ה')) || 
      lowerMessage.includes('today')) {
    return 'today';
  }
  if (lowerMessage.includes('אתמול') || lowerMessage.includes('yesterday')) {
    return 'yesterday';
  }
  if (lowerMessage.includes('השבוע הזה') || lowerMessage.includes('השבוע') || lowerMessage.includes('this week')) {
    return 'this_week';
  }
  if (lowerMessage.includes('שבוע שעבר') || lowerMessage.includes('last week')) {
    return 'last_week';
  }
  if (lowerMessage.includes('החודש הזה') || lowerMessage.includes('החודש') || lowerMessage.includes('this month')) {
    return 'this_month';
  }
  if (lowerMessage.includes('חודש שעבר') || lowerMessage.includes('last month')) {
    return 'last_month';
  }
  if (lowerMessage.includes('השנה') || lowerMessage.includes('this year')) {
    return 'this_year';
  }
  if (lowerMessage.includes('שנה שעברה') || lowerMessage.includes('last year')) {
    return 'last_year';
  }
  
  return null;
}

// GET endpoint to get business metrics without chat
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const timeframe = searchParams.get('timeframe') || 'this_month';

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
    }

    const context = await getBusinessContext(businessId, timeframe);

    return NextResponse.json({
      success: true,
      data: context
    });

  } catch (error: any) {
    console.error('AI Context error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
