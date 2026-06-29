'use client';

import React, { useEffect, useState } from 'react';
import { Filter, History } from 'lucide-react';
import { YoutubeHistoryTable } from '@/components/YoutubeServicePage';
import { toast } from 'sonner';

export default function YoutubeHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [serviceType, setServiceType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (serviceType) params.set('serviceType', serviceType);
        if (status) params.set('status', status);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/youtube/orders?${params}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch {
        toast.error('Không thể tải lịch sử YouTube');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [serviceType, status, from, to]);

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto pb-32 space-y-8">
      <header>
        <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
          <History size={16} />
          YouTube
        </div>
        <h1 className="text-3xl font-extrabold text-on-surface font-headline">Lịch sử dịch vụ YouTube</h1>
        <p className="text-on-surface-variant mt-1">Toàn bộ lịch sử Like, View, Comment và Sub.</p>
      </header>

      <section className="bg-surface-container rounded-lg p-4 border border-white/5">
        <div className="flex items-center gap-2 text-sm font-bold text-on-surface mb-4">
          <Filter size={16} />
          Bộ lọc
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
            <option value="">Tất cả dịch vụ</option>
            <option value="like">Tăng Like</option>
            <option value="view">Tăng View</option>
            <option value="comment">Tăng Comment</option>
            <option value="sub">Tăng Sub</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
            <option value="">Tất cả trạng thái</option>
            <option value="pending_review">Chờ duyệt</option>
            <option value="queued">Đang chờ chạy</option>
            <option value="running">Đang chạy</option>
            <option value="partial">Một phần</option>
            <option value="completed">Hoàn thành</option>
            <option value="rejected">Từ chối</option>
            <option value="failed">Lỗi</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface" />
        </div>
      </section>

      <section className="bg-surface-container rounded-lg border border-white/5 overflow-hidden">
        {loading ? <div className="p-10 text-center text-on-surface-variant">Đang tải...</div> : <YoutubeHistoryTable orders={orders} />}
      </section>
    </main>
  );
}
