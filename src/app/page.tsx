'use client';

import { useState, useCallback } from 'react';
import CashflowTableMonthly from '@/components/CashflowTableMonthly';
import MonthPicker, { getMonthRange } from '@/components/MonthPicker';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const handleSync = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const settingsRes = await fetch('/api/settings');
      const settingsJson = await settingsRes.json();
      
      if (!settingsJson.data?.wooUrl) {
        alert('יש להגדיר את חיבור ה-WooCommerce בהגדרות');
        return;
      }

      const { wooUrl, consumerKey, consumerSecret, materialsRate = 30 } = settingsJson.data;
      
      // Calculate days in month
      const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Loop through all days in the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Don't sync future dates
        if (dateStr > todayStr) break;
        
        console.log(`Syncing: ${dateStr}`);
        
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            wooUrl,
            consumerKey,
            consumerSecret,
            materialsRate: materialsRate / 100,
          }),
        });
      }

      // Force re-render
      setSelectedMonth({ ...selectedMonth });
    } catch (error) {
      console.error('Sync error:', error);
      alert('שגיאה בסנכרון הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth({ month, year });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">דשבורד תזרים</h1>
          <p className="text-gray-500 mt-1">צפייה וניהול תזרים המזומנים של העסק</p>
        </div>
        
        <MonthPicker
          month={selectedMonth.month}
          year={selectedMonth.year}
          onChange={handleMonthChange}
        />
      </div>

      {/* Cashflow Table */}
      <CashflowTableMonthly
        month={selectedMonth.month}
        year={selectedMonth.year}
        onSync={handleSync}
        isLoading={isLoading}
      />

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4" dir="rtl">
        <h3 className="font-semibold text-blue-800 mb-2">💡 טיפים</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• לחץ על מספר ההזמנות כדי לראות פירוט כל ההזמנות של אותו יום</li>
          <li>• ניתן לערוך את עלויות הפרסום וחומרי גלם ישירות בטבלה</li>
          <li>• השתמש בבורר החודשים כדי לנווט בין חודשים</li>
          <li>• כפתור "סנכרון" מעדכן את כל הנתונים מ-WooCommerce</li>
        </ul>
      </div>
    </div>
  );
}
