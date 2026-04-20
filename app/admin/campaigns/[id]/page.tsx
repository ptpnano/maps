'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, User, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const statusLabel: Record<string, string> = {
  pending: 'Chờ duyệt', active: 'Hoạt động', paused: 'Tạm dừng',
  completed: 'Hoàn thành', cancelled: 'Đã hủy', draft: 'Nháp'
};
const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400', active: 'bg-green-500/10 text-green-400',
  paused: 'bg-orange-500/10 text-orange-400', completed: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-red-500/10 text-red-400',
};
const jobStatusStyle: Record<string, string> = {
  pending: 'bg-surface-container text-on-surface-variant', in_progress: 'bg-blue-500/10 text-blue-400',
  pending_verify: 'bg-orange-500/10 text-orange-400', completed: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400', timeout: 'bg-gray-500/10 text-gray-400',
};

export default function AdminCampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaign(data.campaign);
    } catch (err: any) {
      toast.error(err.message || 'Không tải được chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaign(); }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Lỗi');
      toast.success('Đã duyệt chiến dịch');
      fetchCampaign();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Lý do từ chối (tùy chọn):');
    if (reason === null) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Bị admin từ chối' })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Lỗi');
      toast.success('Đã từ chối chiến dịch');
      fetchCampaign();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="pt-24 px-6 text-center text-on-surface-variant">
        <p>Không tìm thấy chiến dịch.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary-neon underline">Quay lại</button>
      </div>
    );
  }

  const completedJobs = (campaign.reviewItems || []).filter((j: any) => j.status === 'completed').length;
  const totalJobs = campaign.reviewItems?.length ?? 0;

  return (
    <main className="pt-24 px-6 pb-32 max-w-6xl mx-auto space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-on-surface-variant hover:text-primary-neon transition-colors text-sm">
        <ArrowLeft size={16} />
        Quay lại
      </button>

      {/* Header */}
      <header className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle[campaign.status] || 'bg-surface-container text-on-surface-variant'}`}>
                {statusLabel[campaign.status] || campaign.status}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-on-surface font-headline">{campaign.mapLocation?.name}</h1>
            {campaign.mapLocation?.googleMapsUrl && (
              <a href={campaign.mapLocation.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary-neon text-xs hover:underline flex items-center gap-1 mt-1">
                <MapPin size={12} />
                Xem trên Google Maps
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {campaign.status === 'pending' && (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 rounded-xl font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                <CheckCircle size={16} />
                Duyệt
              </button>
              <button onClick={handleReject} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50">
                <XCircle size={16} />
                Từ chối
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/5">
          <div>
            <p className="text-xs text-on-surface-variant mb-1">Khách hàng</p>
            <p className="font-bold text-on-surface">{campaign.client?.name || '-'}</p>
            <p className="text-xs text-on-surface-variant">{campaign.client?.email}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant mb-1">Số dư KH</p>
            <p className="font-bold text-primary-neon">{Number(campaign.client?.wallet?.availableBalance || 0).toLocaleString('vi-VN')} đ</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant mb-1">Tổng ngân sách</p>
            <p className="font-bold text-on-surface">{Number(campaign.frozenAmount || 0).toLocaleString('vi-VN')} đ</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant mb-1">Tiến độ</p>
            <p className="font-bold text-on-surface">{completedJobs} / {totalJobs} job</p>
          </div>
        </div>
      </header>

      {/* Tier Items */}
      {campaign.tierItems?.length > 0 && (
        <section className="glass-card rounded-lg p-6 space-y-3">
          <h2 className="font-bold text-on-surface">Cấu hình gói review</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {campaign.tierItems.map((ti: any) => (
              <div key={ti.id} className="bg-surface-container rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-on-surface">{ti.pricingTier?.name}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Level GG: {ti.pricingTier?.minAccountLevel ?? 1}–{ti.pricingTier?.maxAccountLevel ?? 10}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-neon">×{ti.quantity}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">{Number(ti.pricingTier?.pricePerReview || 0).toLocaleString('vi-VN')}đ/review</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review Items */}
      <section className="glass-card rounded-lg overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-bold text-on-surface">Danh sách review ({totalJobs} items)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">Gói</th>
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">Worker</th>
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">TK GG</th>
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">Trạng thái</th>
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">URL review</th>
                <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest">Bằng chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(campaign.reviewItems || []).map((job: any) => (
                <tr key={job.id} className="hover:bg-white/5">
                  <td className="p-4 text-on-surface">{job.pricingTier?.name || '-'}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-on-surface">{job.assignedWorker?.name || '–'}</p>
                      {job.assignedWorker?.trustScore != null && (
                        <p className="text-xs text-on-surface-variant">Uy tín: {job.assignedWorker.trustScore}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {job.assignedAccount ? `${job.assignedAccount.accountName} (Lv${job.assignedAccount.level})` : '–'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${jobStatusStyle[job.status] || ''}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {job.publishedUrl ? (
                      <a href={job.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-primary-neon text-xs hover:underline flex items-center gap-1">
                        Xem <ExternalLink size={10} />
                      </a>
                    ) : '–'}
                  </td>
                  <td className="p-4">
                    {job.proofScreenshot ? (
                      <a href={job.proofScreenshot} target="_blank" rel="noopener noreferrer" className="text-primary-neon text-xs hover:underline flex items-center gap-1">
                        Xem <ExternalLink size={10} />
                      </a>
                    ) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
