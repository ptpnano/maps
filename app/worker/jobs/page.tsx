'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Star, Clock, DollarSign, Send, CheckCircle, Loader2, ChevronDown, RefreshCw, Image as ImageIcon, FileText, ExternalLink, Upload, X, Shield, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

const HISTORY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_verify: { label: 'Chờ duyệt', color: 'bg-yellow-500/10 text-yellow-400' },
  verifying: { label: 'Đang xét', color: 'bg-blue-500/10 text-blue-400' },
  holding: { label: 'Đã duyệt - Chờ giải ngân', color: 'bg-orange-500/10 text-orange-400' },
  live: { label: 'Hoàn thành', color: 'bg-green-500/10 text-green-400' },
  dropped: { label: 'Bị từ chối', color: 'bg-red-500/10 text-red-400' },
  cancelled: { label: 'Đã hủy', color: 'bg-purple-500/10 text-purple-400' },
  expired: { label: 'Hết hạn', color: 'bg-gray-500/10 text-gray-400' },
};

export default function WorkerJobsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'available' | 'mine' | 'history'>('available');
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Record<string, string>>({});
  const [submitFormId, setSubmitFormId] = useState<string | null>(null);
  const [submitData, setSubmitData] = useState({ publishedUrl: '', proofScreenshot: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofPreview, setProofPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [availRes, myRes, histRes, accRes] = await Promise.all([
        fetch('/api/worker/jobs?status=pending'),
        fetch('/api/worker/jobs?status=assigned'),
        fetch('/api/worker/jobs?status=history'),
        fetch('/api/worker/accounts'),
      ]);
      const availData = await availRes.json();
      const myData = await myRes.json();
      const histData = await histRes.json();
      const accData = await accRes.json();
      if (availData.jobs) setAvailableJobs(availData.jobs);
      if (myData.jobs) setMyJobs(myData.jobs);
      if (histData.jobs) setHistoryJobs(histData.jobs);
      if (accData.accounts) setAccounts(accData.accounts.filter((a: any) => a.status === 'active'));
    } catch (err) {
      setError('Không thể tải danh sách việc làm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClaim = async (jobId: string) => {
    const accountId = selectedAccount[jobId];
    if (!accountId) {
      toast.error('Vui lòng chọn tài khoản Google trước khi nhận việc.');
      return;
    }
    setClaimingId(jobId);
    try {
      const res = await fetch(`/api/worker/jobs/${jobId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Nhận việc thành công!');
        fetchData();
      } else {
        toast.error(data.error || 'Không thể nhận việc.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleProofFileUpload = async (file: File) => {
    setUploadingProof(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        setSubmitData(prev => ({ ...prev, proofScreenshot: data.url }));
        setProofPreview(data.url);
        toast.success('Tải ảnh thành công!');
      } else {
        toast.error(data.error || 'Tải ảnh thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tải ảnh.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (jobId: string) => {
    if (!submitData.publishedUrl) {
      toast.error('Vui lòng nhập URL bài đăng.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/worker/jobs/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Nộp bằng chứng thành công!');
        setSubmitFormId(null);
        setSubmitData({ publishedUrl: '', proofScreenshot: '' });
        setProofPreview('');
        fetchData();
      } else {
        toast.error(data.error || 'Không thể nộp bằng chứng.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { key: 'available' as const, label: 'Việc có sẵn', count: availableJobs.length },
    { key: 'mine' as const, label: 'Việc của tôi', count: myJobs.length },
    { key: 'history' as const, label: 'Lịch sử', count: historyJobs.length },
  ];

  const currentJobs = activeTab === 'available' ? availableJobs : activeTab === 'mine' ? myJobs : historyJobs;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Việc làm</h1>
          <p className="text-on-surface-variant">Nhận việc và nộp bằng chứng hoàn thành.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-white/10 text-on-surface-variant hover:bg-surface-container-high hover:text-primary-neon transition-all font-bold text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Tải lại
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-primary-neon text-surface shadow-[0_0_15px_rgba(0,245,255,0.4)]'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-white/5'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="glass-card p-6 rounded-lg text-center text-red-400">
          {error}
          <button onClick={fetchData} className="ml-3 underline text-primary-neon">Thử lại</button>
        </div>
      ) : currentJobs.length === 0 ? (
        <div className="glass-card p-10 rounded-lg text-center text-on-surface-variant">
          {activeTab === 'available' ? 'Hiện không có việc nào khả dụng.' : activeTab === 'mine' ? 'Bạn chưa nhận việc nào.' : 'Chưa có lịch sử công việc.'}
        </div>
      ) : (
        <div className="space-y-4">
          {currentJobs.map((job: any) => {
            const histInfo = HISTORY_STATUS_MAP[job.status];
            const content = job.customContent || job.content;
            const images: string[] = job.customImages?.length ? job.customImages : (job.images ?? []);

            return (
              <div key={job.id} className="glass-card rounded-lg overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex shrink-0 items-center justify-center">
                      <MapPin className="text-on-surface-variant/50" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface">{job.campaign?.mapLocation?.name || 'Vị trí'}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" />{job.targetRating || 5} sao</span>
                        <span className="flex items-center gap-1"><DollarSign size={12} className="text-green-400" />{formatCurrency(Number(job.workerPayout || 0))}</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString('vi-VN') : 'Linh hoạt'}</span>
                        {job.pricingTier?.minAccountLevel && (
                          <span className="flex items-center gap-1"><Shield size={12} className="text-primary-neon" />Yêu cầu: Lv.{job.pricingTier.minAccountLevel}+</span>
                        )}
                      </div>
                      {job.claimDeadline && job.status === 'assigned' && (
                        <p className="text-[10px] text-yellow-400 mt-1">
                          Hạn nộp: {new Date(job.claimDeadline).toLocaleString('vi-VN')}
                        </p>
                      )}
                      {/* Holding: show release date */}
                      {job.status === 'holding' && job.releaseAt && (
                        <p className="text-[10px] text-orange-400 mt-1">
                          Dự kiến nhận tiền: {new Date(job.releaseAt).toLocaleDateString('vi-VN')} ({formatCurrency(Number(job.workerPayout || 0))})
                        </p>
                      )}
                      {/* Live: earned */}
                      {job.status === 'live' && (
                        <p className="text-[10px] text-green-400 mt-1 font-bold">
                          ✓ Đã nhận {formatCurrency(Number(job.workerPayout || 0))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* History status badge */}
                    {histInfo && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${histInfo.color}`}>
                        {histInfo.label}
                      </span>
                    )}
                    {/* Active status badge (mine tab) */}
                    {!histInfo && job.status && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        job.status === 'assigned' ? 'bg-blue-500/10 text-blue-400' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {job.status}
                      </span>
                    )}
                    {/* Published URL link (history tab) */}
                    {job.publishedUrl && (
                      <a href={job.publishedUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-neon/10 text-primary-neon rounded-lg text-xs font-bold hover:bg-primary-neon/20 transition-colors">
                        <ExternalLink size={12} />
                        Xem review
                      </a>
                    )}
                    {activeTab === 'available' && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedAccount[job.id] || ''}
                            onChange={(e) => setSelectedAccount({ ...selectedAccount, [job.id]: e.target.value })}
                            className="appearance-none bg-surface-container border border-white/10 rounded-xl px-3 py-2 pr-8 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50 min-w-[140px]"
                          >
                            <option value="">Chọn TK...</option>
                            {accounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountName} (Lv.{acc.level})
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                        </div>
                        <button
                          onClick={() => handleClaim(job.id)}
                          disabled={claimingId === job.id}
                          className="bg-primary-neon text-surface px-5 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2"
                        >
                          {claimingId === job.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Nhận việc
                        </button>
                      </div>
                    )}
                    {activeTab === 'mine' && job.status === 'assigned' && (
                      <button
                        onClick={() => {
                          setSubmitFormId(submitFormId === job.id ? null : job.id);
                          setSubmitData({ publishedUrl: '', proofScreenshot: '' });
                          setProofPreview('');
                        }}
                        className="bg-green-500/20 text-green-400 px-5 py-2 rounded-xl font-bold text-sm hover:bg-green-500/30 transition-all border border-green-500/30 flex items-center gap-2"
                      >
                        <Send size={16} />
                        Nộp bằng chứng
                      </button>
                    )}
                  </div>
                </div>

                {/* Content & images for assigned jobs */}
                {activeTab === 'mine' && job.status === 'assigned' && (content || images.length > 0) && (
                  <div className="px-6 pb-4 border-t border-white/5 pt-4">
                    {content && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                            <FileText size={10} /> Nội dung cần đăng
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(content).then(() => toast.success('Đã copy nội dung!')).catch(() => toast.error('Không thể copy'));
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-primary-neon/10 text-primary-neon rounded-lg text-[10px] font-bold hover:bg-primary-neon/20 transition-colors"
                          >
                            <Copy size={10} /> Copy nội dung
                          </button>
                        </div>
                        <p className="text-sm text-on-surface bg-surface-container rounded-xl p-3 leading-relaxed">{content}</p>
                      </div>
                    )}
                    {images.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                            <ImageIcon size={10} /> Hình ảnh ({images.length})
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                for (let i = 0; i < images.length; i++) {
                                  const res = await fetch(images[i]);
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  const ext = images[i].split('.').pop()?.split('?')[0] || 'jpg';
                                  a.download = `image_${i + 1}.${ext}`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }
                                toast.success(`Đã tải ${images.length} ảnh!`);
                              } catch {
                                toast.error('Lỗi khi tải ảnh');
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-primary-neon/10 text-primary-neon rounded-lg text-[10px] font-bold hover:bg-primary-neon/20 transition-colors"
                          >
                            <Download size={10} /> Tải tất cả ảnh
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {images.map((img: string, i: number) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt={`Image ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {!content && images.length === 0 && job.imageCount > 0 && (
                      <p className="text-xs text-on-surface-variant">Cần đính kèm {job.imageCount} ảnh</p>
                    )}
                  </div>
                )}

                {/* Proof submission form */}
                {submitFormId === job.id && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">URL bài đăng *</label>
                      <input
                        type="text"
                        value={submitData.publishedUrl}
                        onChange={(e) => setSubmitData({ ...submitData, publishedUrl: e.target.value })}
                        placeholder="https://maps.google.com/..."
                        className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Screenshot bằng chứng</label>
                      <div className="flex gap-3 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={submitData.proofScreenshot}
                            onChange={(e) => {
                              setSubmitData({ ...submitData, proofScreenshot: e.target.value });
                              setProofPreview(e.target.value);
                            }}
                            placeholder="Dán link ảnh hoặc upload file bên cạnh"
                            className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
                          />
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProofFileUpload(file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingProof}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border border-white/10 text-on-surface-variant hover:text-primary-neon hover:border-primary-neon/30 transition-all text-sm font-bold disabled:opacity-50 shrink-0"
                        >
                          {uploadingProof ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          Upload
                        </button>
                      </div>
                      {proofPreview && (
                        <div className="mt-2 relative inline-block">
                          <img src={proofPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-white/10" onError={() => setProofPreview('')} />
                          <button
                            onClick={() => { setProofPreview(''); setSubmitData(prev => ({ ...prev, proofScreenshot: '' })); }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubmit(job.id)}
                        disabled={submitting}
                        className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Gửi
                      </button>
                      <button
                        onClick={() => { setSubmitFormId(null); setSubmitData({ publishedUrl: '', proofScreenshot: '' }); setProofPreview(''); }}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-all border border-white/10"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Proof screenshot + edit for history tab */}
                {activeTab === 'history' && submitFormId !== job.id && (job.proofScreenshot || job.status === 'pending_verify') && (
                  <div className="px-6 pb-4 border-t border-white/5 pt-3 space-y-3">
                    {job.proofScreenshot && (
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bằng chứng đã nộp</p>
                        <a href={job.proofScreenshot} target="_blank" rel="noreferrer">
                          <img src={job.proofScreenshot} alt="Proof" className="w-24 h-24 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </a>
                      </div>
                    )}
                    {job.status === 'pending_verify' && (
                      <div>
                        <button
                          onClick={() => {
                            setSubmitFormId(job.id);
                            setSubmitData({ publishedUrl: job.publishedUrl || '', proofScreenshot: job.proofScreenshot || '' });
                            setProofPreview(job.proofScreenshot || '');
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold hover:bg-yellow-500/20 transition-colors"
                        >
                          <Send size={12} />
                          Chỉnh sửa bằng chứng
                        </button>
                        <p className="text-[10px] text-on-surface-variant mt-1">Cho phép chỉnh sửa trước khi admin xét duyệt</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
