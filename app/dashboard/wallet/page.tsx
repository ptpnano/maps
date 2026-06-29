'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, CreditCard, QrCode, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function WalletPage() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          fetch('/api/wallet'),
          fetch('/api/wallet/transactions')
        ]);
        
        const walletData = await walletRes.json();
        const txData = await txRes.json();
        
        if (walletData.availableBalance !== undefined) setWallet(walletData);
        if (txData.transactions) setTransactions(txData.transactions);

        // Fetch bank info
        const bankRes = await fetch('/api/config/public');
        const bankData = await bankRes.json();
        if (bankData.bankName) setBankInfo(bankData);
      } catch (error) {
        console.error("Wallet data load error:", error);
        toast.error("Không thể tải dữ liệu ví");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Ví MapLocals</h1>
        <p className="text-on-surface-variant">Quản lý số dư, tiền tạm giữ và lịch sử giao dịch.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-surface-container rounded-2xl"></div>
          <div className="h-64 bg-surface-container rounded-2xl"></div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Main Balance */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2 bg-gradient-to-br from-primary-neon/20 via-surface-container to-[#111827] rounded-[2rem] p-8 border border-primary-neon/30 relative overflow-hidden group">
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
                <button onClick={() => setShowDeposit(!showDeposit)} className="bg-primary-neon text-surface px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(0,245,255,0.4)]">
                  <ArrowUpRight size={18} />
                  Nạp tiền
                </button>
                <div className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface-variant text-sm flex items-center gap-2 border border-white/5">
                  <ShieldCheck size={16} className="text-green-400" />
                  Giao dịch an toàn 100%
                </div>
              </div>
            </motion.div>

            {/* Frozen / Spent Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-container rounded-[2rem] p-8 border border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Tiền đang đóng băng</p>
                <div className="flex items-end gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-on-surface">{Number(wallet?.frozenBalance || 0).toLocaleString()}đ</h3>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mb-2 animate-pulse"></div>
                </div>
                <p className="text-[10px] text-on-surface-variant">Escrow cho các chiến dịch đang chạy</p>
              </div>

              <div className="pt-6 border-t border-white/5 mt-6">
                <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Đã chi tiêu (Tổng)</p>
                <h3 className="text-xl font-bold text-on-surface">{Number(wallet?.totalSpent || 0).toLocaleString()}đ</h3>
              </div>
            </motion.div>
          </div>

          {/* Deposit QR Section */}
          {showDeposit && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-surface-container rounded-2xl p-6 mb-10 border border-primary-neon/20">
              <div className="flex items-center gap-3 mb-4">
                <QrCode size={20} className="text-primary-neon" />
                <h3 className="text-lg font-bold text-on-surface">Nạp tiền qua chuyển khoản</h3>
              </div>
              {bankInfo ? (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {bankInfo.bankQrUrl && (
                    <div className="p-4 bg-white rounded-2xl shrink-0">
                      <img src={bankInfo.bankQrUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                    </div>
                  )}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-on-surface-variant" />
                      <span className="text-sm text-on-surface-variant">Ngân hàng:</span>
                      <span className="font-bold text-on-surface">{bankInfo.bankName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-on-surface-variant">Số TK:</span>
                      <span className="font-bold text-on-surface font-mono">{bankInfo.bankAccount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-on-surface-variant">Chủ TK:</span>
                      <span className="font-bold text-on-surface">{bankInfo.bankAccountHolder}</span>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                      <p className="font-bold mb-1">Nội dung chuyển khoản:</p>
                      <p className="font-mono text-sm">MAPLOCALS {session?.user?.id?.split('-')[0] || ''}</p>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">Admin sẽ cộng tiền vào ví sau khi xác nhận giao dịch. Thường trong 5-30 phút.</p>
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant text-sm">Chưa cấu hình thông tin ngân hàng. Vui lòng liên hệ admin.</p>
              )}
            </motion.div>
          )}

          {/* Transactions */}
          <div className="bg-surface-container rounded-2xl overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container-low">
              <h3 className="text-lg font-bold text-on-surface">Lịch sử giao dịch</h3>
              <CreditCard className="text-on-surface-variant" size={20} />
            </div>
            
            {transactions.length === 0 ? (
               <div className="p-10 text-center text-on-surface-variant">Chưa có giao dịch nào phát sinh.</div>
            ) : (
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
                          tx.type === 'deposit' ? 'bg-green-400/10 text-green-400' : 
                          tx.type === 'freeze' ? 'bg-yellow-400/10 text-yellow-400' : 
                          tx.type === 'payment' ? 'bg-red-400/10 text-red-400' : 'bg-blue-400/10 text-blue-400'
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
