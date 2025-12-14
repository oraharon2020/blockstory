/**
 * AI Assistant - Pilot Module
 * 
 * מודול פיילוט - עוזר AI לניהול מוצרים
 * ניתן למחיקה קלה בעתיד
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bot, 
  Send, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: PendingAction;
}

interface PendingAction {
  type: 'update_price' | 'add_variation' | 'update_stock' | 'add_product' | 'delete_variation';
  description: string;
  details: {
    productId?: number;
    productName?: string;
    variationId?: number;
    variationName?: string;
    field?: string;
    oldValue?: string | number;
    newValue?: string | number;
    additionalInfo?: Record<string, any>;
  };
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  error?: string;
}

export default function AIAssistantPage() {
  const { currentBusiness } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `שלום! 👋 אני העוזר החכם שלך לניהול מוצרים באתר.

אני יכול לעזור לך ב:
• 💰 שינוי מחירים (כולל וריאציות)
• 📦 עדכון מלאי
• ➕ הוספת וריאציות חדשות
• 🖼️ העלאת תמונות

**חשוב:** לפני כל פעולה, אציג לך בדיוק מה אני הולך לעשות ותצטרך לאשר.

נסה לכתוב משהו כמו:
"תשנה את המחיר של מזנון Venice ל-3500 ש״ח"`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          businessId: currentBusiness?.id,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      console.log('📥 Chat API response:', { message: data.message?.substring(0, 100), hasAction: !!data.action, actionType: data.action?.type });

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בתקשורת עם העוזר');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        action: data.action,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ שגיאה: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionApproval = async (messageId: string, approved: boolean) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || !messages[messageIndex].action) return;

    const action = messages[messageIndex].action!;
    
    // Update action status
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, action: { ...m.action!, status: approved ? 'executing' : 'rejected' } }
        : m
    ));

    if (!approved) {
      const rejectMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ הפעולה בוטלה. אפשר לנסות משהו אחר?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, rejectMessage]);
      return;
    }

    // Execute the action
    try {
      console.log('📤 Sending to execute:', { action, businessId: currentBusiness?.id });
      
      const response = await fetch('/api/ai-assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          businessId: currentBusiness?.id,
        }),
      });

      const data = await response.json();
      console.log('📥 Execute response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בביצוע הפעולה');
      }

      // Update action status to completed
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, action: { ...m.action!, status: 'completed' } }
          : m
      ));

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ ${data.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, action: { ...m.action!, status: 'failed', error: error.message } }
          : m
      ));

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ שגיאה בביצוע: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'update_price': return <DollarSign className="w-5 h-5" />;
      case 'add_variation': return <Plus className="w-5 h-5" />;
      case 'update_stock': return <Package className="w-5 h-5" />;
      case 'add_product': return <Plus className="w-5 h-5" />;
      case 'delete_variation': return <Trash2 className="w-5 h-5" />;
      default: return <Edit className="w-5 h-5" />;
    }
  };

  const getActionColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-300 bg-yellow-50';
      case 'approved': 
      case 'executing': return 'border-blue-300 bg-blue-50';
      case 'completed': return 'border-green-300 bg-green-50';
      case 'rejected': return 'border-gray-300 bg-gray-50';
      case 'failed': return 'border-red-300 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  if (!currentBusiness) {
    return (
      <div className="max-w-2xl mx-auto p-8" dir="rtl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">לא נבחרה חנות</h2>
          <p className="text-yellow-700">בחר חנות מהתפריט בראש הדף</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                עוזר AI לניהול מוצרים
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">PILOT</span>
              </h1>
              <p className="text-sm text-gray-500">שנה מחירים, הוסף וריאציות ועוד - בשפה טבעית</p>
            </div>
          </div>
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה
          </Link>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">מודול פיילוט</h3>
            <p className="text-sm text-amber-700">
              זהו מודול ניסיוני. כל פעולה תדרוש אישור שלך לפני ביצוע. 
              בדוק היטב את הפרטים לפני אישור.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                
                {/* Action Card */}
                {message.action && (
                  <div className={`mt-3 border-2 rounded-xl p-4 ${getActionColor(message.action.status)}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg ${
                        message.action.status === 'pending' ? 'bg-yellow-200 text-yellow-700' :
                        message.action.status === 'completed' ? 'bg-green-200 text-green-700' :
                        message.action.status === 'failed' ? 'bg-red-200 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {getActionIcon(message.action.type)}
                      </div>
                      <span className="font-semibold text-gray-800">{message.action.description}</span>
                    </div>
                    
                    {/* Action Details */}
                    <div className="bg-white/70 rounded-lg p-3 mb-3 text-sm space-y-1">
                      {message.action.details?.productName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">מוצר:</span>
                          <span className="font-medium">{message.action.details.productName}</span>
                        </div>
                      )}
                      {message.action.details?.variationName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">וריאציה:</span>
                          <span className="font-medium">{message.action.details.variationName}</span>
                        </div>
                      )}
                      {message.action.details?.oldValue !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ערך נוכחי:</span>
                          <span className="font-medium text-gray-500">{message.action.details.oldValue}</span>
                        </div>
                      )}
                      {message.action.details?.newValue !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ערך חדש:</span>
                          <span className="font-medium text-green-600">{message.action.details.newValue}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {message.action.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActionApproval(message.id, true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          אשר ובצע
                        </button>
                        <button
                          onClick={() => handleActionApproval(message.id, false)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          בטל
                        </button>
                      </div>
                    )}

                    {/* Status Indicators */}
                    {message.action.status === 'executing' && (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        מבצע...
                      </div>
                    )}
                    {message.action.status === 'completed' && (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        בוצע בהצלחה!
                      </div>
                    )}
                    {message.action.status === 'rejected' && (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <XCircle className="w-4 h-4" />
                        בוטל
                      </div>
                    )}
                    {message.action.status === 'failed' && (
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        נכשל: {message.action.error}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder='כתוב פקודה... לדוגמה: "שנה מחיר למזנון X ל-2990"'
              className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">
            💡 טיפ: נסה "הצג את כל המוצרים" או "מה המחיר של מזנון Venice?"
          </div>
        </div>
      </div>
    </div>
  );
}
