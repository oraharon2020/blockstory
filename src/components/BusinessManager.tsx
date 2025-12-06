'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  X, Plus, Trash2, Loader2, Store, Settings, 
  Save, AlertCircle, Check, ExternalLink, ListChecks 
} from 'lucide-react';
import OrderStatusSelector from './OrderStatusSelector';

interface BusinessManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BusinessWithSettings {
  id: string;
  name: string;
  logo_url?: string;
  role: string;
  settings?: {
    wooUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    vatRate?: string;
    shippingCostPerOrder?: string;
    creditCardFeePercent?: string;
    validOrderStatuses?: string[];
  };
}

export default function BusinessManager({ isOpen, onClose }: BusinessManagerProps) {
  const { user, businesses, refreshBusinesses, currentBusiness } = useAuth();
  const [businessList, setBusinessList] = useState<BusinessWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithSettings | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    wooUrl: '',
    consumerKey: '',
    consumerSecret: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadBusinessesWithSettings();
    }
  }, [isOpen, businesses]);

  const loadBusinessesWithSettings = async () => {
    setLoading(true);
    try {
      const businessesWithSettings: BusinessWithSettings[] = [];

      for (const business of businesses) {
        // Load settings for each business
        const { data: settings } = await supabase
          .from('business_settings')
          .select('*')
          .eq('business_id', business.id)
          .single();

        businessesWithSettings.push({
          ...business,
          settings: settings ? {
            wooUrl: settings.woo_url || '',
            consumerKey: settings.consumer_key || '',
            consumerSecret: settings.consumer_secret || '',
            vatRate: String(settings.vat_rate || 17),
            shippingCostPerOrder: String(settings.shipping_cost || 0),
            creditCardFeePercent: String(settings.credit_card_rate || 1.5),
            validOrderStatuses: settings.valid_order_statuses || ['completed', 'processing'],
          } : undefined,
        });
      }

      setBusinessList(businessesWithSettings);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async () => {
    if (!newBusiness.name.trim()) return;

    setSaving(true);
    console.log('🚀 Starting business creation...');
    console.log('🔑 User ID:', user?.id);
    console.log('📦 Business name:', newBusiness.name);
    
    try {
      // Test with simple fetch first
      console.log('🔌 Testing with direct fetch...');
      const testResponse = await fetch(
        'https://gvpobzhluzmsdcgrytmj.supabase.co/rest/v1/businesses?select=count',
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M`,
          }
        }
      );
      console.log('🔌 Fetch response:', testResponse.status, await testResponse.json());

      // Create business with direct fetch
      console.log('📝 Creating business with fetch...');
      const createResponse = await fetch(
        'https://gvpobzhluzmsdcgrytmj.supabase.co/rest/v1/businesses',
        {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            name: newBusiness.name,
            created_by: user?.id,
          }),
        }
      );
      
      const business = await createResponse.json();
      console.log('📝 Create response:', createResponse.status, business);
      
      if (!createResponse.ok) {
        throw new Error(business.message || 'Failed to create business');
      }

      const businessId = business[0]?.id || business.id;

      // Create owner relationship
      console.log('👤 Creating user-business relationship...');
      const relationResponse = await fetch(
        'https://gvpobzhluzmsdcgrytmj.supabase.co/rest/v1/user_businesses',
        {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user?.id,
            business_id: businessId,
            role: 'owner',
            accepted_at: new Date().toISOString(),
          }),
        }
      );
      console.log('👤 Relation response:', relationResponse.status);

      // Save WooCommerce settings
      console.log('⚙️ Saving settings...');
      const settingsResponse = await fetch(
        'https://gvpobzhluzmsdcgrytmj.supabase.co/rest/v1/business_settings',
        {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_id: businessId,
            woo_url: newBusiness.wooUrl || null,
            consumer_key: newBusiness.consumerKey || null,
            consumer_secret: newBusiness.consumerSecret || null,
            vat_rate: 17,
            shipping_cost: 0,
            credit_card_rate: 1.5,
            materials_rate: 30,
          }),
        }
      );
      console.log('⚙️ Settings response:', settingsResponse.status);

      // Reset form
      setNewBusiness({ name: '', wooUrl: '', consumerKey: '', consumerSecret: '' });
      setShowAddForm(false);
      console.log('✅ Done! Reloading page...');
      
      // Reload page to refresh businesses
      window.location.reload();

    } catch (error: any) {
      console.error('❌ Error:', error);
      alert('שגיאה ביצירת עסק: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (business: BusinessWithSettings) => {
    setSaving(true);
    try {
      const settings = business.settings || {};
      
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          business_id: business.id,
          woo_url: settings.wooUrl || null,
          consumer_key: settings.consumerKey || null,
          consumer_secret: settings.consumerSecret || null,
          vat_rate: parseFloat(settings.vatRate || '17'),
          shipping_cost: parseFloat(settings.shippingCostPerOrder || '0'),
          credit_card_rate: parseFloat(settings.creditCardFeePercent || '1.5'),
          valid_order_statuses: settings.validOrderStatuses || ['completed', 'processing'],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'business_id' });

      if (error) throw error;

      await loadBusinessesWithSettings();
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('שגיאה בשמירת הגדרות');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!confirm('האם למחוק את העסק? פעולה זו בלתי הפיכה!')) return;

    try {
      await supabase.from('businesses').delete().eq('id', businessId);
      await refreshBusinesses();
      await loadBusinessesWithSettings();
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('שגיאה במחיקת עסק');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6" />
              <h2 className="text-xl font-bold">ניהול עסקים</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Business Button */}
              {!showAddForm && !selectedBusiness && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>הוסף עסק חדש</span>
                </button>
              )}

              {/* Add Business Form */}
              {showAddForm && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h3 className="font-bold text-gray-900">עסק חדש</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק</label>
                    <input
                      type="text"
                      value={newBusiness.name}
                      onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="למשל: החנות שלי"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">חיבור WooCommerce</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">כתובת החנות</label>
                        <input
                          type="url"
                          value={newBusiness.wooUrl}
                          onChange={(e) => setNewBusiness({ ...newBusiness, wooUrl: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="https://yourstore.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Consumer Key</label>
                          <input
                            type="text"
                            value={newBusiness.consumerKey}
                            onChange={(e) => setNewBusiness({ ...newBusiness, consumerKey: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="ck_..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Consumer Secret</label>
                          <input
                            type="password"
                            value={newBusiness.consumerSecret}
                            onChange={(e) => setNewBusiness({ ...newBusiness, consumerSecret: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="cs_..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateBusiness}
                      disabled={saving || !newBusiness.name.trim()}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>צור עסק</span>
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {/* Business List */}
              {!showAddForm && !selectedBusiness && businessList.map((business) => (
                <div
                  key={business.id}
                  className={`border rounded-xl p-4 hover:border-blue-300 transition-colors ${
                    currentBusiness?.id === business.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{business.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {business.settings?.wooUrl ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-3 h-3" /> WooCommerce מחובר
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-500">
                              <AlertCircle className="w-3 h-3" /> לא מחובר
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {business.role !== 'viewer' && (
                        <button
                          onClick={() => setSelectedBusiness(business)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="הגדרות"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                      )}
                      {business.role === 'owner' && (
                        <button
                          onClick={() => handleDeleteBusiness(business.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="מחק עסק"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Edit Business Settings */}
              {selectedBusiness && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">הגדרות: {selectedBusiness.name}</h3>
                    <button
                      onClick={() => setSelectedBusiness(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">כתובת החנות</label>
                      <input
                        type="url"
                        value={selectedBusiness.settings?.wooUrl || ''}
                        onChange={(e) => setSelectedBusiness({
                          ...selectedBusiness,
                          settings: { ...selectedBusiness.settings, wooUrl: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                        <input
                          type="text"
                          value={selectedBusiness.settings?.consumerKey || ''}
                          onChange={(e) => setSelectedBusiness({
                            ...selectedBusiness,
                            settings: { ...selectedBusiness.settings, consumerKey: e.target.value }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                        <input
                          type="password"
                          value={selectedBusiness.settings?.consumerSecret || ''}
                          onChange={(e) => setSelectedBusiness({
                            ...selectedBusiness,
                            settings: { ...selectedBusiness.settings, consumerSecret: e.target.value }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Order Status Selection */}
                    {selectedBusiness.settings?.wooUrl && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <ListChecks className="w-4 h-4" />
                          סטטוסי הזמנות
                        </h4>
                        <OrderStatusSelector
                          businessId={selectedBusiness.id}
                          selectedStatuses={selectedBusiness.settings?.validOrderStatuses || ['completed', 'processing']}
                          onChange={(statuses) => setSelectedBusiness({
                            ...selectedBusiness,
                            settings: { ...selectedBusiness.settings, validOrderStatuses: statuses }
                          })}
                        />
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">הגדרות עסקיות</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">אחוז מע"מ</label>
                          <input
                            type="number"
                            value={selectedBusiness.settings?.vatRate || '17'}
                            onChange={(e) => setSelectedBusiness({
                              ...selectedBusiness,
                              settings: { ...selectedBusiness.settings, vatRate: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">עלות משלוח</label>
                          <input
                            type="number"
                            value={selectedBusiness.settings?.shippingCostPerOrder || '0'}
                            onChange={(e) => setSelectedBusiness({
                              ...selectedBusiness,
                              settings: { ...selectedBusiness.settings, shippingCostPerOrder: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">עמלת אשראי %</label>
                          <input
                            type="number"
                            value={selectedBusiness.settings?.creditCardFeePercent || '2'}
                            onChange={(e) => setSelectedBusiness({
                              ...selectedBusiness,
                              settings: { ...selectedBusiness.settings, creditCardFeePercent: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpdateSettings(selectedBusiness)}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>שמור הגדרות</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
