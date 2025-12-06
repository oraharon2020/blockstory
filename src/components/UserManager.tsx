'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  X, Plus, Trash2, Loader2, Users, Mail, 
  Check, AlertCircle, Crown, Shield, Eye, Store, Clock
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

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export default function UserManager({ isOpen, onClose }: UserManagerProps) {
  const { user, currentBusiness, businesses } = useAuth();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
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
      loadPendingInvitations(currentBusiness.id);
    }
  }, [isOpen, currentBusiness]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadUsers(selectedBusinessId);
      loadPendingInvitations(selectedBusinessId);
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

  const loadPendingInvitations = async (businessId: string) => {
    if (!businessId) return;
    
    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending invitations:', error);
        return;
      }

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('האם למחוק את ההזמנה?')) return;

    try {
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      
      await loadPendingInvitations(selectedBusinessId);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('שגיאה במחיקת ההזמנה');
    }
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    try {
      const businessName = businesses.find(b => b.id === selectedBusinessId)?.name || 'העסק';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blockstory.onrender.com';
      
      const { error } = await supabase.auth.signInWithOtp({
        email: invitation.email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            invited_to_business: selectedBusinessId,
            business_name: businessName,
          }
        }
      });

      if (error) {
        alert(`שגיאה בשליחת המייל: ${error.message}`);
      } else {
        alert(`מייל הזמנה נשלח שוב ל-${invitation.email}`);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('שגיאה בשליחת ההזמנה');
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email.trim() || !currentBusiness) return;

    setInviting(true);
    try {
      const businessIdToUse = newInvite.businessId || selectedBusinessId;
      const emailToInvite = newInvite.email.trim().toLowerCase();
      
      // Check if this email is already associated with this business
      const { data: existingInvite } = await supabase
        .from('pending_invitations')
        .select('id')
        .eq('business_id', businessIdToUse)
        .eq('email', emailToInvite)
        .single();

      if (existingInvite) {
        alert('משתמש זה כבר הוזמן לעסק זה');
        return;
      }

      // Create pending invitation
      const { error: inviteError } = await supabase
        .from('pending_invitations')
        .insert({
          business_id: businessIdToUse,
          email: emailToInvite,
          role: newInvite.role,
          invited_by: user?.id,
        });

      if (inviteError) throw inviteError;

      // Send invitation email using Supabase Auth
      const businessName = businesses.find(b => b.id === businessIdToUse)?.name || 'העסק';
      // Always use production URL for email redirects
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blockstory.onrender.com';
      
      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: emailToInvite,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            invited_to_business: businessIdToUse,
            business_name: businessName,
          }
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Still show success since invitation was created
        alert(`הזמנה נוצרה ל-${newInvite.email}.\nלא הצלחנו לשלוח מייל אוטומטי - שלח את הלינק הבא למשתמש:\n${siteUrl}/login`);
      } else {
        alert(`מייל הזמנה נשלח ל-${newInvite.email}!\nהמשתמש יקבל גישה ל-${businessName} אחרי שיתחבר.`);
      }
      
      setNewInvite({ email: '', role: 'viewer', businessId: '' });
      setShowInviteForm(false);
      await loadUsers(selectedBusinessId);
      await loadPendingInvitations(selectedBusinessId);

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

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    הזמנות ממתינות ({pendingInvitations.length})
                  </h3>
                  
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{inv.email}</p>
                          <p className="text-xs text-gray-500">
                            נשלח: {new Date(inv.created_at).toLocaleDateString('he-IL')}
                            {' • '}
                            {inv.role === 'admin' ? 'מנהל' : 'צופה'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                          ממתין
                        </span>
                        
                        <button
                          onClick={() => handleResendInvitation(inv)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                          title="שלח שוב"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteInvitation(inv.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          title="מחק הזמנה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
