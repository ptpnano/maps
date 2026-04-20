'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, Megaphone, Star, TrendingUp, DollarSign } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface AdminStats {
  users: { total: number; clients: number; workers: number; pendingWorkers: number };
  campaigns: { total: number; active: number };
  reviews: { pending?: number; assigned?: number; pending_verify?: number; verifying?: number; holding?: number; live?: number; dropped?: number; expired?: number };
  recentTransactions: any[];
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Lỗi tải thống kê:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Tổng người dùng', value: stats?.users?.total ?? 0, icon: Users, color: 'text-primary-neon', border: 'border-primary-neon' },
    { label: 'Khách hàng', value: stats?.users?.clients ?? 0, icon: UserCheck, color: 'text-green-400', border: 'border-green-400' },
    { label: 'Worker', value: stats?.users?.workers ?? 0, icon: Star, color: 'text-secondary-neon', border: 'border-secondary-neon' },
    { label: 'Worker chờ duyệt', value: stats?.users?.pendingWorkers ?? 0, icon: Clock, color: 'text-yellow-400', border: 'border-yellow-400' },
    { label: 'Chiến dịch hoạt động', value: stats?.campaigns?.active ?? 0, icon: Megaphone, color: 'text-green-400', border: 'border-green-400' },
    { label: 'Tổng chiến dịch', value: stats?.campaigns?.total ?? 0, icon: TrendingUp, color: 'text-primary-neon', border: 'border-primary-neon' },
  ];

  const breakdown = stats?.reviews;

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Admin Dashboard</h1>
        <p className="text-on-surface-variant mt-1">Tổng quan hệ thống MapBoost Neon</p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-surface-container-low p-5 rounded-lg border-l-4 ${card.border}`}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className={card.color} />
                <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">{card.label}</p>
              </div>
              <p className={`text-3xl font-bold text-on-surface`}>{card.value.toLocaleString()}</p>
            </div>
          );
        })}
      </section>

      {/* Review Status Breakdown */}
      {breakdown && (
        <section className="glass-card p-6 rounded-lg">
          <h2 className="font-headline font-bold text-xl mb-4 text-on-surface">Trạng thái Review</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Chờ giao', value: breakdown.pending ?? 0, color: 'text-yellow-400' },
              { label: 'Đã giao', value: breakdown.assigned ?? 0, color: 'text-blue-400' },
              { label: 'Chờ xác minh', value: breakdown.pending_verify ?? 0, color: 'text-orange-400' },
              { label: 'Hoàn thành', value: breakdown.live ?? 0, color: 'text-green-400' },
              { label: 'Từ chối', value: breakdown.dropped ?? 0, color: 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className="bg-surface-container p-4 rounded-lg text-center">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section className="glass-card rounded-lg overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-headline font-bold text-xl flex items-center gap-2">
            <DollarSign size={20} className="text-primary-neon" />
            Giao dịch gần đây
          </h2>
        </div>
        <div className="divide-y divide-white/5">
          {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
            <div className="p-10 text-center text-on-surface-variant">Chưa có giao dịch nào</div>
          ) : (
            stats.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-bold text-on-surface">{tx.user?.name || tx.userId}</p>
                  <p className="text-xs text-on-surface-variant">{tx.type} - {tx.reason || ''}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${Number(tx.changeAmount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(tx.changeAmount) >= 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(Number(tx.changeAmount))} đ
                  </p>
                  <p className="text-[10px] text-on-surface-variant">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
