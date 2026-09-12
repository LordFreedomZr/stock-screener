'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, Clock, Shield, Wifi, Calendar } from 'lucide-react';
import { ADMIN_EMAILS } from '@/lib/config';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_seen: string | null;
  expires_at: string | null;
  is_expired: boolean;
  is_online: boolean;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Belum pernah';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editUser, setEditUser] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setAccessDenied(true);
      }
    } catch {
      setAccessDenied(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message);
        setNewEmail('');
        setNewPassword('');
        setShowAdd(false);
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', 'Gagal membuat user');
    }
  };

  const handleUpdateExpiry = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_expiry', targetUserId: userId, expiresAt: editDate || null }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message);
        setEditUser(null);
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', 'Gagal update expiry');
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Hapus user ${email}?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', targetUserId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message);
        fetchUsers();
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', 'Gagal menghapus user');
    }
  };

  const onlineCount = users.filter(u => u.is_online).length;

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="border-red-500/50 bg-red-500/10 max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-bold text-white mb-2">Akses Ditolak</h2>
            <p className="text-gray-400 text-sm mb-4">Hanya admin yang dapat mengakses halaman ini.</p>
            <Button onClick={() => router.push('/')} className="bg-cyan-500 hover:bg-cyan-600 text-gray-950">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola user dan akun</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-cyan-500 hover:bg-cyan-600 text-gray-950">
          <Plus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {showAdd && (
        <Card className="border-gray-800/50 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-sm">Tambah User Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-gray-950/50 border-gray-800" />
            <Input type="password" placeholder="Password (min 6 karakter)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-gray-950/50 border-gray-800" />
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="bg-cyan-500 hover:bg-cyan-600 text-gray-950" disabled={!newEmail || !newPassword.length}>Buat</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" className="text-gray-400">Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-800/50 bg-gray-900/50">
        <CardContent className="p-4">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">{users.length} user</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-400">{onlineCount} online</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
            return (
              <Card key={user.id} className="border-gray-800/50 bg-gray-900/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{user.email}</span>
                        {isAdmin && <Shield className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        {user.is_online ? (
                          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded">Online</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-500 rounded">Offline</span>
                        )}
                        {user.is_expired && <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">Expired</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last seen: {formatRelativeTime(user.last_seen)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expired: {user.expires_at ? new Date(user.expires_at).toLocaleDateString('id-ID') : 'Tidak pernah'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {editUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="h-8 text-xs w-40 bg-gray-950/50 border-gray-800"
                          />
                          <Button size="sm" onClick={() => handleUpdateExpiry(user.id)} className="h-8 text-xs bg-cyan-500 text-gray-950">Simpan</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditUser(null)} className="h-8 text-xs text-gray-400">Batal</Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditUser(user.id);
                              setEditDate(user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : '');
                            }}
                            className="h-8 text-xs text-gray-400 hover:text-white"
                            disabled={isAdmin}
                            title={isAdmin ? 'Admin tidak bisa di-expire' : 'Edit expiry'}
                          >
                            Edit Expiry
                          </Button>
                          {!isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user.id, user.email)}
                              className="h-8 text-xs text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
