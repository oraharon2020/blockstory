'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  X, Plus, Trash2, Loader2, Users, Mail, 
  Check, AlertCircle, Crown, Shield, Eye, Store
} from 'lucide-react';

interface UserManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BusinessUser {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'viewer';
  invited_at: string;
  accepted_at?: string;
}

export default function UserManager({ isOpen, onClose }: UserManagerProps) {
  const { user, currentBusiness, businesses } = useAuth();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'viewer' as 'admin' | 'viewer',
    businessId: '',
  });

  useEffect(() => {
    if (isOpen && currentBusiness) {
      setSelectedBusinessId(currentBusiness.id);
      loadUsers(currentBusiness.id);
    }
  }, [isOpen, currentBusiness]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadUsers(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const loadUsers = async (businessId: string) => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      // Get all user-business relationships for this business
      const { data, error } = await supabase
        .from('user_businesses')
        .select(`
          id,
          user_id,
          role,
          invited_at,
          accepted_at
        `)
        .eq('business_id', businessId);

      if (error) throw error;

      // Get user details for each
      const usersWithDetails: BusinessUser[] = [];
      
      for (const ub of data || []) {
        // Get user info from auth.users (we'll use email from the invite or fetch it)
        const { data: userData } = await supabase.auth.admin?.getUserById?.(ub.user_id) || {};
        
        usersWithDetails.push({
          id: ub.id,
          user_id: ub.user_id,
          email: userData?.user?.email || 'טוען...',
          full_name: userData?.user?.user_metadata?.full_name,
          role: ub.role,
          invited_at: ub.invited_at,
          accepted_at: ub.accepted_at,
        });
      }

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email.trim() || !currentBusiness) return;

    setInviting(true);
    try {
      const businessIdToUse = newInvite.businessId || selectedBusinessId;
      
      // First, check if user exists
      const { data: existingUsers } = await supabase
        .from('user_businesses')
        .select('id')
        .eq('business_id', businessIdToUse);

      // For now, we'll create an invitation record
      // In production, you'd send an email invitation
      
      // Check if email is already invited
      // This is simplified - in production you'd check against auth.users
      
      const { error } = await supabase
        .from('user_businesses')
        .insert({
          business_id: businessIdToUse,
          user_id: user?.id, // Placeholder - in real app, we'd lookup or create user
          role: newInvite.role,
          invited_by: user?.id,
        });

      if (error) throw error;

      const businessName = businesses.find(b => b.id === businessIdToUse)?.name || 'העסק';
      alert(`הזמנה נשלחה ל-${newInvite.email} לעסק ${businessName}`);
      setNewInvite({ email: '', role: 'viewer', businessId: '' });
      setShowInviteForm(false);
      await loadUsers(selectedBusinessId);

    } catch (error) {
      console.error('Error inviting user:', error);
      alert('שגיאה בשליחת הזמנה');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'viewer') => {
    if (!selectedBusinessId) return;

    try {
      const { error } = await supabase
        .from('user_businesses')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers(selectedBusinessId);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('שגיאה בעדכון הרשאות');
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm('האם להסיר את המשתמש מהעסק?')) return;

    try {
      const { error } = await supabase
        .from('user_businesses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadUsers(selectedBusinessId);
    } catch (error) {
      console.error('Error removing user:', error);
      alert('שגיאה בהסרת משתמש');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'בעלים';
      case 'admin':
        return 'מנהל';
      default:
        return 'צופה';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">ניהול משתמשים</h2>
                <p className="text-purple-200 text-sm">{currentBusiness?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Business Selector */}
        {businesses.length > 1 && (
          <div className="px-6 pt-4 pb-2 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">הצג משתמשים של עסק:</label>
            <div className="relative">
              <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border rounded-lg appearance-none bg-white"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invite Button */}
              {!showInviteForm && currentBusiness?.role !== 'viewer' && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-500 hover:text-purple-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>הזמן משתמש חדש</span>
                </button>
              )}

              {/* Invite Form */}
              {showInviteForm && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h3 className="font-bold text-gray-900">הזמן משתמש</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={newInvite.email}
                        onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  {/* Business Selection for Invite */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שייך לעסק</label>
                    <div className="relative">
                      <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={newInvite.businessId || selectedBusinessId}
                        onChange={(e) => setNewInvite({ ...newInvite, businessId: e.target.value })}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg appearance-none bg-white"
                      >
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">הרשאה</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewInvite({ ...newInvite, role: 'admin' })}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                          newInvite.role === 'admin'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        <span>מנהל</span>
                      </button>
                      <button
                        onClick={() => setNewInvite({ ...newInvite, role: 'viewer' })}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                          newInvite.role === 'viewer'
                            ? 'bg-gray-100 border-gray-500 text-gray-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>צופה</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {newInvite.role === 'admin' 
                        ? 'מנהל יכול לערוך נתונים והגדרות'
                        : 'צופה יכול רק לצפות בנתונים'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !newInvite.email.trim()}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      <span>שלח הזמנה</span>
                    </button>
                    <button
                      onClick={() => setShowInviteForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">משתמשים ({users.length})</h3>
                
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        u.role === 'owner' ? 'bg-yellow-100' :
                        u.role === 'admin' ? 'bg-blue-100' : 'bg-gray-200'
                      }`}>
                        {getRoleIcon(u.role)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.full_name || u.email}
                          {u.user_id === user?.id && (
                            <span className="text-xs text-gray-500 mr-1">(אתה)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Role Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        u.role === 'owner' ? 'bg-yellow-100 text-yellow-700' :
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getRoleLabel(u.role)}
                      </span>

                      {/* Actions (only for non-owners and if current user is owner/admin) */}
                      {u.role !== 'owner' && u.user_id !== user?.id && currentBusiness?.role !== 'viewer' && (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value as 'admin' | 'viewer')}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="admin">מנהל</option>
                            <option value="viewer">צופה</option>
                          </select>
                          
                          <button
                            onClick={() => handleRemoveUser(u.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="הסר משתמש"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Role Explanation */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm">
                <h4 className="font-medium text-blue-800 mb-2">סוגי הרשאות:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span><strong>בעלים</strong> - גישה מלאה + מחיקת עסק</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span><strong>מנהל</strong> - עריכת נתונים, הגדרות, הזמנת משתמשים</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span><strong>צופה</strong> - צפייה בלבד</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
