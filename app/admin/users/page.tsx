'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

type FilterTab = 'all' | 'client' | 'worker' | 'pending_worker';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [accountsMap, setAccountsMap] = useState<Record<string, any[]>>({});
  const [accountsLoading, setAccountsLoading] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<{ userId: string; accountId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (filter === 'client') params.set('role', 'client');
      if (filter === 'worker') params.set('role', 'worker');
      if (filter === 'pending_worker') { params.set('role', 'worker'); params.set('workerStatus', 'pending'); }

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (userId: string, body: Record<string, any>, label: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} thành công`);
      fetchUsers();
    } catch {
      toast.error(`${label} thất bại`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = async (user: any) => {
    if (user.role !== 'worker') return;
    const uid = user.id;
    if (expandedUserId === uid) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(uid);
    if (accountsMap[uid]) return; // already loaded
    setAccountsLoading(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}/accounts`);
      const data = await res.json();
      setAccountsMap(prev => ({ ...prev, [uid]: data.accounts || [] }));
    } catch {
      toast.error('Không tải được tài khoản GG');
    } finally {
      setAccountsLoading(null);
    }
  };

  const handleSaveAccount = async (userId: string, accountId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/accounts?accountId=${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: field === 'level' ? Number(value) : value }),
      });
      if (!res.ok) throw new Error();
      toast.success('Cập nhật thành công');
      setEditingAccount(null);
      // Reload accounts for this user
      const res2 = await fetch(`/api/admin/users/${userId}/accounts`);
      const data2 = await res2.json();
      setAccountsMap(prev => ({ ...prev, [userId]: data2.accounts || [] }));
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'client', label: 'Khách hàng' },
    { key: 'worker', label: 'Worker' },
    { key: 'pending_worker', label: 'Chờ duyệt' },
  ];

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Quản lý người dùng</h1>
        <p className="text-on-surface-variant mt-1">Tổng cộng {total} người dùng</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === tab.key
                ? 'bg-primary-neon/20 text-primary-neon border border-primary-neon/30'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Đang tải...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Không có người dùng nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Tên</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Email</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Vai trò</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Trạng thái</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Uy tín</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Số dư</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user: any) => (
                  <React.Fragment key={user.id}>
                  <tr
                    className={`hover:bg-white/5 transition-colors ${user.role === 'worker' ? 'cursor-pointer' : ''}`}
                    onClick={() => toggleExpand(user)}
                  >
                    <td className="p-4 font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        {user.role === 'worker' && (
                          expandedUserId === user.id
                            ? <ChevronUp size={14} className="text-primary-neon shrink-0" />
                            : <ChevronDown size={14} className="text-on-surface-variant shrink-0" />
                        )}
                        {user.name || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                        user.role === 'worker' ? 'bg-secondary-neon/10 text-secondary-neon' :
                        'bg-primary-neon/10 text-primary-neon'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.isActive === false ? 'bg-red-500/10 text-red-400' :
                        user.workerStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        user.workerStatus === 'approved' ? 'bg-green-500/10 text-green-400' :
                        user.workerStatus === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {user.isActive === false ? 'Bị khóa' :
                         user.workerStatus === 'pending' ? 'Chờ duyệt' :
                         user.workerStatus === 'rejected' ? 'Từ chối' :
                         'Hoạt động'}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface">{user.trustScore ?? '-'}</td>
                    <td className="p-4 text-on-surface">{Number(user.wallet?.availableBalance || 0).toLocaleString()} đ</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {user.role === 'worker' && user.workerStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(user.id, { workerStatus: 'approved' }, 'Duyệt')}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleAction(user.id, { workerStatus: 'rejected' }, 'Từ chối')}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                        {user.isActive !== false && user.role !== 'admin' && (
                          <button
                            onClick={() => handleAction(user.id, { isActive: false }, 'Khóa')}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            Khóa
                          </button>
                        )}
                        {user.isActive === false && (
                          <button
                            onClick={() => handleAction(user.id, { isActive: true }, 'Mở khóa')}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                          >
                            Mở khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded accounts row */}
                  {expandedUserId === user.id && (
                    <tr>
                      <td colSpan={7} className="bg-surface-container/50 px-4 pb-4">
                        {accountsLoading === user.id ? (
                          <div className="py-4 text-center text-on-surface-variant text-sm">Đang tải tài khoản GG...</div>
                        ) : (accountsMap[user.id] || []).length === 0 ? (
                          <div className="py-4 text-center text-on-surface-variant text-sm">Chưa có tài khoản Google Maps</div>
                        ) : (
                          <div className="mt-2 rounded-lg overflow-hidden border border-white/5">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/5">
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Tên TK</th>
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Email</th>
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Level</th>
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Trạng thái</th>
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Jobs</th>
                                  <th className="text-left p-3 text-on-surface-variant uppercase tracking-widest">Hành động</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {(accountsMap[user.id] || []).map((acc: any) => (
                                  <tr key={acc.id} className="hover:bg-white/5">
                                    <td className="p-3 font-bold text-on-surface">{acc.accountName || '-'}</td>
                                    <td className="p-3 text-on-surface-variant">{acc.accountEmail || '-'}</td>
                                    <td className="p-3">
                                      {editingAccount?.accountId === acc.id && editingAccount.field === 'level' ? (
                                        <div className="flex gap-1 items-center">
                                          <input type="number" min={1} max={10} value={editValue} onChange={e => setEditValue(e.target.value)}
                                            className="w-16 bg-surface-container border border-primary-neon/50 rounded px-2 py-0.5 text-xs text-on-surface focus:outline-none" />
                                          <button onClick={() => handleSaveAccount(user.id, acc.id, 'level', editValue)} className="text-green-400 text-xs font-bold">✓</button>
                                          <button onClick={() => setEditingAccount(null)} className="text-red-400 text-xs">✕</button>
                                        </div>
                                      ) : (
                                        <span className="text-primary-neon font-bold cursor-pointer hover:underline" onClick={() => { setEditingAccount({ userId: user.id, accountId: acc.id, field: 'level' }); setEditValue(String(acc.level)); }}>Lv.{acc.level}</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{acc.status}</span>
                                    </td>
                                    <td className="p-3 text-on-surface">{acc._count?.reviewItems ?? 0}</td>
                                    <td className="p-3">
                                      <button
                                        onClick={() => handleSaveAccount(user.id, acc.id, 'status', acc.status === 'active' ? 'suspended' : 'active')}
                                        className={`px-2 py-1 rounded text-[9px] font-bold ${acc.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'} transition-colors`}
                                      >
                                        {acc.status === 'active' ? 'Khóa TK' : 'Mở TK'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Trang {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
