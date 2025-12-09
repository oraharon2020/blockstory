'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import BusinessSelector from '@/components/BusinessSelector';
import BusinessManager from '@/components/BusinessManager';
import UserManager from '@/components/UserManager';
import { Loader2, Plus, Store, LayoutDashboard, Package, Settings, BarChart3, Truck, ChevronDown } from 'lucide-react';
import OrderNotifications from '@/components/OrderNotifications';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string }[];
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading, businesses, currentBusiness } = useAuth();
  const pathname = usePathname();
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation: NavItem[] = [
    { name: 'דשבורד', href: '/', icon: LayoutDashboard },
    { 
      name: 'סטטיסטיקות', 
      icon: BarChart3,
      children: [
        { name: 'סקירה כללית', href: '/statistics' },
        { name: 'Google Ads', href: '/google-ads' },
      ]
    },
    { name: 'עלויות מוצרים', href: '/products', icon: Package },
    { name: 'הזמנות לספקים', href: '/supplier-orders', icon: Truck },
    { name: 'הגדרות', href: '/settings', icon: Settings },
  ];

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
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-1" ref={dropdownRef}>
            {navigation.map((item) => {
              // Check if this item or any child is active
              const isActive = item.href ? pathname === item.href : 
                item.children?.some(child => pathname === child.href);
              const hasChildren = item.children && item.children.length > 0;

              if (hasChildren) {
                return (
                  <div key={item.name} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.name ? null : item.name)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-white/20 text-white font-medium'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.name}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === item.name ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openDropdown === item.name && item.children && (
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              pathname === child.href
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-sm text-white/80">
            <OrderNotifications />
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
