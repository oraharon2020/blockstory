'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, Save, Loader2, Trash2, Search, Plus, Check, Building2, ChevronDown, ChevronRight, X, Edit2 } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface ProductCost {
  id: number;
  product_id: number | null;
  sku: string | null;
  product_name: string;
  unit_cost: number;
  supplier_name?: string;
  updated_at: string;
}

interface VariationCost {
  id: number;
  product_id: number;
  product_name: string;
  variation_key: string;
  variation_attributes?: Record<string, string>;
  unit_cost: number;
  supplier_name?: string;
  supplier_id?: string;
  updated_at: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

interface ProductWithVariations extends ProductCost {
  variations: VariationCost[];
}

interface ProductCostsManagerProps {
  businessId?: string;
}

export default function ProductCostsManager({ businessId }: ProductCostsManagerProps) {
  const [products, setProducts] = useState<ProductCost[]>([]);
  const [variations, setVariations] = useState<VariationCost[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', cost: '', supplier: '' });
  const [addingNew, setAddingNew] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  
  // Supplier management
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_name: '', phone: '', email: '' });
  const [addingSupplier, setAddingSupplier] = useState(false);
  
  // Filters
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterCostStatus, setFilterCostStatus] = useState<'all' | 'with-cost' | 'no-cost'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Load products, variations and suppliers
  useEffect(() => {
    if (businessId) {
      loadProducts();
      loadVariations();
      loadSuppliers();
    }
  }, [businessId]);

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/product-costs?businessId=${businessId}`);
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

  const loadVariations = async () => {
    try {
      const res = await fetch(`/api/product-variation-costs?businessId=${businessId}`);
      const json = await res.json();
      if (json.data) {
        setVariations(json.data);
      }
    } catch (error) {
      console.error('Error loading variations:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?businessId=${businessId}`);
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Create products with their variations grouped together
  const productsWithVariations = useMemo(() => {
    const productMap = new Map<string, ProductWithVariations>();
    
    // First, add all products
    products.forEach(product => {
      const key = product.product_name.toLowerCase();
      productMap.set(key, { ...product, variations: [] });
    });
    
    // Then, add variations to their matching products or create new entries
    variations.forEach(variation => {
      const key = variation.product_name.toLowerCase();
      const existingProduct = productMap.get(key);
      
      if (existingProduct) {
        existingProduct.variations.push(variation);
      } else {
        // Create a product entry for variations that don't have a base product
        productMap.set(key, {
          id: -variation.id, // Negative ID to indicate it's a variation-only product
          product_id: variation.product_id,
          sku: null,
          product_name: variation.product_name,
          unit_cost: 0,
          supplier_name: undefined,
          updated_at: variation.updated_at,
          variations: [variation]
        });
      }
    });
    
    return Array.from(productMap.values());
  }, [products, variations]);

  const handleEdit = (product: ProductCost) => {
    setEditingId(product.id);
    setEditingVariationId(null);
    setEditValue(product.unit_cost.toString());
    setEditSupplier(product.supplier_name || '');
  };

  const handleEditVariation = (variation: VariationCost) => {
    setEditingVariationId(variation.id);
    setEditingId(null);
    setEditValue(variation.unit_cost.toString());
    setEditSupplier(variation.supplier_name || '');
  };

  const handleSave = async (product: ProductCost) => {
    setSavingId(product.id);
    try {
      const res = await fetch('/api/product-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          product_id: product.product_id,
          sku: product.sku,
          product_name: product.product_name,
          unit_cost: parseFloat(editValue) || 0,
          supplier_name: editSupplier || null,
        }),
      });

      if (res.ok) {
        setProducts(products.map(p => 
          p.id === product.id 
            ? { 
                ...p, 
                unit_cost: parseFloat(editValue) || 0, 
                supplier_name: editSupplier || undefined,
                updated_at: new Date().toISOString() 
              }
            : p
        ));
        setEditingId(null);
        setEditSupplier('');
      }
    } catch (error) {
      console.error('Error saving product cost:', error);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveVariation = async (variation: VariationCost) => {
    setSavingId(variation.id);
    try {
      const res = await fetch('/api/product-variation-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          id: variation.id,
          product_id: variation.product_id,
          product_name: variation.product_name,
          variation_key: variation.variation_key,
          variation_attributes: variation.variation_attributes,
          unit_cost: parseFloat(editValue) || 0,
          supplier_name: editSupplier || null,
        }),
      });

      if (res.ok) {
        setVariations(variations.map(v => 
          v.id === variation.id 
            ? { 
                ...v, 
                unit_cost: parseFloat(editValue) || 0, 
                supplier_name: editSupplier || undefined,
                updated_at: new Date().toISOString() 
              }
            : v
        ));
        setEditingVariationId(null);
        setEditSupplier('');
      }
    } catch (error) {
      console.error('Error saving variation cost:', error);
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

  const handleDeleteVariation = async (id: number) => {
    if (!confirm('האם למחוק את הוריאציה?')) return;

    try {
      const res = await fetch(`/api/product-variation-costs?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setVariations(variations.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Error deleting variation:', error);
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
          businessId,
          product_name: newProduct.name,
          unit_cost: parseFloat(newProduct.cost) || 0,
          supplier_name: newProduct.supplier || null,
        }),
      });

      if (res.ok) {
        await loadProducts();
        setNewProduct({ name: '', cost: '', supplier: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setAddingNew(false);
    }
  };

  // Supplier management functions
  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    
    setAddingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_supplier',
          businessId,
          name: newSupplier.name,
          contact_name: newSupplier.contact_name || null,
          phone: newSupplier.phone || null,
          email: newSupplier.email || null,
        }),
      });

      if (res.ok) {
        await loadSuppliers();
        setNewSupplier({ name: '', contact_name: '', phone: '', email: '' });
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          id: editingSupplier.id,
          name: editingSupplier.name,
          contact_name: editingSupplier.contact_name || null,
          phone: editingSupplier.phone || null,
          email: editingSupplier.email || null,
        }),
      });

      if (res.ok) {
        await loadSuppliers();
        setEditingSupplier(null);
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('האם למחוק את הספק?')) return;
    
    try {
      const res = await fetch(`/api/suppliers?supplierId=${id}&businessId=${businessId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuppliers(suppliers.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const toggleExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Filtered and sorted products
  const filteredProducts = productsWithVariations
    .filter(p => {
      // Text search - search in product name, SKU, supplier, and variations
      const matchesSearch = 
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.variations.some(v => 
          v.variation_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.supplier_name && v.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      
      // Supplier filter
      const matchesSupplier = !filterSupplier || 
        p.supplier_name === filterSupplier ||
        p.variations.some(v => v.supplier_name === filterSupplier);
      
      // Cost status filter
      const hasCost = p.unit_cost > 0 || p.variations.some(v => v.unit_cost > 0);
      const matchesCostStatus = 
        filterCostStatus === 'all' ||
        (filterCostStatus === 'with-cost' && hasCost) ||
        (filterCostStatus === 'no-cost' && !hasCost);
      
      return matchesSearch && matchesSupplier && matchesCostStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.product_name.localeCompare(b.product_name, 'he');
          break;
        case 'cost':
          comparison = (a.unit_cost || 0) - (b.unit_cost || 0);
          break;
        case 'date':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  
  // Stats
  const totalProducts = productsWithVariations.length;
  const totalVariations = variations.length;
  const productsWithCost = products.filter(p => p.unit_cost > 0).length;
  const productsWithoutCost = products.filter(p => !p.unit_cost || p.unit_cost === 0).length;

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuppliersModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Building2 className="w-4 h-4" />
            ניהול ספקים ({suppliers.length})
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            הוסף מוצר
          </button>
        </div>
      </div>

      {/* Suppliers Modal */}
      {showSuppliersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                ניהול ספקים
              </h3>
              <button
                onClick={() => setShowSuppliersModal(false)}
                className="p-1 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Add new supplier form */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-3">הוסף ספק חדש</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    placeholder="שם הספק *"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newSupplier.contact_name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
                    placeholder="איש קשר"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="טלפון"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="אימייל"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAddSupplier}
                  disabled={addingSupplier || !newSupplier.name}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {addingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  הוסף ספק
                </button>
              </div>

              {/* Suppliers list */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">ספקים קיימים ({suppliers.length})</h4>
                {suppliers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">אין ספקים עדיין</p>
                ) : (
                  <div className="space-y-2">
                    {suppliers.map(supplier => (
                      <div key={supplier.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        {editingSupplier?.id === supplier.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editingSupplier.name}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                                placeholder="שם הספק"
                              />
                              <input
                                type="text"
                                value={editingSupplier.contact_name || ''}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, contact_name: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                                placeholder="איש קשר"
                              />
                              <input
                                type="tel"
                                value={editingSupplier.phone || ''}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                                placeholder="טלפון"
                              />
                              <input
                                type="email"
                                value={editingSupplier.email || ''}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                                placeholder="אימייל"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdateSupplier}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                שמור
                              </button>
                              <button
                                onClick={() => setEditingSupplier(null)}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{supplier.name}</span>
                              {supplier.contact_name && (
                                <span className="text-gray-500 text-sm mr-2">({supplier.contact_name})</span>
                              )}
                              {supplier.phone && (
                                <span className="text-gray-500 text-sm mr-2">📞 {supplier.phone}</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingSupplier(supplier)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(supplier.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4 bg-gray-50">
              <button
                onClick={() => setShowSuppliersModal(false)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="שם המוצר"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="relative">
              <select
                value={newProduct.supplier}
                onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">בחר ספק (אופציונלי)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
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
              onClick={() => { setShowAddForm(false); setNewProduct({ name: '', cost: '', supplier: '' }); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="bg-gray-100 px-3 py-1.5 rounded-full text-gray-600">
          סה״כ: {totalProducts} מוצרים
        </div>
        <div className="bg-purple-100 px-3 py-1.5 rounded-full text-purple-700">
          {totalVariations} וריאציות
        </div>
        <div className="bg-green-100 px-3 py-1.5 rounded-full text-green-700">
          עם עלות: {productsWithCost}
        </div>
        <div className="bg-orange-100 px-3 py-1.5 rounded-full text-orange-700">
          ללא עלות: {productsWithoutCost}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש לפי שם מוצר, וריאציה, SKU או ספק..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3">
          {/* Supplier Filter */}
          <div className="relative">
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm min-w-[140px]"
            >
              <option value="">כל הספקים</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
              ))}
            </select>
            <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Cost Status Filter */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setFilterCostStatus('all')}
              className={`px-3 py-2 text-sm transition-colors ${
                filterCostStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              הכל
            </button>
            <button
              onClick={() => setFilterCostStatus('with-cost')}
              className={`px-3 py-2 text-sm border-r border-l transition-colors ${
                filterCostStatus === 'with-cost' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              עם עלות
            </button>
            <button
              onClick={() => setFilterCostStatus('no-cost')}
              className={`px-3 py-2 text-sm transition-colors ${
                filterCostStatus === 'no-cost' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ללא עלות
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-gray-500">מיון:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'cost' | 'date')}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="name">שם</option>
              <option value="cost">עלות</option>
              <option value="date">תאריך עדכון</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
              title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterSupplier || filterCostStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSupplier('');
                setFilterCostStatus('all');
              }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              נקה סינון
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{productsWithVariations.length === 0 ? 'אין מוצרים עדיין' : 'לא נמצאו מוצרים'}</p>
          <p className="text-sm mt-1">עלויות מוצרים יתווספו אוטומטית כשתזין אותן בהזמנות</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">מוצר</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ספק</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">עלות ליחידה</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">עדכון אחרון</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => (
                <>
                  {/* Product Row */}
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Expand Button */}
                    <td className="px-4 py-3">
                      {product.variations.length > 0 && (
                        <button
                          onClick={() => toggleExpand(product.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {expandedProducts.has(product.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{product.product_name}</span>
                        {product.variations.length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {product.variations.length} וריאציות
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-500 text-sm">{product.sku || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === product.id ? (
                        <div className="relative">
                          <select
                            value={editSupplier}
                            onChange={(e) => setEditSupplier(e.target.value)}
                            className="w-32 px-2 py-1 border border-blue-300 rounded text-center focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                          >
                            <option value="">ללא ספק</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className={`text-sm ${product.supplier_name ? 'text-blue-600 flex items-center justify-center gap-1' : 'text-gray-400'}`}>
                          {product.supplier_name ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              {product.supplier_name}
                            </>
                          ) : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.id < 0 ? (
                        // This is a variation-only product, no base cost
                        <span className="text-gray-400 text-sm">-</span>
                      ) : editingId === product.id ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 px-2 py-1 border border-blue-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(product);
                            if (e.key === 'Escape') { setEditingId(null); setEditSupplier(''); }
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
                          <>
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
                            <button
                              onClick={() => { setEditingId(null); setEditSupplier(''); }}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs"
                            >
                              ✕
                            </button>
                          </>
                        ) : product.id > 0 ? (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Variation Rows */}
                  {expandedProducts.has(product.id) && product.variations.map((variation) => (
                    <tr key={`var-${variation.id}`} className="bg-purple-50/30 hover:bg-purple-50/50">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 pr-8">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-r-2 border-b-2 border-gray-300 rounded-br-lg"></span>
                          <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {variation.variation_key || 'בסיסי'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {editingVariationId === variation.id ? (
                          <div className="relative">
                            <select
                              value={editSupplier}
                              onChange={(e) => setEditSupplier(e.target.value)}
                              className="w-32 px-2 py-1 border border-purple-300 rounded text-center focus:ring-2 focus:ring-purple-500 appearance-none bg-white text-sm"
                            >
                              <option value="">ללא ספק</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className={`text-sm ${variation.supplier_name ? 'text-purple-600' : 'text-gray-400'}`}>
                            {variation.supplier_name || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {editingVariationId === variation.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-purple-300 rounded text-center focus:ring-2 focus:ring-purple-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveVariation(variation);
                              if (e.key === 'Escape') { setEditingVariationId(null); setEditSupplier(''); }
                            }}
                          />
                        ) : (
                          <span 
                            className="font-medium text-purple-600 cursor-pointer hover:bg-purple-100 px-2 py-1 rounded"
                            onClick={() => handleEditVariation(variation)}
                          >
                            {formatCurrency(variation.unit_cost)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-gray-500 text-xs">{formatDate(variation.updated_at)}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingVariationId === variation.id ? (
                            <>
                              <button
                                onClick={() => handleSaveVariation(variation)}
                                disabled={savingId === variation.id}
                                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                              >
                                {savingId === variation.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => { setEditingVariationId(null); setEditSupplier(''); }}
                                className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDeleteVariation(variation.id)}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <p className="text-sm text-gray-500">
        💡 טיפ: כשתזין עלות למוצר בפופאפ ההזמנות, היא תישמר כאן אוטומטית. לחץ על החץ ליד המוצר לראות את הוריאציות שלו.
      </p>
    </div>
  );
}
