'use client';

import React, { useEffect, useState } from 'react';
import { UserCircle, PlusCircle, Mail, Star, Briefcase, Loader2, Link2, ToggleLeft, ToggleRight, Pencil, Check, X, RefreshCw, History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkerAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ accountName: '', accountEmail: '', profileUrl: '', level: '1' });
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [checkingLevel, setCheckingLevel] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/worker/accounts');
      const data = await res.json();
      if (data.accounts) setAccounts(data.accounts);
      else if (data.error) setError(data.error);
    } catch {
      setError('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountName) { toast.error('Vui lòng nhập tên tài khoản.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/worker/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, level: Number(formData.level) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Thêm tài khoản thành công!');
        setShowForm(false);
        setFormData({ accountName: '', accountEmail: '', profileUrl: '', level: '1' });
        fetchAccounts();
      } else {
        toast.error(data.error || 'Không thể thêm tài khoản.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (acc: any) => {
    setTogglingId(acc.id);
    const newStatus = acc.status === 'active' ? 'cooldown' : 'active';
    try {
      const res = await fetch(`/api/worker/accounts/${acc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === 'active' ? 'Đã bật tài khoản' : 'Đã tạm dừng tài khoản');
        fetchAccounts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Không thể cập nhật.');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveName = async (accId: string) => {
    if (!editNameValue.trim()) { toast.error('Tên không được để trống.'); return; }
    try {
      const res = await fetch(`/api/worker/accounts/${accId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName: editNameValue.trim() }),
      });
      if (res.ok) {
        toast.success('Đã cập nhật tên');
        setEditingName(null);
        fetchAccounts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Lỗi cập nhật');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    }
  };

  const handleCheckLevel = async (accId: string) => {
    setCheckingLevel(accId);
    try {
      const res = await fetch(`/api/worker/accounts/${accId}/check-level`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Phát hiện Level ${data.level}! Đã cập nhật.`);
        fetchAccounts();
      } else {
        toast.error(data.error || 'Không thể kiểm tra level.');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
      setCheckingLevel(null);
    }
  };

  const toggleHistory = async (accId: string) => {
    if (expandedHistoryId === accId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(accId);
    if (historyMap[accId]) return;
    setHistoryLoading(accId);
    try {
      const res = await fetch(`/api/worker/accounts/${accId}/history?limit=10`);
      const data = await res.json();
      setHistoryMap(prev => ({ ...prev, [accId]: data.items || [] }));
    } catch {
      toast.error('Không tải được lịch sử');
    } finally {
      setHistoryLoading(null);
    }
  };

  // Stats
  const totalCount = accounts.length;
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const cooldownCount = accounts.filter(a => a.status === 'cooldown').length;

  const inputCls = "w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Tài khoản Google</h1>
          <p className="text-on-surface-variant">Quản lý tài khoản Google Maps của bạn.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)] flex items-center gap-2"
        >
          <PlusCircle size={18} />
          Thêm tài khoản
        </button>
      </div>

      {/* Stats row */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 rounded-lg text-center">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tổng tài khoản</p>
            <p className="text-2xl font-bold text-on-surface">{totalCount}</p>
          </div>
          <div className="glass-card p-4 rounded-lg text-center border-l-2 border-green-400">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Đang hoạt động</p>
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          </div>
          <div className="glass-card p-4 rounded-lg text-center border-l-2 border-yellow-400">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tạm dừng</p>
            <p className="text-2xl font-bold text-yellow-400">{cooldownCount}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card rounded-lg p-6 mb-8 space-y-4">
          <h3 className="font-bold text-on-surface text-lg mb-2">Thêm tài khoản mới</h3>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tên tài khoản *</label>
            <input type="text" value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} placeholder="Nguyen Van A - GM01" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Email</label>
            <input type="email" value={formData.accountEmail} onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })} placeholder="account@gmail.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Link Profile Local Guide</label>
            <input type="text" value={formData.profileUrl} onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })} placeholder="https://maps.google.com/contrib/..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Level hiện tại (tạm nhập, dùng nút Check để tự động cập nhật)</label>
            <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className={inputCls}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>Level {lvl}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              Thêm
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-white/10">Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="glass-card p-6 rounded-lg text-center text-red-400">
          {error}
          <button onClick={fetchAccounts} className="ml-3 underline text-primary-neon">Thử lại</button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-10 rounded-lg text-center text-on-surface-variant">
          Chưa có tài khoản nào. Hãy thêm tài khoản Google Maps để bắt đầu nhận việc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="glass-card rounded-lg p-6 hover:shadow-[0_0_20px_rgba(0,245,255,0.1)] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon border border-primary-neon/30 shrink-0">
                  <UserCircle size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Account Name (editable) */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {editingName === acc.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(acc.id); if (e.key === 'Escape') setEditingName(null); }}
                          className="flex-1 bg-surface-container border border-primary-neon/50 rounded-lg px-2 py-1 text-sm text-on-surface focus:outline-none min-w-0"
                        />
                        <button onClick={() => handleSaveName(acc.id)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                        <button onClick={() => setEditingName(null)} className="text-on-surface-variant hover:text-red-400"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-bold text-on-surface truncate">{acc.accountName || acc.name}</h4>
                        <button onClick={() => { setEditingName(acc.id); setEditNameValue(acc.accountName || ''); }} className="text-on-surface-variant hover:text-primary-neon transition-colors shrink-0">
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                    {editingName !== acc.id && (
                      <button onClick={() => handleToggle(acc)} disabled={togglingId === acc.id} className="shrink-0 ml-1" title={acc.status === 'active' ? 'Tạm dừng' : 'Bật lại'}>
                        {acc.status === 'active' ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-on-surface-variant" />}
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  {(acc.accountEmail || acc.email) && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                      <Mail size={12} />
                      {acc.accountEmail || acc.email}
                    </p>
                  )}

                  {/* Profile Link */}
                  {acc.profileUrl && (
                    <a href={acc.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-neon flex items-center gap-1 mt-1 hover:underline truncate max-w-full">
                      <Link2 size={12} className="shrink-0" />
                      <span className="truncate">{acc.profileUrl}</span>
                    </a>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container border border-white/5">
                      <Star size={12} className="text-yellow-400" />
                      <span>Level {acc.level || 1}</span>
                      <button
                        onClick={() => handleCheckLevel(acc.id)}
                        disabled={checkingLevel === acc.id}
                        className="ml-1 text-primary-neon hover:text-primary-neon/70 transition-colors"
                        title="Kiểm tra level tự động"
                      >
                        {checkingLevel === acc.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      </button>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container border border-white/5">
                      <Briefcase size={12} className="text-primary-neon" />
                      {acc.totalJobsDone || 0} jobs
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {acc.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* History toggle */}
                  <button
                    onClick={() => toggleHistory(acc.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary-neon transition-colors"
                  >
                    {historyLoading === acc.id ? <Loader2 size={12} className="animate-spin" /> : <History size={12} />}
                    Lịch sử review
                    {expandedHistoryId === acc.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {/* History list */}
                  {expandedHistoryId === acc.id && (
                    <div className="mt-2 space-y-2">
                      {historyLoading === acc.id ? (
                        <p className="text-xs text-on-surface-variant">Đang tải...</p>
                      ) : (historyMap[acc.id] || []).length === 0 ? (
                        <p className="text-xs text-on-surface-variant">Chưa có lịch sử review với tài khoản này</p>
                      ) : (
                        (historyMap[acc.id] || []).map((item: any) => (
                          <div key={item.id} className="bg-surface-container rounded-lg p-2.5 text-xs">
                            <div className="flex justify-between items-start">
                              <div className="min-w-0 mr-2">
                                <p className="font-bold text-on-surface truncate">{item.campaign?.mapLocation?.name || 'N/A'}</p>
                                <p className="text-on-surface-variant mt-0.5">{item.pricingTier?.name || item.campaign?.pricingTier?.name || '-'}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  item.status === 'live' || item.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                  item.status === 'pending_verify' ? 'bg-yellow-500/10 text-yellow-400' :
                                  item.status === 'rejected' || item.status === 'dropped' ? 'bg-red-500/10 text-red-400' :
                                  'bg-surface-container text-on-surface-variant'
                                }`}>{item.status}</span>
                                {item.publishedUrl && (
                                  <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="text-primary-neon hover:text-primary-neon/70">
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
