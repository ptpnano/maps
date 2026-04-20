'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Search, Bell, Plus, Star, Lightbulb, Zap, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        if (data.campaigns) setCampaigns(data.campaigns);
      } catch (error) {
        console.error('Lỗi khi tải chiến dịch', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const userName = session?.user?.name || 'Người dùng';
  const userInitials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const activeCount = campaigns.filter(c => c.status === 'active').length;
  const totalReviews = campaigns.reduce((acc, c) => acc + c.totalReviews, 0);
  const filtered = search ? campaigns.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.mapLocation?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.status.includes(search.toLowerCase())
  ) : campaigns;

  return (
    <div className="min-h-screen pb-32">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-surface w-full h-16 flex items-center justify-between px-8 border-b border-white/5">
        <div className="flex items-center space-x-4 flex-1">
          <h1 className="text-on-surface text-lg font-extrabold tracking-tighter uppercase italic mr-8">NEON VELOCITY</h1>
          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input className="bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary-neon w-full transition-all outline-none" placeholder="Tìm kiếm chiến dịch..." type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <button className="text-on-surface-variant hover:text-primary-neon transition-colors relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="h-8 w-[1px] bg-white/10"></div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-on-surface hidden lg:block">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-primary-neon flex items-center justify-center text-surface font-bold text-xs overflow-hidden">{userInitials}</div>
          </div>
        </div>
      </header>

      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Quản lý chiến dịch</h2>
            <p className="text-on-surface-variant text-lg">Theo dõi và tối ưu hóa hiệu suất đánh giá Google Maps của bạn.</p>
          </div>
          <Link href="/dashboard/campaigns/new" className="bg-gradient-to-br from-primary-neon/80 to-primary-neon text-surface font-bold px-8 py-4 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,245,255,0.3)] hover:scale-[1.02] transition-transform">
            <Plus size={20} />
            <span>Tạo chiến dịch mới</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-primary-neon">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Tổng chiến dịch</p>
            <p className="text-3xl font-bold text-on-surface">{campaigns.length}</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-green-400">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Đang hoạt động</p>
            <p className="text-3xl font-bold text-on-surface">{activeCount}</p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-secondary-neon">
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-1">Tổng Review nhận</p>
            <p className="text-3xl font-bold text-on-surface">{new Intl.NumberFormat('vi-VN').format(totalReviews)}</p>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-1 lg:col-span-2 xl:col-span-3 text-center py-10 text-on-surface-variant">
              <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
              Đang tải chiến dịch...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="col-span-1 lg:col-span-2 xl:col-span-3 text-center py-10">
              <h3 className="text-xl text-on-surface mb-2">Bạn chưa có chiến dịch nào</h3>
              <p className="text-on-surface-variant mb-6">Hãy tạo chiến dịch đầu tiên để tăng tương tác trên Google Maps.</p>
            </div>
          ) : (
            filtered.map((campaign: any) => {
              const statusColor = campaign.status === 'active' ? 'text-green-400' : campaign.status === 'completed' ? 'text-on-surface-variant' : 'text-primary-neon';
              const bgColor = campaign.status === 'active' ? 'bg-green-400/10' : campaign.status === 'completed' ? 'bg-surface-variant' : 'bg-primary-neon/10';
              const borderColor = campaign.status === 'active' ? 'border-green-400/20' : campaign.status === 'completed' ? 'border-outline-variant/20' : 'border-primary-neon/20';
              const progress = Math.min(100, Math.round(((campaign._count?.reviewItems || 0) / campaign.totalReviews) * 100)); // live+holding count from API

              return (
                <Link href={`/dashboard/campaigns/${campaign.id}`} key={campaign.id}>
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[#111827] rounded-[20px] p-6 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden border border-white/5 h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="inline-block px-3 py-1 rounded-full bg-secondary-neon/20 text-secondary-neon text-[10px] font-bold uppercase tracking-wider border border-secondary-neon/30 mb-3">{campaign.pricingTier?.name || 'Gói Dịch Vụ'}</span>
                        <h3 className="text-xl font-bold text-on-surface group-hover:text-primary-neon transition-colors truncate max-w-[200px]">{campaign.name || campaign.mapLocation?.name || 'Vị trí bản đồ'}</h3>
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 ${bgColor} rounded-full border ${borderColor}`}>
                        <span className={`w-2 h-2 ${statusColor.replace('text-', 'bg-')} rounded-full ${campaign.status === 'active' ? 'animate-pulse shadow-[0_0_10px_currentColor]' : ''}`}></span>
                        <span className={`text-[10px] font-bold ${statusColor} uppercase`}>{campaign.status}</span>
                      </div>
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between text-xs font-medium text-on-surface-variant mb-2">
                        <span>{campaign.status === 'completed' ? 'Đã đạt mục tiêu' : 'Mục tiêu đánh giá'}</span>
                        <span className={`${campaign.status === 'completed' ? 'text-green-400' : 'text-primary-neon'} font-bold`}>{campaign.totalReviews} review</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className={`h-full ${campaign.status === 'completed' ? 'bg-green-400' : 'bg-primary-neon'} rounded-full shadow-[0_0_10px_rgba(0,245,255,0.5)] transition-all duration-1000`} style={{ width: `100%` }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Đóng băng</p>
                        <p className="text-lg font-bold text-on-surface">{Number(campaign.frozenAmount).toLocaleString()}đ</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tốc độ ưu tiên</p>
                        <div className="flex items-center justify-center space-x-1">
                          <p className="text-lg font-bold text-on-surface">{campaign.maxReviewsPerDay}/ngày</p>
                          <Clock size={12} className="text-primary-neon" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })
          )}

          {/* Create New Card */}
          <Link href="/dashboard/campaigns/new" className="bg-surface-container-low border-2 border-dashed border-white/10 rounded-[20px] p-6 flex flex-col items-center justify-center text-center group hover:border-primary-neon/50 hover:bg-surface-container transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="text-primary-neon" size={32} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Thêm chiến dịch mới</h3>
            <p className="text-sm text-on-surface-variant max-w-[200px]">Mở rộng phạm vi tiếp cận của thương hiệu ngay hôm nay.</p>
          </Link>
        </div>

        {/* Quick Tips */}
        <div className="mt-16 bg-gradient-to-r from-surface-container-low to-surface-container-lowest p-8 rounded-lg border-l-4 border-primary-neon flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-primary-neon mb-2">
              <Lightbulb size={16} />
              <span className="text-xs uppercase font-bold tracking-widest">Mẹo tối ưu hóa</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-4 font-headline">Làm thế nào để tăng tỷ lệ chuyển đổi review?</h3>
            <p className="text-on-surface-variant leading-relaxed">Sử dụng hình ảnh thực tế và trả lời phản hồi khách hàng trong vòng 24 giờ. Các chiến dịch có ảnh chụp thực tế từ khách hàng thường đạt hiệu quả cao hơn 40% so with review thông thường.</p>
          </div>
          <button className="bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-bold hover:bg-surface-bright transition-colors border border-white/5">Xem hướng dẫn</button>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-28 right-8 z-50">
        <button className="w-14 h-14 bg-primary-neon text-surface rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95 group relative">
          <Zap size={24} fill="currentColor" />
          <span className="absolute right-full mr-4 px-3 py-1 bg-surface-container-highest text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tối ưu nhanh</span>
        </button>
      </div>
    </div>
  );
}
