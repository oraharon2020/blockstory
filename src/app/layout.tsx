import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
