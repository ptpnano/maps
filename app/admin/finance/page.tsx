'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Deposit form
  const [clients, setClients] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      const res = await fetch(`/api/admin/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải giao dịch');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/users?role=client&limit=100');
      const data = await res.json();
      setClients(data.users || []);
    } catch {
      console.error('Lỗi tải danh sách khách hàng');
    }
  };

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { fetchClients(); }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !depositAmount) {
      toast.error('Vui lòng chọn khách hàng và nhập số tiền');
      return;
    }
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Số tiền không hợp lệ');
      return;
    }

    setDepositing(true);
    try {
      const res = await fetch('/api/admin/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi');
      }
      toast.success('Nạp tiền thành công');
      setSelectedUserId('');
      setDepositAmount('');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Nạp tiền thất bại');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Tài chính</h1>
        <p className="text-on-surface-variant mt-1">Quản lý giao dịch và nạp tiền cho khách hàng</p>
      </header>

      {/* Deposit Form */}
      <section className="glass-card p-6 rounded-lg">
        <h2 className="font-headline font-bold text-xl mb-4 text-on-surface flex items-center gap-2">
          <Send size={20} className="text-primary-neon" />
          Nạp tiền cho khách hàng
        </h2>
        <form onSubmit={handleDeposit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Khách hàng</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary-neon"
            >
              <option value="">-- Chọn khách hàng --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Số tiền (VNĐ)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="100000"
              min="1"
              className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary-neon"
            />
          </div>
          <button
            type="submit"
            disabled={depositing}
            className="bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)] disabled:opacity-50 disabled:hover:scale-100"
          >
            {depositing ? 'Đang xử lý...' : 'Nạp tiền'}
          </button>
        </form>
      </section>

      {/* Transaction Logs */}
      <section className="glass-card rounded-lg overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-headline font-bold text-xl flex items-center gap-2">
            <DollarSign size={20} className="text-primary-neon" />
            Lịch sử giao dịch ({total})
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Đang tải...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Chưa có giao dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Người dùng</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Vai trò</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Loại</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Mô tả</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Số tiền</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-on-surface">{tx.user?.name || '-'}</p>
                      <p className="text-xs text-on-surface-variant">{tx.user?.email || ''}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.user?.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                        tx.user?.role === 'worker' ? 'bg-secondary-neon/10 text-secondary-neon' :
                        'bg-primary-neon/10 text-primary-neon'
                      }`}>
                        {tx.user?.role || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">{tx.type}</td>
                    <td className="p-4 text-on-surface-variant text-xs">{tx.reason || '-'}</td>
                    <td className="p-4">
                      <span className={`font-bold ${Number(tx.changeAmount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(tx.changeAmount) >= 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(Number(tx.changeAmount))} đ
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
      </section>
    </main>
  );
}
