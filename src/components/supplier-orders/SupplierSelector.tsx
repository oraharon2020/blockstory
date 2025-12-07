'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Search, Check, Loader2 } from 'lucide-react';
import { Supplier } from './types';

interface SupplierSelectorProps {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
  loading?: boolean;
}

export default function SupplierSelector({
  suppliers,
  selectedSupplier,
  onSelect,
  loading = false,
}: SupplierSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (supplier: Supplier) => {
    onSelect(supplier);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-500">טוען ספקים...</span>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">אין ספקים מוגדרים</p>
        <p className="text-sm text-gray-400 mt-1">
          יש להגדיר ספקים בהגדרות או בעלויות מוצרים
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Supplier Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-all ${
          selectedSupplier
            ? 'border-orange-300 bg-orange-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selectedSupplier ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-right">
            {selectedSupplier ? (
              <>
                <div className="font-semibold text-gray-800">{selectedSupplier.name}</div>
                {selectedSupplier.contact_name && (
                  <div className="text-sm text-gray-500">{selectedSupplier.contact_name}</div>
                )}
              </>
            ) : (
              <div className="text-gray-500">בחר ספק...</div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-20 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש ספק..."
                  className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Suppliers List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  לא נמצאו ספקים
                </div>
              ) : (
                filteredSuppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => handleSelect(supplier)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedSupplier?.id === supplier.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedSupplier?.id === supplier.id 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {selectedSupplier?.id === supplier.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-right flex-1">
                      <div className="font-medium text-gray-800">{supplier.name}</div>
                      {supplier.contact_name && (
                        <div className="text-sm text-gray-500">{supplier.contact_name}</div>
                      )}
                    </div>
                    {supplier.phone && (
                      <div className="text-sm text-gray-400">{supplier.phone}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
