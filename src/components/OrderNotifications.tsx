'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Package, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OrderChange {
  id: string;
  order_id: number;
  change_type: string;
  old_value: any;
  new_value: any;
  changes_summary: string;
  is_read: boolean;
  created_at: string;
}

const CHANGE_TYPE_ICONS: Record<string, { icon: any; color: string }> = {
  'created': { icon: Package, color: 'text-green-500' },
  'updated': { icon: RefreshCw, color: 'text-blue-500' },
  'status_changed': { icon: AlertCircle, color: 'text-orange-500' },
  'total_changed': { icon: AlertCircle, color: 'text-purple-500' },
  'deleted': { icon: Trash2, color: 'text-red-500' },
};

export default function OrderNotifications() {
  const { currentBusiness } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [changes, setChanges] = useState<OrderChange[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchChanges = useCallback(async () => {
    if (!currentBusiness?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/order-changes?businessId=${currentBusiness.id}&limit=30`);
      const data = await res.json();
      
      if (data.changes) {
        setChanges(data.changes);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchChanges();
    const interval = setInterval(fetchChanges, 30000);
    return () => clearInterval(interval);
  }, [fetchChanges]);

  const markAsRead = async (changeIds?: string[]) => {
    if (!currentBusiness?.id) return;

    try {
      await fetch('/api/order-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          changeIds,
          markAllRead: !changeIds,
        }),
      });

      // Update local state
      if (changeIds) {
        setChanges(prev => prev.map(c => 
          changeIds.includes(c.id) ? { ...c, is_read: true } : c
        ));
        setUnreadCount(prev => Math.max(0, prev - changeIds.length));
      } else {
        setChanges(prev => prev.map(c => ({ ...c, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return date.toLocaleDateString('he-IL');
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-800">התראות הזמנות</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {unreadCount} חדשות
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    סמן הכל כנקרא
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {loading && changes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  טוען...
                </div>
              ) : changes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>אין התראות</p>
                </div>
              ) : (
                <div className="divide-y">
                  {changes.map((change) => {
                    const typeConfig = CHANGE_TYPE_ICONS[change.change_type] || CHANGE_TYPE_ICONS['updated'];
                    const Icon = typeConfig.icon;
                    
                    return (
                      <div
                        key={change.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !change.is_read ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => !change.is_read && markAsRead([change.id])}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-lg bg-gray-100 ${typeConfig.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!change.is_read ? 'font-semibold' : ''} text-gray-800`}>
                              {change.changes_summary}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatTime(change.created_at)}
                              </span>
                              {!change.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          </div>
                          {!change.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead([change.id]);
                              }}
                              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                              title="סמן כנקרא"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {changes.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <button
                  onClick={fetchChanges}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  רענן
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
