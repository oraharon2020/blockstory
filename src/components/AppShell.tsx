'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import BusinessSelector from '@/components/BusinessSelector';
import BusinessManager from '@/components/BusinessManager';
import UserManager from '@/components/UserManager';
import { Loader2, Plus, Store } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading, businesses, currentBusiness } = useAuth();
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage />;
  }

  // No businesses - show create first business
  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ברוך הבא! 👋</h1>
          <p className="text-gray-500 mb-6">
            כדי להתחיל, צור את העסק הראשון שלך
          </p>
          <button
            onClick={() => setShowBusinessManager(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>צור עסק חדש</span>
          </button>
          
          <BusinessManager
            isOpen={showBusinessManager}
            onClose={() => setShowBusinessManager(false)}
          />
        </div>
      </div>
    );
  }

  // Main app with top header
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">CRM תזרים</h1>
            <BusinessSelector
              onManageBusinesses={() => setShowBusinessManager(true)}
              onManageUsers={() => setShowUserManager(true)}
            />
          </div>
          <div className="text-sm text-white/80">
            {user?.email}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        {currentBusiness ? (
          children
        ) : (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </main>

      {/* Modals */}
      <BusinessManager
        isOpen={showBusinessManager}
        onClose={() => setShowBusinessManager(false)}
      />
      <UserManager
        isOpen={showUserManager}
        onClose={() => setShowUserManager(false)}
      />
    </div>
  );
}
