'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';
import AIChatModule from '@/components/AIChatModule';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
      <AIChatModule />
    </AuthProvider>
  );
}
