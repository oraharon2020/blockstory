import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const heebo = Heebo({ 
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: 'CRM תזרים | ניהול תזרים מזומנים',
  description: 'מערכת ניהול תזרים מזומנים בזמן אמת עם חיבור ל-WooCommerce',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans bg-gray-100 min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-4 lg:p-8 lg:mr-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
