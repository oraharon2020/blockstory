'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Lock, Loader2, Trash2, Shield, Eye, Crown, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  created_at: string;
  last_sign_in_at?: string;
  joined_business_at: string;
}

export default function UsersManagement() {
  const { currentBusiness, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'viewer' as 'owner' | 'admin' | 'viewer'
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadUsers();
    }
  }, [currentBusiness?.id]);

  const loadUsers = async () => {
    if (!currentBusiness?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/users?businessId=${currentBusiness.id}`);
      const data = await res.json();
      
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!newUser.email || !newUser.password) {
      setError('נא למלא מייל וסיסמא');
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }

    if (newUser.password.length < 6) {
      setError('הסיסמא חייבת להכיל לפחות 6 תווים');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
          businessId: currentBusiness?.id
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה ביצירת המשתמש');
        return;
      }

      setSuccess(data.message || 'המשתמש נוצר בהצלחה!');
      setNewUser({ email: '', password: '', confirmPassword: '', name: '', role: 'viewer' });
      setShowAddForm(false);
      loadUsers();

    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת המשתמש');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`האם למחוק את המשתמש ${email}?`)) return;

    try {
      const res = await fetch(
        `/api/users?userId=${userId}&businessId=${currentBusiness?.id}&deleteCompletely=true`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה במחיקת המשתמש');
        return;
      }

      setSuccess('המשתמש נמחק בהצלחה');
      loadUsers();

    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת המשתמש');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          businessId: currentBusiness?.id,
          role: newRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה בעדכון התפקיד');
        return;
      }

      setSuccess('התפקיד עודכן בהצלחה');
      loadUsers();

    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון התפקיד');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner': return 'בעלים';
      case 'admin': return 'מנהל';
      default: return 'צופה';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">ניהול משתמשים</h1>
                <p className="text-indigo-100">הוסף והסר משתמשים מהעסק</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              הוסף משתמש
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="mr-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="mr-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add User Form */}
        {showAddForm && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              יצירת משתמש חדש
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם (אופציונלי)</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ישראל ישראלי"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מייל <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סיסמא <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="לפחות 6 תווים"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אימות סיסמא <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="הזן שוב את הסיסמא"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד</label>
                <div className="flex gap-4">
                  {[
                    { value: 'viewer', label: 'צופה', desc: 'צפייה בלבד', icon: Eye },
                    { value: 'admin', label: 'מנהל', desc: 'גישה מלאה ללא הגדרות', icon: Shield },
                    { value: 'owner', label: 'בעלים', desc: 'גישה מלאה כולל הגדרות', icon: Crown }
                  ].map((roleOption) => {
                    const Icon = roleOption.icon;
                    return (
                      <label
                        key={roleOption.value}
                        className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          newUser.role === roleOption.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={newUser.role === roleOption.value}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-5 h-5 ${
                            roleOption.value === 'owner' ? 'text-yellow-600' :
                            roleOption.value === 'admin' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                          <span className="font-medium">{roleOption.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{roleOption.desc}</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                  {saving ? 'יוצר משתמש...' : 'צור משתמש'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">משתמשים בעסק ({users.length})</h3>
          
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>אין משתמשים עדיין</p>
              <p className="text-sm">לחץ על "הוסף משתמש" כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.email[0].toUpperCase()}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <div className="font-medium text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        הצטרף: {new Date(user.joined_business_at).toLocaleDateString('he-IL')}
                        {user.last_sign_in_at && (
                          <span className="mr-4">
                            התחברות אחרונה: {new Date(user.last_sign_in_at).toLocaleDateString('he-IL')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Badge / Selector */}
                    {user.id === currentUser?.id ? (
                      // Current user - just show badge
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleName(user.role)}
                        <span className="text-xs opacity-60">(אתה)</span>
                      </div>
                    ) : (
                      // Other users - allow role change
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${getRoleBadgeColor(user.role)}`}
                      >
                        <option value="viewer">👁️ צופה</option>
                        <option value="admin">🛡️ מנהל</option>
                        <option value="owner">👑 בעלים</option>
                      </select>
                    )}

                    {/* Delete Button - not for current user */}
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="הסר משתמש"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
