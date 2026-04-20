'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, ExternalLink, Send, X, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

type TabFilter = 'all' | 'inactive' | 'queue' | 'waiting' | 'assigned' | 'pending_verify' | 'live' | 'dropped' | 'cancelled';

interface AssignModal {
  jobId: string;
  jobLabel: string;
  tierName?: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TabFilter>('waiting');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [assignModal, setAssignModal] = useState<AssignModal | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMode, setAssignMode] = useState<'direct' | 'public'>('direct');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20', tab: statusFilter });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleApprove = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Đã duyệt review thành công');
      fetchJobs();
    } catch {
      toast.error('Duyệt review thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Đã từ chối review');
      fetchJobs();
    } catch {
      toast.error('Từ chối review thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignModal = async (job: any) => {
    setAssignModal({ jobId: job.id, jobLabel: job.campaign?.mapLocation?.name || job.id, tierName: job.pricingTier?.name });
    setSelectedWorkerId('');
    setSelectedAccountId('');
    setAssignMode('direct');
    setWorkersLoading(true);
    try {
      const res = await fetch('/api/admin/workers');
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch {
      toast.error('Không tải được danh sách worker');
    } finally {
      setWorkersLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    if (assignMode === 'direct' && (!selectedWorkerId || !selectedAccountId)) {
      toast.error('Vui lòng chọn worker và tài khoản GG');
      return;
    }
    setAssigning(true);
    try {
      const body = assignMode === 'public'
        ? { mode: 'public' }
        : { mode: 'direct', workerId: selectedWorkerId, accountId: selectedAccountId };
      const res = await fetch(`/api/admin/jobs/${assignModal.jobId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(assignMode === 'public' ? 'Đã công khai job cho worker nhận!' : 'Đã giao việc thành công!');
      setAssignModal(null);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || 'Giao việc thất bại');
    } finally {
      setAssigning(false);
    }
  };

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'inactive', label: 'Chưa kích hoạt' },
    { key: 'queue', label: 'Hàng chờ' },
    { key: 'waiting', label: 'Chờ nhận job' },
    { key: 'assigned', label: 'Đã giao' },
    { key: 'pending_verify', label: 'Chờ xác minh' },
    { key: 'live', label: 'Hoàn thành' },
    { key: 'dropped', label: 'Từ chối' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400',
      pending_verify: 'bg-orange-500/10 text-orange-400',
      assigned: 'bg-blue-500/10 text-blue-400',
      live: 'bg-green-500/10 text-green-400',
      dropped: 'bg-red-500/10 text-red-400',
      cancelled: 'bg-purple-500/10 text-purple-400',
    };
    return map[status] || 'bg-surface-container text-on-surface-variant';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Chờ giao',
      assigned: 'Đã giao',
      pending_verify: 'Chờ xác minh',
      live: 'Hoàn thành',
      dropped: 'Từ chối',
      cancelled: 'Đã hủy',
    };
    return map[status] || status;
  };

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Quản lý công việc</h1>
        <p className="text-on-surface-variant mt-1">Tổng {total} job - Xác minh, giao việc và quản lý review item</p>
      </header>

      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Tìm theo tên địa điểm hoặc worker..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[220px] bg-surface-container border border-white/10 rounded-lg px-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
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

      <div className="glass-card rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-neon border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Đang tải...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Không có công việc nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Chiến dịch</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Gói</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Worker</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">TK GG</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Sao</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">URL / Bằng chứng</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Trạng thái</th>
                  <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-on-surface">{job.campaign?.mapLocation?.name || '-'}</p>
                        <p className="text-xs text-on-surface-variant">{job.campaign?.client?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs">{job.pricingTier?.name || '-'}</td>
                    <td className="p-4">
                      {job.assignedWorker ? (
                        <div>
                          <p className="text-on-surface font-bold">{job.assignedWorker.name}</p>
                          <p className="text-xs text-on-surface-variant">{job.assignedWorker.email}</p>
                        </div>
                      ) : <span className="text-on-surface-variant">-</span>}
                    </td>
                    <td className="p-4 text-on-surface text-xs">
                      {job.assignedAccount ? `${job.assignedAccount.accountName} (Lv${job.assignedAccount.level})` : '-'}
                    </td>
                    <td className="p-4 text-on-surface text-xs">{job.targetRating ? `${job.targetRating}*` : '-'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {job.publishedUrl && (
                          <a href={job.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-primary-neon hover:underline flex items-center gap-1 text-xs">
                            URL <ExternalLink size={10} />
                          </a>
                        )}
                        {job.proofScreenshot && (
                          <a href={job.proofScreenshot} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline flex items-center gap-1 text-xs">
                            Ảnh <ExternalLink size={10} />
                          </a>
                        )}
                        {!job.publishedUrl && !job.proofScreenshot && <span className="text-on-surface-variant">-</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(job.status)}`}>
                        {statusLabel(job.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {job.status === 'pending' && ['all', 'inactive', 'queue', 'waiting'].includes(statusFilter) && (
                          <button
                            onClick={() => openAssignModal(job)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-neon/10 text-primary-neon rounded-lg text-xs font-bold hover:bg-primary-neon/20 transition-colors border border-primary-neon/20"
                          >
                            <Send size={12} />
                            Giao việc
                          </button>
                        )}
                        {job.status === 'pending_verify' && (
                          <>
                            <button
                              onClick={() => handleApprove(job.id)}
                              disabled={actionLoading === job.id}
                              className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                              title="Duyệt"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleReject(job.id)}
                              disabled={actionLoading === job.id}
                              className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              title="Từ chối"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
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

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-on-surface">Giao việc thủ công</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{assignModal.jobLabel}{assignModal.tierName ? ` - ${assignModal.tierName}` : ''}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <X size={20} />
              </button>
            </div>

            {workersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary-neon" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Chế độ giao việc</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssignMode('public')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        assignMode === 'public'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-surface-container text-on-surface-variant border border-white/10 hover:bg-surface-container-high'
                      }`}
                    >
                      <Globe size={14} />
                      Công khai
                    </button>
                    <button
                      onClick={() => setAssignMode('direct')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        assignMode === 'direct'
                          ? 'bg-primary-neon/20 text-primary-neon border border-primary-neon/30'
                          : 'bg-surface-container text-on-surface-variant border border-white/10 hover:bg-surface-container-high'
                      }`}
                    >
                      <Send size={14} />
                      Chỉ định worker
                    </button>
                  </div>
                  {assignMode === 'public' && (
                    <p className="text-xs text-on-surface-variant mt-2">Job sẽ được công khai cho tất cả worker. Worker nào nhận sớm sẽ được giao.</p>
                  )}
                </div>

                {assignMode === 'direct' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Chọn Worker</label>
                      <select
                        value={selectedWorkerId}
                        onChange={e => { setSelectedWorkerId(e.target.value); setSelectedAccountId(''); }}
                        className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50"
                      >
                        <option value="">-- Chọn worker --</option>
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.email}) - Trust: {w.trustScore}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedWorker && (
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Chọn tài khoản GG</label>
                        {selectedWorker.workerAccounts.length === 0 ? (
                          <p className="text-sm text-red-400">Worker này không có tài khoản GG active nào</p>
                        ) : (
                          <select
                            value={selectedAccountId}
                            onChange={e => setSelectedAccountId(e.target.value)}
                            className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50"
                          >
                            <option value="">-- Chọn tài khoản --</option>
                            {selectedWorker.workerAccounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountName} - Level {acc.level}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAssign}
                    disabled={assigning || (assignMode === 'direct' && (!selectedWorkerId || !selectedAccountId))}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary-neon text-surface px-4 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {assigning ? <Loader2 size={16} className="animate-spin" /> : assignMode === 'public' ? <Globe size={16} /> : <Send size={16} />}
                    {assignMode === 'public' ? 'Công khai cho worker' : 'Xác nhận giao việc'}
                  </button>
                  <button
                    onClick={() => setAssignModal(null)}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant border border-white/10 hover:bg-surface-container transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}