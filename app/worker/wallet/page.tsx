'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Wallet as WalletIcon, ArrowDownRight, Clock, CreditCard, Banknote, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkerWalletPage() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', bankName: '', bankAccount: '', accountHolder: '' });
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/wallet/transactions'),
      ]);
      const walletData = await walletRes.json();
      const txData = await txRes.json();
      if (walletData.availableBalance !== undefined) setWallet(walletData);
      if (txData.transactions) setTransactions(txData.transactions);
    } catch {
      setError('Không thể tải dữ liệu ví.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawData.amount || !withdrawData.bankName || !withdrawData.bankAccount || !withdrawData.accountHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...withdrawData, amount: Number(withdrawData.amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Yêu cầu rút tiền đã được gửi!');
        setShowWithdraw(false);
        setWithdrawData({ amount: '', bankName: '', bankAccount: '', accountHolder: '' });
        fetchData();
      } else {
        toast.error(data.error || 'Không thể rút tiền.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Ví Worker</h1>
        <p className="text-on-surface-variant">Quản lý thu nhập và rút tiền.</p>
      </div>

      {error && (
        <div className="glass-card p-4 rounded-lg text-red-400 text-center mb-6">
          {error}
          <button onClick={fetchData} className="ml-3 underline text-primary-neon">Thử lại</button>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Main Balance */}
        <div className="md:col-span-2 bg-gradient-to-br from-primary-neon/20 via-surface-container to-[#111827] rounded-[2rem] p-8 border border-primary-neon/30 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-neon/20 blur-[50px] rounded-full group-hover:bg-primary-neon/30 transition-colors"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-on-surface-variant text-sm uppercase tracking-widest font-bold mb-2">Số dư khả dụng</p>
              <h2 className="text-5xl font-black text-on-surface tracking-tighter drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                {Number(wallet?.availableBalance || 0).toLocaleString()} <span className="text-2xl text-primary-neon">VND</span>
              </h2>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
              <WalletIcon size={28} />
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
            <button
              onClick={() => setShowWithdraw(!showWithdraw)}
              className="bg-primary-neon text-surface px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(0,245,255,0.4)]"
            >
              <ArrowDownRight size={18} />
              Rút tiền
            </button>
            <div className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface-variant text-sm flex items-center gap-2 border border-white/5">
              <ShieldCheck size={16} className="text-green-400" />
              Giao dịch an toàn 100%
            </div>
          </div>
        </div>

        {/* Secondary Card */}
        <div className="bg-surface-container rounded-[2rem] p-8 border border-white/5 flex flex-col justify-between">
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Tổng thu nhập</p>
            <h3 className="text-2xl font-bold text-on-surface">{Number(wallet?.totalEarned || wallet?.totalSpent || 0).toLocaleString()}đ</h3>
          </div>
          <div className="pt-6 border-t border-white/5 mt-6">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Đã rút</p>
            <h3 className="text-xl font-bold text-on-surface">{Number(wallet?.totalWithdrawn || 0).toLocaleString()}đ</h3>
          </div>
        </div>
      </div>

      {/* Withdraw Form */}
      {showWithdraw && (
        <form onSubmit={handleWithdraw} className="glass-card rounded-lg p-6 mb-10 space-y-4">
          <h3 className="font-bold text-on-surface text-lg mb-2">Yêu cầu rút tiền</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số tiền (VND) *</label>
              <input
                type="number"
                value={withdrawData.amount}
                onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                placeholder="100000"
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Ngân hàng *</label>
              <input
                type="text"
                value={withdrawData.bankName}
                onChange={(e) => setWithdrawData({ ...withdrawData, bankName: e.target.value })}
                placeholder="Vietcombank"
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số tài khoản *</label>
              <input
                type="text"
                value={withdrawData.bankAccount}
                onChange={(e) => setWithdrawData({ ...withdrawData, bankAccount: e.target.value })}
                placeholder="0123456789"
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Chủ tài khoản *</label>
              <input
                type="text"
                value={withdrawData.accountHolder}
                onChange={(e) => setWithdrawData({ ...withdrawData, accountHolder: e.target.value })}
                placeholder="NGUYEN VAN A"
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
              Gửi yêu cầu
            </button>
            <button
              type="button"
              onClick={() => setShowWithdraw(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-white/10"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Transaction History */}
      <div className="bg-surface-container rounded-2xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container-low">
          <h3 className="text-lg font-bold text-on-surface">Lịch sử giao dịch</h3>
          <CreditCard className="text-on-surface-variant" size={20} />
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Chưa có giao dịch nào phát sinh.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111827] text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Mã GD</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4">Số tiền</th>
                  <th className="px-6 py-4">Nội dung</th>
                </tr>
              </thead>
              <tbody className="text-on-surface divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant flex items-center gap-2">
                      <Clock size={14} />
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant opacity-70">
                      #{tx.id.split('-')[0]}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.type === 'earning' || tx.type === 'deposit' ? 'bg-green-400/10 text-green-400' :
                        tx.type === 'withdraw' ? 'bg-red-400/10 text-red-400' :
                        'bg-blue-400/10 text-blue-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-bold ${Number(tx.changeAmount) > 0 ? 'text-green-400' : 'text-on-surface'}`}>
                      {Number(tx.changeAmount) > 0 ? '+' : ''}{Number(tx.changeAmount).toLocaleString()}đ
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs max-w-xs truncate">
                      {tx.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
