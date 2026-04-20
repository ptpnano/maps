'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, ChevronLeft, ChevronRight, MapPin, CheckCircle, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'draft';

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/campaigns?${params}`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleApprove = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi');
      }
      toast.success('Đã duyệt chiến dịch');
      await fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (campaignId: string) => {
    const reason = prompt('Lý do từ chối (tùy chọn):');
    if (reason === null) return; // cancelled
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Bị admin từ chối' })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi');
      }
      toast.success('Đã từ chối chiến dịch, tiền đã hoàn lại');
      await fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'paused', label: 'Tạm dừng' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];

  const statusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-400';
      case 'active': return 'bg-green-500/10 text-green-400';
      case 'completed': return 'bg-blue-500/10 text-blue-400';
      case 'paused': return 'bg-orange-500/10 text-orange-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  };

  const statusLabel: Record<string, string> = {
    pending: 'Chờ duyệt',
    active: 'Hoạt động',
    paused: 'Tạm dừng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    draft: 'Nháp',
  };

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Quản lý chiến dịch</h1>
        <p className="text-on-surface-variant mt-1">Tổng cộng {total} chiến dịch</p>
      </header>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Tìm theo tên địa điểm hoặc khách hàng..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 bg-surface-container border border-white/10 rounded-lg px-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              statusFilter === tab.key
                ? 'bg-primary-neon/20 text-primary-neon border border-primary-neon/30'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Đang tải...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Không có chiến dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Khách hàng</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Vị trí</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Loại tài khoản</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Tổng review</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Trạng thái</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Ngân sách</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c: any) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                  >
                    <td className="p-4 font-bold text-on-surface">{c.client?.name || '-'}</td>
                    <td className="p-4 text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary-neon" />
                        {c.mapLocation?.name || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      {c.tierItems && c.tierItems.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tierItems.map((ti: any) => (
                            <span key={ti.id} className="text-[10px] bg-surface-container px-2 py-0.5 rounded font-bold text-on-surface-variant">
                              {ti.pricingTier?.name} ×{ti.quantity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-on-surface-variant text-xs">{c.pricingTier?.name || '-'}</span>
                      )}
                    </td>
                    <td className="p-4 text-on-surface">{c.totalReviews}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle(c.status)}`}>
                        {statusLabel[c.status] || c.status}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface">{new Intl.NumberFormat('vi-VN').format(Number(c.frozenAmount || 0))} đ</td>
                    <td className="p-4">
                      {c.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(c.id); }}
                            disabled={actionLoading === c.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            Duyệt
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReject(c.id); }}
                            disabled={actionLoading === c.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
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
      </div>
    </main>
  );
}
