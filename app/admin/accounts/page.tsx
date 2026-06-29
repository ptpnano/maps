'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UserCircle, Search, ChevronLeft, ChevronRight, Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Hoạt động', cls: 'bg-green-500/10 text-green-400' },
  cooldown: { label: 'Tạm dừng', cls: 'bg-yellow-500/10 text-yellow-400' },
  banned: { label: 'Bị khoá', cls: 'bg-red-500/10 text-red-400' },
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/accounts?${params}`);
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSave = async (accountId: string, field: string, value: any) => {
    setSavingId(accountId);
    try {
      const res = await fetch(`/api/admin/accounts?accountId=${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: field === 'level' ? Number(value) : value }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Cập nhật thành công');
      setEditing(null);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (acc: any) => {
    const newStatus = acc.status === 'active' ? 'banned' : 'active';
    await handleSave(acc.id, 'status', newStatus);
  };

  const statusTabs = [
    { key: '', label: 'Tất cả' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'cooldown', label: 'Tạm dừng' },
    { key: 'banned', label: 'Bị khoá' },
  ];

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Tài khoản GG</h1>
        <p className="text-on-surface-variant mt-1">Tổng {total} tài khoản Google Maps của worker</p>
      </header>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm theo tên TK, email, hoặc tên worker..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 bg-surface-container border border-white/10 rounded-lg py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              statusFilter === t.key
                ? 'bg-primary-neon/20 text-primary-neon border border-primary-neon/30'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Đang tải...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Không có tài khoản nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Tên TK</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Email GG</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Level</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Worker</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Jobs</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Trạng thái</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts.map((acc: any) => {
                  const st = STATUS_LABELS[acc.status] || STATUS_LABELS.banned;
                  const isEditingName = editing?.id === acc.id && editing.field === 'accountName';
                  const isEditingLevel = editing?.id === acc.id && editing.field === 'level';
                  return (
                    <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                      {/* Account Name */}
                      <td className="p-4">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSave(acc.id, 'accountName', editValue); if (e.key === 'Escape') setEditing(null); }}
                              className="bg-surface-container border border-primary-neon/50 rounded px-2 py-1 text-on-surface text-sm w-40 focus:outline-none"
                            />
                            <button onClick={() => handleSave(acc.id, 'accountName', editValue)} className="text-green-400 hover:text-green-300">
                              {savingId === acc.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditing(null)} className="text-on-surface-variant hover:text-red-400"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">{acc.accountName}</span>
                            <button onClick={() => { setEditing({ id: acc.id, field: 'accountName' }); setEditValue(acc.accountName); }} className="text-on-surface-variant hover:text-primary-neon transition-colors opacity-0 group-hover:opacity-100">
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Email */}
                      <td className="p-4 text-on-surface-variant text-xs">{acc.accountEmail || '-'}</td>
                      {/* Level */}
                      <td className="p-4">
                        {isEditingLevel ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              type="number"
                              min={1} max={10}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSave(acc.id, 'level', editValue); if (e.key === 'Escape') setEditing(null); }}
                              className="bg-surface-container border border-primary-neon/50 rounded px-2 py-1 text-on-surface text-sm w-16 focus:outline-none"
                            />
                            <button onClick={() => handleSave(acc.id, 'level', editValue)} className="text-green-400 hover:text-green-300">
                              {savingId === acc.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditing(null)} className="text-on-surface-variant hover:text-red-400"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-yellow-400">Lv {acc.level}</span>
                            <button onClick={() => { setEditing({ id: acc.id, field: 'level' }); setEditValue(String(acc.level)); }} className="text-on-surface-variant hover:text-primary-neon transition-colors">
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Worker */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <UserCircle size={16} className="text-on-surface-variant shrink-0" />
                          <div>
                            <p className="font-bold text-on-surface text-xs">{acc.worker?.name || '-'}</p>
                            <p className="text-[10px] text-on-surface-variant">{acc.worker?.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Jobs count */}
                      <td className="p-4 text-on-surface text-xs">{acc._count?.reviewItems ?? 0} job</td>
                      {/* Status */}
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditing({ id: acc.id, field: 'accountName' }); setEditValue(acc.accountName); }}
                            className="p-1.5 bg-surface-container rounded-lg text-on-surface-variant hover:text-primary-neon hover:bg-surface-container-high transition-colors"
                            title="Sửa tên"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            disabled={savingId === acc.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                              acc.status === 'active'
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {acc.status === 'active' ? 'Khoá' : 'Mở khoá'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Trang {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
