'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Star, ArrowLeft, Clock, ShieldCheck, Activity, Pause, Play, XCircle, Send, Shield, Edit2, Save, X, Plus, Image as ImageIcon, FileText, ExternalLink, Upload, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const LOCAL_GUIDE_MAP: Record<string, { label: string; color: string }> = {
  basic: { label: 'Thường', color: 'text-on-surface-variant' },
  silver: { label: 'Trung Cấp', color: 'text-yellow-400' },
  vip: { label: 'Cao Cấp', color: 'text-primary-neon' },
};

function getReviewDisplayStatus(item: any) {
  const now = new Date();
  const scheduledAt = item.scheduledAt ? new Date(item.scheduledAt) : null;
  if (item.status === 'pending' && scheduledAt && scheduledAt > now) return { label: 'Queue', color: 'bg-gray-500/10 text-gray-400', dot: 'bg-gray-400' };
  if (item.status === 'pending' && scheduledAt && scheduledAt <= now) return { label: 'Waiting', color: 'bg-yellow-500/10 text-yellow-400', dot: 'bg-yellow-400' };
  if (item.status === 'pending') return { label: 'Queue', color: 'bg-gray-500/10 text-gray-400', dot: 'bg-gray-400' };
  if (item.status === 'assigned') return { label: 'Pending', color: 'bg-blue-500/10 text-blue-400', dot: 'bg-blue-400' };
  if (['pending_verify', 'verifying', 'holding'].includes(item.status)) return { label: 'Review', color: 'bg-orange-500/10 text-orange-400', dot: 'bg-orange-400' };
  if (item.status === 'live') return { label: 'Completed', color: 'bg-green-500/10 text-green-400', dot: 'bg-green-400' };
  if (item.status === 'dropped') return { label: 'Drop', color: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' };
  if (item.status === 'cancelled') return { label: 'Cancel', color: 'bg-purple-500/10 text-purple-400', dot: 'bg-purple-400' };
  return { label: item.status, color: 'bg-gray-500/10 text-gray-400', dot: 'bg-gray-400' };
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // Campaign-level content/image editing
  const [editingCampaign, setEditingCampaign] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newContent, setNewContent] = useState('');

  // Per-review editing
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewEditForm, setReviewEditForm] = useState<{ customContent: string; customImages: string[] }>({ customContent: '', customImages: [] });
  const [savingReview, setSavingReview] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Campaign-level image upload
  const [newCampaignImageUrl, setNewCampaignImageUrl] = useState('');
  const [uploadingCampaignImage, setUploadingCampaignImage] = useState(false);
  const campaignImageFileRef = useRef<HTMLInputElement>(null);

  // Campaign rename
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Expandable review rows
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editScheduleValue, setEditScheduleValue] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.campaign) setCampaign(data.campaign);
    } catch (error) {
      console.error('Fetch campaign error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaign(); }, [id]);

  const handleStatusChange = async (action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel' && !confirm('Hủy chiến dịch sẽ hoàn tiền. Bạn chắc chắn?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi'); }
      toast.success(action === 'pause' ? 'Đã tạm dừng' : action === 'resume' ? 'Đã tiếp tục' : 'Đã hủy chiến dịch');
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setActionLoading(false); }
  };

  const handleDispatch = async (reviewItemId: string) => {
    setDispatchingId(reviewItemId);
    try {
      const res = await fetch(`/api/campaigns/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewItemId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi'); }
      toast.success('Đã giao việc review!');
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setDispatchingId(null); }
  };

  const handleSaveSchedule = async (reviewId: string) => {
    if (!editScheduleValue) return;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/review/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(editScheduleValue).toISOString() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi'); }
      toast.success('Đã cập nhật lịch review');
      setEditingScheduleId(null);
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setSavingSchedule(false); }
  };

  const startEditCampaign = () => {
    setEditForm({
      contentMode: campaign.contentMode,
      customContents: [...(campaign.customContents || [])],
      aiKeywords: [...(campaign.aiKeywords || [])],
      imageMode: campaign.imageMode,
      imageMinCount: campaign.imageMinCount,
      imageMaxCount: campaign.imageMaxCount,
      customImages: [...(campaign.customImages || [])],
      allowDuplicateContent: campaign.allowDuplicateContent ?? true,
      allowDuplicateImages: campaign.allowDuplicateImages ?? true,
    });
    setEditingCampaign(true);
  };

  const saveCampaignEdit = async () => {
    setSavingCampaign(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu chiến dịch');
      toast.success('Đã cập nhật chiến dịch!');
      setEditingCampaign(false);
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setSavingCampaign(false); }
  };

  const startEditReview = (item: any) => {
    setEditingReviewId(item.id);
    setReviewEditForm({
      customContent: item.customContent || '',
      customImages: [...(item.customImages || [])],
    });
    setNewImageUrl('');
  };

  const saveReviewEdit = async (reviewId: string) => {
    setSavingReview(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/review/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewEditForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu review');
      toast.success('Đã cập nhật review!');
      setEditingReviewId(null);
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setSavingReview(false); }
  };

  const handleRenameCampaign = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi'); }
      toast.success('Đã đổi tên chiến dịch!');
      setEditingName(false);
      await fetchCampaign();
    } catch (err: any) { toast.error(err.message); } finally { setSavingName(false); }
  };

  const handleImageUpload = async (files: FileList) => {
    setUploadingImage(true);
    try {
      const uploads = Array.from(files).map(async (file) => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data.url as string;
      });
      const urls = await Promise.all(uploads);
      setReviewEditForm(prev => ({ ...prev, customImages: [...prev.customImages, ...urls] }));
      toast.success(`Tải ${urls.length} ảnh thành công!`);
    } catch { toast.error('Lỗi kết nối khi tải ảnh'); } finally { setUploadingImage(false); }
  };

  const handleCampaignImageUpload = async (files: FileList) => {
    setUploadingCampaignImage(true);
    try {
      const uploads = Array.from(files).map(async (file) => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data.url as string;
      });
      const urls = await Promise.all(uploads);
      setEditForm((f: any) => ({ ...f, customImages: [...(f.customImages || []), ...urls] }));
      toast.success(`Tải ${urls.length} ảnh thành công!`);
    } catch { toast.error('Lỗi kết nối khi tải ảnh'); } finally { setUploadingCampaignImage(false); }
  };

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto flex justify-center items-center h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-neon border-t-transparent rounded-full"></div>
    </div>
  );

  if (!campaign) return (
    <div className="p-8 text-center mt-20">
      <h1 className="text-2xl font-bold text-on-surface">Không tìm thấy chiến dịch</h1>
      <Link href="/dashboard/campaigns" className="text-primary-neon hover:underline mt-4 inline-block">Quay lại danh sách</Link>
    </div>
  );

  const completedReviews = campaign?.reviewItems?.filter((r: any) => ['live', 'holding'].includes(r.status)).length || 0;
  const progressPercent = Math.min(100, Math.round((completedReviews / campaign.totalReviews) * 100));
  const canEdit = ['pending', 'active', 'paused'].includes(campaign.status);

  // Duplicate warnings: when duplicates not allowed and pool is exhausted
  const contentExhausted = campaign.allowDuplicateContent === false
    && campaign.contentMode === 'custom'
    && (campaign.customContents || []).length < campaign.totalReviews;
  const imageExhausted = campaign.allowDuplicateImages === false
    && campaign.imageMode === 'manual'
    && (campaign.customImages || []).length < campaign.totalReviews;

  const statusLabel: Record<string, string> = { pending: 'Chờ duyệt', active: 'Đang chạy', paused: 'Tạm dừng', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    active: 'bg-primary-neon/10 text-primary-neon border-primary-neon/20',
    paused: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <Link href="/dashboard/campaigns" className="flex items-center gap-2 text-on-surface-variant hover:text-primary-neon font-bold mb-8 transition-colors max-w-max">
        <ArrowLeft size={18} /> Quay lại
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Campaign Header Card */}
          <div className="bg-surface-container rounded-2xl p-8 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 flex items-center gap-2">
              <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor[campaign.status] || ''}`}>
                {statusLabel[campaign.status] || campaign.status}
              </span>
              {campaign.status === 'active' && (
                <button onClick={() => handleStatusChange('pause')} disabled={actionLoading} className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50" title="Tạm dừng"><Pause size={16} /></button>
              )}
              {campaign.status === 'paused' && (
                <button onClick={() => handleStatusChange('resume')} disabled={actionLoading} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50" title="Tiếp tục"><Play size={16} /></button>
              )}
              {['active', 'paused', 'pending'].includes(campaign.status) && (
                <button onClick={() => handleStatusChange('cancel')} disabled={actionLoading} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50" title="Hủy"><XCircle size={16} /></button>
              )}
            </div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-surface-container-high rounded-xl flex items-center justify-center text-primary-neon shrink-0"><MapPin size={32} /></div>
              <div>
                <div className="flex items-center gap-2 pr-20 mb-2">
                  {editingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameCampaign(); if (e.key === 'Escape') setEditingName(false); }}
                        className="text-2xl font-extrabold text-on-surface tracking-tight bg-surface-container-high border border-primary-neon/50 rounded-lg px-3 py-1 flex-1 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleRenameCampaign} disabled={savingName} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50">
                        {savingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                      <button onClick={() => setEditingName(false)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">{campaign.name || campaign.mapLocation.name}</h1>
                      {canEdit && (
                        <button
                          onClick={() => { setNameInput(campaign.name || campaign.mapLocation.name); setEditingName(true); }}
                          className="p-1.5 text-on-surface-variant hover:text-primary-neon transition-colors"
                          title="Đổi tên chiến dịch"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-on-surface-variant text-sm flex items-center gap-2"><MapPin size={14} /> {campaign.mapLocation.address}</p>
                <a href={campaign.mapLocation.googleMapsUrl} target="_blank" rel="noreferrer" className="text-primary-neon text-xs hover:underline mt-2 inline-block">Xem trên bản đồ Google</a>
              </div>
            </div>

            {campaign.status === 'pending' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 text-sm text-yellow-400 flex gap-3">
                <Shield className="shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">Chiến dịch đang chờ Admin duyệt</p>
                  <p className="text-yellow-400/70 mt-1">Chiến dịch sẽ bắt đầu chạy sau khi được Admin phê duyệt. Bạn có thể hủy nếu muốn hoàn tiền.</p>
                </div>
              </div>
            )}

            {contentExhausted && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4 text-sm text-orange-400 flex gap-3">
                <Shield className="shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">⚠ Sắp hết nội dung không trùng lặp</p>
                  <p className="text-orange-400/70 mt-1">Bạn đặt không cho phép trùng nội dung nhưng chỉ có {(campaign.customContents || []).length} nội dung cho {campaign.totalReviews} review. Vui lòng thêm nội dung hoặc bật lại cho phép trùng.</p>
                </div>
              </div>
            )}

            {imageExhausted && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4 text-sm text-orange-400 flex gap-3">
                <Shield className="shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">⚠ Sắp hết hình ảnh không trùng lặp</p>
                  <p className="text-orange-400/70 mt-1">Bạn đặt không cho phép trùng hình ảnh nhưng chỉ có {(campaign.customImages || []).length} ảnh cho {campaign.totalReviews} review. Vui lòng thêm ảnh hoặc bật lại cho phép trùng.</p>
                </div>
              </div>
            )}

            <div className="py-6 border-y border-white/5 my-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Tiến độ</p>
                  <p className="text-2xl font-bold text-on-surface mt-1">{completedReviews} <span className="text-base text-on-surface-variant">/ {campaign.totalReviews} review</span></p>
                </div>
                <span className="text-green-400 font-bold text-xl">{progressPercent}%</span>
              </div>
              <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full shadow-[0_0_15px_rgba(74,222,128,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            {campaign.tierItems && campaign.tierItems.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-3">Loại tài khoản</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.tierItems.map((ti: any) => {
                    const guide = LOCAL_GUIDE_MAP[ti.pricingTier?.level] || LOCAL_GUIDE_MAP.basic;
                    return (
                      <div key={ti.id} className="bg-surface-container-lowest px-3 py-2 rounded-lg border border-white/5 text-sm">
                        <span className={`font-bold ${guide.color}`}>{guide.label}</span>
                        <span className="text-on-surface-variant ml-1">× {ti.quantity}</span>
                        <span className="text-on-surface-variant ml-2 text-xs">({Number(ti.pricingTier?.pricePerReview || 0).toLocaleString()}đ/r)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Content</p>
                <p className="font-bold text-on-surface mt-1">{campaign.contentMode === 'ai' ? 'AI Tự Động' : 'Tùy Chỉnh'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Hình ảnh</p>
                <p className="font-bold text-on-surface mt-1">{campaign.imageMode === 'none' ? 'Không' : campaign.imageMode === 'ai' ? `AI (${campaign.imageMinCount}-${campaign.imageMaxCount})` : `Upload (${campaign.imageMinCount}-${campaign.imageMaxCount})`}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Bảo hành tới</p>
                <p className="font-bold text-on-surface mt-1">{campaign.warrantyUntil ? new Date(campaign.warrantyUntil).toLocaleDateString('vi-VN') : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Ngày tạo</p>
                <p className="font-bold text-on-surface mt-1">{new Date(campaign.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>

          {/* Content & Image Edit Section */}
          {canEdit && (
            <div className="bg-surface-container rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2"><Edit2 size={16} className="text-primary-neon" /> Chỉnh sửa nội dung & hình ảnh</h2>
                {!editingCampaign ? (
                  <button onClick={startEditCampaign} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-neon/10 text-primary-neon border border-primary-neon/20 text-sm font-bold hover:bg-primary-neon/20 transition-colors">
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveCampaignEdit} disabled={savingCampaign} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-neon text-surface text-sm font-bold hover:scale-105 transition-all disabled:opacity-50">
                      {savingCampaign ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
                    </button>
                    <button onClick={() => setEditingCampaign(false)} className="px-4 py-2 rounded-xl border border-white/10 text-on-surface-variant text-sm font-bold hover:bg-surface-container-high transition-colors">
                      Hủy
                    </button>
                  </div>
                )}
              </div>

              {editingCampaign ? (
                <div className="p-6 space-y-6">
                  {/* Content Mode */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Chế độ nội dung</label>
                    <div className="flex gap-2 mb-4">
                      {(['ai', 'custom'] as const).map(mode => (
                        <button key={mode} onClick={() => setEditForm((f: any) => ({ ...f, contentMode: mode }))}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${editForm.contentMode === mode ? 'bg-primary-neon text-surface' : 'bg-surface-container-high text-on-surface-variant border border-white/10'}`}>
                          {mode === 'ai' ? 'AI Tự Động' : 'Tùy Chỉnh'}
                        </button>
                      ))}
                    </div>
                    {editForm.contentMode === 'ai' ? (
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-2">Keywords AI</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editForm.aiKeywords?.map((kw: string, i: number) => (
                            <span key={i} className="flex items-center gap-1 px-3 py-1 bg-primary-neon/10 text-primary-neon rounded-lg text-xs font-bold">
                              {kw}
                              <button onClick={() => setEditForm((f: any) => ({ ...f, aiKeywords: f.aiKeywords.filter((_: string, j: number) => j !== i) }))}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newKeyword.trim()) { setEditForm((f: any) => ({ ...f, aiKeywords: [...(f.aiKeywords || []), newKeyword.trim()] })); setNewKeyword(''); } }}
                            placeholder="Nhập keyword, Enter để thêm" className="flex-1 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50" />
                          <button onClick={() => { if (newKeyword.trim()) { setEditForm((f: any) => ({ ...f, aiKeywords: [...(f.aiKeywords || []), newKeyword.trim()] })); setNewKeyword(''); } }}
                            className="px-3 py-2 bg-primary-neon/10 text-primary-neon rounded-xl hover:bg-primary-neon/20 transition-colors"><Plus size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-2">Danh sách nội dung</label>
                        <div className="space-y-2 mb-2">
                          {editForm.customContents?.map((c: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="flex-1 text-xs text-on-surface bg-surface-container-high rounded-lg p-2 leading-relaxed">{c}</span>
                              <button onClick={() => setEditForm((f: any) => ({ ...f, customContents: f.customContents.filter((_: string, j: number) => j !== i) }))} className="text-red-400 hover:text-red-300 mt-1"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Nhập nội dung review..." rows={2}
                            className="flex-1 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 resize-none" />
                          <button onClick={() => { if (newContent.trim()) { setEditForm((f: any) => ({ ...f, customContents: [...(f.customContents || []), newContent.trim()] })); setNewContent(''); } }}
                            className="px-3 py-2 bg-primary-neon/10 text-primary-neon rounded-xl hover:bg-primary-neon/20 transition-colors self-end"><Plus size={16} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image Mode */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Chế độ hình ảnh</label>
                    <div className="flex gap-2 mb-4">
                      {(['none', 'ai', 'manual'] as const).map(mode => (
                        <button key={mode} onClick={() => setEditForm((f: any) => ({ ...f, imageMode: mode }))}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${editForm.imageMode === mode ? 'bg-primary-neon text-surface' : 'bg-surface-container-high text-on-surface-variant border border-white/10'}`}>
                          {mode === 'none' ? 'Không dùng' : mode === 'ai' ? 'AI tạo' : 'Upload thủ công'}
                        </button>
                      ))}
                    </div>
                    {editForm.imageMode !== 'none' && (
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1">Tối thiểu</label>
                          <input type="number" min={0} max={20} value={editForm.imageMinCount} onChange={e => setEditForm((f: any) => ({ ...f, imageMinCount: Number(e.target.value) }))}
                            className="w-24 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1">Tối đa</label>
                          <input type="number" min={0} max={20} value={editForm.imageMaxCount} onChange={e => setEditForm((f: any) => ({ ...f, imageMaxCount: Number(e.target.value) }))}
                            className="w-24 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50" />
                        </div>
                      </div>
                    )}
                    {editForm.imageMode === 'manual' && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1"><ImageIcon size={10} /> Ảnh mẫu cho chiến dịch ({(editForm.customImages || []).length} ảnh)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(editForm.customImages || []).map((img: string, i: number) => (
                            <div key={i} className="relative">
                              <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <button onClick={() => setEditForm((f: any) => ({ ...f, customImages: f.customImages.filter((_: string, j: number) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <X size={8} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={newCampaignImageUrl} onChange={e => setNewCampaignImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCampaignImageUrl.trim()) { setEditForm((f: any) => ({ ...f, customImages: [...(f.customImages || []), newCampaignImageUrl.trim()] })); setNewCampaignImageUrl(''); } }}
                            placeholder="Dán URL ảnh, Enter để thêm" className="flex-1 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50" />
                          <input ref={campaignImageFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files?.length) handleCampaignImageUpload(files); e.target.value = ''; }} />
                          <button onClick={() => campaignImageFileRef.current?.click()} disabled={uploadingCampaignImage}
                            className="flex items-center gap-1 px-3 py-2 bg-surface-container-high border border-white/10 rounded-xl text-on-surface-variant hover:text-primary-neon hover:border-primary-neon/30 transition-colors text-sm font-bold disabled:opacity-50">
                            {uploadingCampaignImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
                          </button>
                          <button onClick={() => { if (newCampaignImageUrl.trim()) { setEditForm((f: any) => ({ ...f, customImages: [...(f.customImages || []), newCampaignImageUrl.trim()] })); setNewCampaignImageUrl(''); } }}
                            className="px-3 py-2 bg-primary-neon/10 text-primary-neon rounded-xl hover:bg-primary-neon/20 transition-colors"><Plus size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duplicate options */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={editForm.allowDuplicateContent} onChange={e => setEditForm((f: any) => ({ ...f, allowDuplicateContent: e.target.checked }))}
                        className="w-4 h-4 accent-primary-neon" />
                      <span className="text-sm text-on-surface">Cho phép trùng nội dung</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={editForm.allowDuplicateImages} onChange={e => setEditForm((f: any) => ({ ...f, allowDuplicateImages: e.target.checked }))}
                        className="w-4 h-4 accent-primary-neon" />
                      <span className="text-sm text-on-surface">Cho phép trùng hình ảnh</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nội dung</p>
                    <p className="text-on-surface">{campaign.contentMode === 'ai' ? `AI (${(campaign.aiKeywords || []).join(', ') || 'chưa có keyword'})` : `Tùy chỉnh (${(campaign.customContents || []).length} nội dung)`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Hình ảnh</p>
                    <p className="text-on-surface">{campaign.imageMode === 'none' ? 'Không dùng' : `${campaign.imageMode === 'ai' ? 'AI' : 'Upload'} (${campaign.imageMinCount}–${campaign.imageMaxCount} ảnh)`}</p>
                    {campaign.imageMode === 'manual' && (campaign.customImages || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(campaign.customImages || []).map((img: string, i: number) => (
                          <img key={i} src={img} alt="" className="w-10 h-10 object-cover rounded-md border border-white/10" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Trùng nội dung</p>
                    <p className={campaign.allowDuplicateContent !== false ? 'text-green-400' : 'text-red-400'}>{campaign.allowDuplicateContent !== false ? 'Cho phép' : 'Không cho phép'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Trùng hình ảnh</p>
                    <p className={campaign.allowDuplicateImages !== false ? 'text-green-400' : 'text-red-400'}>{campaign.allowDuplicateImages !== false ? 'Cho phép' : 'Không cho phép'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review items table */}
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-6"><Activity className="text-primary-neon" /> Chi Tiết Từng Review</h2>
            <div className="bg-surface-container rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-high text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Lịch trình</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4">Rating</th>
                      <th className="px-4 py-4">Tài khoản</th>
                      <th className="px-4 py-4">Worker</th>
                      <th className="px-4 py-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="text-on-surface divide-y divide-white/5">
                    {campaign.reviewItems.map((item: any, index: number) => {
                      const displayStatus = getReviewDisplayStatus(item);
                      const tierGuide = item.pricingTier ? LOCAL_GUIDE_MAP[item.pricingTier.level] || LOCAL_GUIDE_MAP.basic : null;
                      const canDispatch = campaign.status === 'active' && item.status === 'pending' && !item.dispatchedAt;
                      const isQueue = displayStatus.label === 'Queue';
                      const isExpanded = expandedReviewId === item.id;
                      const hasWorkerInfo = item.assignedWorker || item.publishedUrl || item.proofScreenshot;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className={`hover:bg-white/5 transition-colors ${isExpanded ? 'bg-white/5' : ''}`}>
                            <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{index + 1}</td>
                            <td className="px-4 py-3">
                              {editingScheduleId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="datetime-local"
                                    value={editScheduleValue}
                                    onChange={(e) => setEditScheduleValue(e.target.value)}
                                    className="bg-surface-container border border-white/10 rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary-neon/50"
                                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                                  />
                                  <button
                                    onClick={() => handleSaveSchedule(item.id)}
                                    disabled={savingSchedule}
                                    className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                  >
                                    {savingSchedule ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                  </button>
                                  <button
                                    onClick={() => setEditingScheduleId(null)}
                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-on-surface-variant" />
                                  <span className="text-xs">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString('vi-VN') : '-'}</span>
                                  {isQueue && (
                                    <button
                                      onClick={() => {
                                        setEditingScheduleId(item.id);
                                        setEditScheduleValue(item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : '');
                                      }}
                                      className="p-0.5 text-on-surface-variant hover:text-primary-neon transition-colors"
                                      title="Chỉnh sửa lịch"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                  )}
                                </div>
                              )}
                              {item.dispatchedAt && <span className="text-[10px] text-primary-neon block mt-0.5">Giao: {new Date(item.dispatchedAt).toLocaleString('vi-VN')}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${displayStatus.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${displayStatus.dot}`}></span>
                                {displayStatus.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="font-bold">{item.targetRating}</span> <Star size={12} className="text-yellow-400 fill-yellow-400" />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {tierGuide ? <span className={`text-xs font-bold ${tierGuide.color}`}>{tierGuide.label}</span> : <span className="text-xs text-on-surface-variant">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              {item.assignedWorker ? (
                                <button onClick={() => setExpandedReviewId(isExpanded ? null : item.id)} className="text-xs text-on-surface-variant hover:text-primary-neon transition-colors flex items-center gap-1">
                                  {item.assignedWorker.name}
                                  {(isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                                </button>
                              ) : <span className="text-xs text-on-surface-variant">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {hasWorkerInfo && !item.assignedWorker && (
                                  <button onClick={() => setExpandedReviewId(isExpanded ? null : item.id)} className="text-on-surface-variant hover:text-primary-neon transition-colors">
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                )}
                                {canEdit && isQueue && editingReviewId !== item.id && (
                                  <button onClick={() => startEditReview(item)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container-highest transition-colors border border-white/10">
                                    <Edit2 size={12} /> Edit
                                  </button>
                                )}
                                {canDispatch && (
                                  <button onClick={() => handleDispatch(item.id)} disabled={dispatchingId === item.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-neon/10 text-primary-neon rounded-lg text-xs font-bold hover:bg-primary-neon/20 transition-colors disabled:opacity-50">
                                    <Send size={12} />
                                    {dispatchingId === item.id ? '...' : 'Giao việc'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Per-review edit form */}
                          {editingReviewId === item.id && (
                            <tr>
                              <td colSpan={7} className="bg-surface-container-high px-6 py-4">
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={10} /> Nội dung riêng cho review này</label>
                                    <textarea value={reviewEditForm.customContent} onChange={e => setReviewEditForm(f => ({ ...f, customContent: e.target.value }))} rows={3} placeholder="Để trống sẽ dùng nội dung chiến dịch..."
                                      className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 resize-none" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1"><ImageIcon size={10} /> Hình ảnh riêng ({reviewEditForm.customImages.length} ảnh)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {reviewEditForm.customImages.map((img, i) => (
                                        <div key={i} className="relative">
                                          <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                          <button onClick={() => setReviewEditForm(f => ({ ...f, customImages: f.customImages.filter((_, j) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <X size={8} className="text-white" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newImageUrl.trim()) { setReviewEditForm(f => ({ ...f, customImages: [...f.customImages, newImageUrl.trim()] })); setNewImageUrl(''); } }}
                                        placeholder="Dán URL ảnh, Enter để thêm" className="flex-1 bg-surface-container border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50" />
                                      <input ref={imageFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files?.length) handleImageUpload(files); e.target.value = ''; }} />
                                      <button onClick={() => imageFileRef.current?.click()} disabled={uploadingImage}
                                        className="flex items-center gap-1 px-3 py-2 bg-surface-container border border-white/10 rounded-xl text-on-surface-variant hover:text-primary-neon hover:border-primary-neon/30 transition-colors text-sm font-bold disabled:opacity-50">
                                        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
                                      </button>
                                      <button onClick={() => { if (newImageUrl.trim()) { setReviewEditForm(f => ({ ...f, customImages: [...f.customImages, newImageUrl.trim()] })); setNewImageUrl(''); } }}
                                        className="px-3 py-2 bg-primary-neon/10 text-primary-neon rounded-xl hover:bg-primary-neon/20 transition-colors"><Plus size={14} /></button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveReviewEdit(item.id)} disabled={savingReview}
                                      className="flex items-center gap-2 px-4 py-2 bg-primary-neon text-surface rounded-xl text-sm font-bold hover:scale-105 transition-all disabled:opacity-50">
                                      {savingReview ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
                                    </button>
                                    <button onClick={() => setEditingReviewId(null)} className="px-4 py-2 rounded-xl border border-white/10 text-on-surface-variant text-sm font-bold hover:bg-surface-container transition-colors">Hủy</button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Expanded worker info row */}
                          {isExpanded && editingReviewId !== item.id && (
                            <tr>
                              <td colSpan={7} className="bg-surface-container-high px-6 py-4">
                                <div className="flex flex-wrap gap-6 text-sm">
                                  {item.assignedWorker && (
                                    <div>
                                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Worker</p>
                                      <p className="text-on-surface">{item.assignedWorker.name}</p>
                                      {item.assignedAccount && <p className="text-xs text-on-surface-variant">{item.assignedAccount.accountName}</p>}
                                    </div>
                                  )}
                                  {item.publishedUrl && (
                                    <div>
                                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Link Review</p>
                                      <a href={item.publishedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-neon hover:underline text-xs">
                                        <ExternalLink size={12} /> Xem review
                                      </a>
                                    </div>
                                  )}
                                  {item.proofScreenshot && (
                                    <div>
                                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Bằng chứng</p>
                                      <a href={item.proofScreenshot} target="_blank" rel="noreferrer">
                                        <img src={item.proofScreenshot} alt="Proof" className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                      </a>
                                    </div>
                                  )}
                                  {item.proofSubmittedAt && (
                                    <div>
                                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nộp lúc</p>
                                      <p className="text-on-surface text-xs">{new Date(item.proofSubmittedAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-gradient-to-b from-surface-container to-surface-container-lowest rounded-2xl p-6 border border-white/5 sticky top-24">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-6 mx-auto"><ShieldCheck size={32} /></div>
            <h3 className="text-center text-xl font-bold text-on-surface mb-2">Thanh toán An Toàn</h3>
            <p className="text-center text-on-surface-variant text-sm mb-6">Số tiền đang được đóng băng. MapLocals chỉ giải ngân cho CTV khi review ổn định trên Maps sau 48h.</p>
            <div className="bg-surface-container-high rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Tổng ngân sách</span>
                <span className="font-bold text-on-surface">{Number(campaign.totalBudget).toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Đã đóng băng</span>
                <span className="font-bold text-yellow-400">{Number(campaign.frozenAmount).toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Đã giải ngân</span>
                <span className="font-bold text-green-400">{Number(campaign.settledAmount).toLocaleString()}đ</span>
              </div>
            </div>
            {campaign.tierItems && campaign.tierItems.length > 0 && (
              <div className="bg-surface-container-high rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Chi tiết gói</p>
                <div className="space-y-2">
                  {campaign.tierItems.map((ti: any) => {
                    const guide = LOCAL_GUIDE_MAP[ti.pricingTier?.level] || LOCAL_GUIDE_MAP.basic;
                    return (
                      <div key={ti.id} className="flex justify-between items-center text-sm">
                        <span className={`font-bold ${guide.color}`}>{guide.label} × {ti.quantity}</span>
                        <span className="text-on-surface">{(Number(ti.pricingTier?.pricePerReview || 0) * ti.quantity).toLocaleString()}đ</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button className="w-full bg-surface-container-highest text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors text-sm border border-white/5">
              Xem lịch sử giao dịch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
