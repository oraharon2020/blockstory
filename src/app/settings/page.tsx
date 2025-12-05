import SettingsPage from '@/components/SettingsPage';
import WebhookSetup from '@/components/WebhookSetup';

export default function Settings() {
  return (
    <div className="space-y-6">
      <SettingsPage />
      <WebhookSetup />
    </div>
  );
}
