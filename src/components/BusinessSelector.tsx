'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Store, Plus, Check, Settings, LogOut, Users, Crown, Shield, Eye } from 'lucide-react';

interface BusinessSelectorProps {
  onManageBusinesses?: () => void;
  onManageUsers?: () => void;
}

export default function BusinessSelector({ onManageBusinesses, onManageUsers }: BusinessSelectorProps) {
  const { businesses, currentBusiness, setCurrentBusiness, signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBusinessSelect = (business: typeof currentBusiness) => {
    if (business) {
      setCurrentBusiness(business);
      setIsOpen(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (!currentBusiness) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Business Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Store className="w-4 h-4" />
        </div>
        <div className="text-right hidden sm:block">
          <p className="font-medium text-sm leading-tight flex items-center gap-1.5">
            {currentBusiness.name}
            {getRoleBadge(currentBusiness.role)}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border z-50" dir="rtl">
          {/* User Info */}
          <div className="p-3 border-b bg-gray-50 rounded-t-xl">
            <p className="text-sm font-medium text-gray-900">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          {/* Business List */}
          <div className="max-h-64 overflow-y-auto p-2">
            <p className="text-xs text-gray-400 px-2 py-1">העסקים שלך</p>
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => handleBusinessSelect(business)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  currentBusiness.id === business.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  currentBusiness.id === business.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <Store className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <p className="font-medium text-sm">{business.name}</p>
                  <div className="flex items-center gap-1">
                    {getRoleBadge(business.role)}
                  </div>
                </div>
                {currentBusiness.id === business.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="p-2 border-t space-y-1">
            {onManageBusinesses && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageBusinesses();
                }}
                className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף / נהל עסקים</span>
              </button>
            )}
            
            {onManageUsers && currentBusiness.role !== 'viewer' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageUsers();
                }}
                className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Users className="w-4 h-4" />
                <span>ניהול משתמשים</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
