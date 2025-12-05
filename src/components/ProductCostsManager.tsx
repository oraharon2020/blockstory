'use client';

import { useState, useEffect } from 'react';
import { Package, Save, Loader2, Trash2, Search, Plus, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface ProductCost {
  id: number;
  product_id: number | null;
  sku: string | null;
  product_name: string;
  unit_cost: number;
  updated_at: string;
}

export default function ProductCostsManager() {
  const [products, setProducts] = useState<ProductCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', cost: '' });
  const [addingNew, setAddingNew] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/product-costs');
      const json = await res.json();
      if (json.data) {
        setProducts(json.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ProductCost) => {
    setEditingId(product.id);
    setEditValue(product.unit_cost.toString());
  };

  const handleSave = async (product: ProductCost) => {
    setSavingId(product.id);
    try {
      const res = await fetch('/api/product-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.product_id,
          sku: product.sku,
          product_name: product.product_name,
          unit_cost: parseFloat(editValue) || 0,
        }),
      });

      if (res.ok) {
        setProducts(products.map(p => 
          p.id === product.id 
            ? { ...p, unit_cost: parseFloat(editValue) || 0, updated_at: new Date().toISOString() }
            : p
        ));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error saving product cost:', error);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('האם למחוק את המוצר?')) return;

    try {
      const res = await fetch(`/api/product-costs?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddNew = async () => {
    if (!newProduct.name) return;
    
    setAddingNew(true);
    try {
      const res = await fetch('/api/product-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: newProduct.name,
          unit_cost: parseFloat(newProduct.cost) || 0,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setProducts([...products, json.data]);
        setNewProduct({ name: '', cost: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setAddingNew(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-orange-600" />
          </span>
          עלויות מוצרים
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף מוצר
        </button>
      </div>

      {/* Add New Product Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="שם המוצר"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              value={newProduct.cost}
              onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
              placeholder="עלות ליחידה (₪)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddNew}
              disabled={addingNew || !newProduct.name}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              {addingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              שמור
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewProduct({ name: '', cost: '' }); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חפש מוצר..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{products.length === 0 ? 'אין מוצרים עדיין' : 'לא נמצאו מוצרים'}</p>
          <p className="text-sm mt-1">עלויות מוצרים יתווספו אוטומטית כשתזין אותן בהזמנות</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">מוצר</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">עלות ליחידה</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">עדכון אחרון</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{product.product_name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-500 text-sm">{product.sku || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 px-2 py-1 border border-blue-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(product);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span 
                        className="font-medium text-green-600 cursor-pointer hover:bg-green-50 px-2 py-1 rounded"
                        onClick={() => handleEdit(product)}
                      >
                        {formatCurrency(product.unit_cost)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-500 text-sm">{formatDate(product.updated_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === product.id ? (
                        <button
                          onClick={() => handleSave(product)}
                          disabled={savingId === product.id}
                          className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                        >
                          {savingId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <p className="text-sm text-gray-500">
        💡 טיפ: כשתזין עלות למוצר בפופאפ ההזמנות, היא תישמר כאן אוטומטית
      </p>
    </div>
  );
}
