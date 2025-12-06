'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Edit3, Check, X, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface SuppliersManagerProps {
  onSupplierSelect?: (supplier: Supplier) => void;
  showSelectMode?: boolean;
}

export default function SuppliersManager({ onSupplierSelect, showSelectMode }: SuppliersManagerProps) {
  const { currentBusiness } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadSuppliers();
    }
  }, [currentBusiness?.id]);

  const loadSuppliers = async () => {
    if (!currentBusiness?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?businessId=${currentBusiness.id}`);
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !currentBusiness?.id) return;

    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'update_supplier' : 'add_supplier',
          businessId: currentBusiness.id,
          id: editingId,
          ...formData,
        }),
      });

      if (res.ok) {
        await loadSuppliers();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק את הספק?') || !currentBusiness?.id) return;

    try {
      const res = await fetch(`/api/suppliers?businessId=${currentBusiness.id}&supplierId=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadSuppliers();
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          ספקים ({suppliers.length})
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף ספק
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם הספק *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="שם הספק"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                איש קשר
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="שם איש קשר"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                טלפון
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כתובת
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="כתובת הספק"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="הערות נוספות..."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'עדכן' : 'הוסף'}
            </button>
          </div>
        </div>
      )}

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>אין ספקים עדיין</p>
          <p className="text-sm">הוסף ספקים כדי לנהל עלויות מוצרים</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`bg-white border rounded-lg p-4 ${
                showSelectMode ? 'cursor-pointer hover:border-blue-500 hover:bg-blue-50' : ''
              }`}
              onClick={() => showSelectMode && onSupplierSelect?.(supplier)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
                  {supplier.contact_name && (
                    <p className="text-sm text-gray-600">{supplier.contact_name}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    {supplier.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {supplier.phone}
                      </span>
                    )}
                    {supplier.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {supplier.email}
                      </span>
                    )}
                    {supplier.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {supplier.address}
                      </span>
                    )}
                  </div>
                  {supplier.notes && (
                    <p className="text-sm text-gray-400 mt-1">{supplier.notes}</p>
                  )}
                </div>
                {!showSelectMode && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
