'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  X, 
  Sparkles,
  TrendingUp,
  DollarSign,
  BarChart3,
  Lightbulb,
  Minimize2,
  Maximize2,
  RotateCcw,
  Bot,
  Camera,
  Paperclip,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileUrl?: string;
  fileName?: string;
}

interface QuickQuestion {
  text: string;
  icon: React.ReactNode;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  { text: 'איך העסק שלי?', icon: <TrendingUp className="w-3 h-3" /> },
  { text: 'מה הרווח החודש?', icon: <DollarSign className="w-3 h-3" /> },
  { text: 'השוואה לחודש שעבר', icon: <BarChart3 className="w-3 h-3" /> },
  { text: 'איפה אני יכול לחסוך?', icon: <Lightbulb className="w-3 h-3" /> },
];

interface AIChatModuleProps {
  className?: string;
  defaultMinimized?: boolean;
}

export default function AIChatModule({ className = '', defaultMinimized = true }: AIChatModuleProps) {
  const { currentBusiness } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `היי! 👋 אני בלוק, העוזר החכם שלך.

אני מכיר את כל הנתונים של העסק ואשמח לעזור לך להבין מה קורה - רווחים, הוצאות, מגמות, או כל שאלה אחרת.

במה אוכל לעזור?`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness?.id) return;

    setUploading(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', currentBusiness.id);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setUploadedFileUrl(data.fileUrl);
      } else {
        console.error('Upload error:', data.error);
        setUploadedFile(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFile(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Clear uploaded file
  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadedFileUrl(null);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if ((!messageText && !uploadedFileUrl) || loading || !currentBusiness?.id) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText || '📎 צירפתי קובץ',
      timestamp: new Date(),
      fileUrl: uploadedFileUrl || undefined,
      fileName: uploadedFile?.name
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const fileUrlToSend = uploadedFileUrl;
    clearUploadedFile();
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          businessId: currentBusiness.id,
          conversationHistory,
          enableWebSearch: true,
          fileUrl: fileUrlToSend
        })
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'סליחה, לא הבנתי. אפשר לנסח אחרת?',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'אופס, משהו השתבש 😅 נסה שוב?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `היי! 👋 אני בלוק, העוזר החכם שלך.

אני מכיר את כל הנתונים של העסק ואשמח לעזור לך להבין מה קורה - רווחים, הוצאות, מגמות, או כל שאלה אחרת.

במה אוכל לעזור?`,
      timestamp: new Date()
    }]);
  };

  // Format message content with better line breaks
  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group ${className}`}
        title="דבר עם בלוק 🤖"
      >
        <div className="relative">
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 flex flex-col ${
        isMinimized ? 'w-80 h-14' : 'w-[420px] h-[600px]'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
          </div>
          <div>
            <span className="font-medium text-sm">בלוק</span>
            <span className="text-xs text-white/70 mr-2">• יועץ עסקי AI</span>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && messages.length > 1 && (
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="שיחה חדשה"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {/* File attachment */}
                  {message.fileUrl && (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${
                        message.role === 'user' ? 'bg-white/20 hover:bg-white/30' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <ImageIcon className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-xs truncate">{message.fileName || 'קובץ מצורף'}</span>
                    </a>
                  )}
                  {formatMessage(message.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-2">💡 שאלות מהירות:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.text)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {q.icon}
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Uploaded file preview */}
            {uploadedFile && (
              <div className="mb-2 p-2 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-2">
                {uploadedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-violet-600" />
                ) : (
                  <FileText className="w-4 h-4 text-violet-600" />
                )}
                <span className="text-xs text-violet-700 flex-1 truncate">{uploadedFile.name}</span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                ) : (
                  <button
                    onClick={clearUploadedFile}
                    className="p-1 hover:bg-violet-100 rounded"
                  >
                    <X className="w-3 h-3 text-violet-600" />
                  </button>
                )}
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              {/* Attachment buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="p-2.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors disabled:opacity-50"
                  title="צלם חשבונית"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="p-2.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors disabled:opacity-50"
                  title="העלה קובץ"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFile ? "תאר את ההוצאה..." : "שאל אותי משהו..."}
                disabled={loading}
                rows={1}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 resize-none leading-normal"
                dir="rtl"
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || (!input.trim() && !uploadedFileUrl)}
                className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              📷 צלם חשבונית • 📎 העלה קובץ • Enter לשליחה
            </p>
          </div>
        </>
      )}
    </div>
  );
}
