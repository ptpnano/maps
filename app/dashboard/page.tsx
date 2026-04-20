'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, Brain, MapPin, PlusCircle, ChevronRight, UserCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(r => r.json()),
      fetch('/api/wallet').then(r => r.json())
    ]).then(([campData, walletData]) => {
      if (campData.campaigns) setCampaigns(campData.campaigns);
      if (walletData.availableBalance !== undefined) setWallet(walletData);
    }).finally(() => setLoading(false));
  }, []);

  const totalReviews = campaigns.reduce((acc, c) => acc + c.totalReviews, 0);
  const activeCount = campaigns.filter(c => c.status === 'active').length;
  const completedCount = campaigns.filter(c => c.status === 'completed').length;
  const totalBudget = campaigns.reduce((acc, c) => acc + Number(c.totalBudget || 0), 0);

  // Build chart data from campaigns (reviews per day of week)
  const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const chartData = dayNames.map((name, i) => ({
    name,
    growth: campaigns.filter(c => new Date(c.createdAt).getDay() === i).reduce((s, c) => s + c.totalReviews, 0)
  }));
  return (
    <>
      {/* Main Content */}
      <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div className="md:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/10">
              <UserCircle className="text-primary-neon" />
            </div>
            <h1 className="font-headline font-bold tracking-tight text-lg text-primary-neon">Chào {session?.user?.name || 'Captain'}! 🚀</h1>
          </div>
          <Link href="/dashboard/campaigns/new" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)]">
            <PlusCircle size={18} />
            Tạo chiến dịch mới
          </Link>
        </header>

        <div className="md:hidden">
          <Link href="/dashboard/campaigns/new" className="w-full py-4 bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,255,0.3)]">
            🔥 Tạo chiến dịch mới
          </Link>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '⭐ Chiến dịch chạy', value: activeCount.toString(), color: 'text-green-400', icon: Star, status: 'Live' },
            { label: '📝 Tổng Review', value: totalReviews.toString(), color: 'text-primary-neon', icon: MessageSquare, status: `${completedCount} xong` },
            { label: '💰 Ngân sách', value: `${new Intl.NumberFormat('vi-VN').format(totalBudget)}đ`, color: 'text-yellow-400', icon: Brain, status: wallet ? `${new Intl.NumberFormat('vi-VN').format(Number(wallet.availableBalance))}đ dư` : '' },
            { label: '📍 Chiến dịch', value: campaigns.length.toString(), color: 'text-green-400', icon: MapPin, status: 'Tổng' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-5 rounded-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,245,255,0.1)]">
              <div className="flex justify-between items-start mb-4">
                <stat.icon className={stat.color} size={24} fill="currentColor" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.status}</span>
              </div>
              <h3 className="text-on-surface-variant text-sm font-medium mb-1">{stat.label}</h3>
              <p className={`text-3xl font-headline font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </section>

        {/* Growth Chart */}
        <section>
          <div className="glass-card p-6 rounded-lg overflow-hidden relative group">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-headline font-bold text-xl flex items-center gap-2">
                📈 Tăng trưởng Google Maps
              </h2>
              <div className="flex gap-2 items-center">
                <span className="w-3 h-3 rounded-full bg-primary-neon animate-pulse"></span>
                <span className="text-xs text-on-surface-variant uppercase tracking-tighter">Dữ liệu thời gian thực</span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="100%">
                      <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#171f33" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#b9caca" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171f33', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#00f5ff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="growth" 
                    stroke="#00f5ff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorGrowth)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Recent Campaigns */}
        <section className="pb-8">
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="font-headline font-bold text-xl flex items-center gap-2">
                🚀 Chiến dịch gần đây
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="p-10 text-center text-on-surface-variant animate-pulse">Đang tải biểu đồ dữ liệu...</div>
              ) : campaigns.length === 0 ? (
                <div className="p-10 text-center text-on-surface-variant">Chưa có chiến dịch nào </div>
              ) : campaigns.slice(0, 3).map((campaign: any, i: number) => {
                // Mock progress for now
                const cProgress = Math.min(100, Math.round(((campaign._count?.reviewItems || 0) / campaign.totalReviews) * 100)) || 0;
                
                return (
                  <Link href={`/dashboard/campaigns/${campaign.id}`} key={campaign.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors group block">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-highest flex shrink-0 items-center justify-center">
                        <MapPin className="text-on-surface-variant/50" />
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">{campaign.mapLocation?.name || 'Vị trí'}</h4>
                        <p className="text-xs text-on-surface-variant">Hôm nay</p>
                      </div>
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-medium text-primary-neon`}>Tiến độ review</span>
                        <span className={`text-xs font-bold text-primary-neon`}>{campaign.totalReviews} total</span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                        <div className={`bg-primary-neon h-full rounded-full shadow-[0_0_8px_rgba(0,245,255,0.5)]`} style={{ width: `${cProgress}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        campaign.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-secondary-neon/10 text-secondary-neon'
                      }`}>
                        {campaign.status}
                      </span>
                      <ChevronRight className="text-on-surface-variant cursor-pointer hover:text-primary-neon transition-colors" size={20} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
