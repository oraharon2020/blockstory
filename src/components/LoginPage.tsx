'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, User, Store, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'magic' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setError('נא להזין שם');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('נרשמת בהצלחה! בדוק את האימייל שלך לאישור.');
        }
      } else if (mode === 'magic') {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
          }
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess('נשלח לינק התחברות לאימייל שלך!');
        }
      } else if (mode === 'forgot') {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/callback?type=recovery`,
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess('נשלח לינק לאיפוס סיסמה לאימייל שלך!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה לא צפויה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'התחבר לחשבון שלך';
      case 'register': return 'צור חשבון חדש';
      case 'magic': return 'התחברות עם לינק';
      case 'forgot': return 'איפוס סיסמה';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'התחבר';
      case 'register': return 'הירשם';
      case 'magic': return 'שלח לינק';
      case 'forgot': return 'שלח לינק איפוס';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">מערכת ניהול תזרים</h1>
          <p className="text-gray-500 mt-1">{getTitle()}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם מלא
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס שם מלא"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מעבד...</span>
              </>
            ) : (
              <span>{getButtonText()}</span>
            )}
          </button>
        </form>

        {/* Magic Link Option */}
        {mode === 'login' && (
          <div className="mt-4">
            <button
              onClick={() => { setMode('magic'); setError(''); setSuccess(''); }}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>התחבר עם לינק באימייל</span>
            </button>
          </div>
        )}

        {/* Forgot Password */}
        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              שכחת סיסמה?
            </button>
          </div>
        )}

        {/* Toggle Between Modes */}
        <div className="mt-6 text-center space-y-2">
          {(mode === 'magic' || mode === 'forgot') && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-blue-600 hover:text-blue-700 text-sm block w-full"
            >
              חזור להתחברות עם סיסמה
            </button>
          )}
          
          {mode === 'login' && (
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              אין לך חשבון? הירשם
            </button>
          )}
          
          {mode === 'register' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              יש לך חשבון? התחבר
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
