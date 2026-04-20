'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScanLine, Play, RefreshCw, Check, X, Clock,
  ChevronLeft, ChevronRight, ExternalLink, Settings, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ScanConfig {
  scanEnabled: boolean;
  scanTimeHour: number;
  scanTimeMinute: number;
  scanDelayMs: number;
  scanProxyEnabled: boolean;
  scanProxyUrl: string | null;
}

interface ScanLogEntry {
  id: string;
  scannedAt: string;
  status: 'success' | 'failed' | 'error' | 'pending';
  foundRating: number | null;
  reviewCount: number | null;
  errorMessage: string | null;
  scanDurationMs: number | null;
  reviewItem: {
    id: string;
    publishedUrl: string | null;
    targetRating: number;
    status: string;
    campaign: { mapLocation: { name: string | null } | null } | null;
  };
}

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
  error: 'bg-orange-500/10 text-orange-400',
  pending: 'bg-yellow-500/10 text-yellow-400',
};

export default function AdminScannerPage() {
  const [config, setConfig] = useState<ScanConfig>({
    scanEnabled: false,
    scanTimeHour: 9,
    scanTimeMinute: 0,
    scanDelayMs: 3000,
    scanProxyEnabled: false,
    scanProxyUrl: null,
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  const [logs, setLogs] = useState<ScanLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanBatchSize, setScanBatchSize] = useState(10);
  const [rescanning, setRescanning] = useState<string | null>(null);

  // Test URL scanner
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scanner/config');
      const data = await res.json();
      setConfig(data);
    } catch {
      toast.error('Lỗi tải cấu hình quét');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/scanner/history?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải lịch sử quét');
    } finally {
      setLogsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch('/api/admin/scanner/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          scanProxyUrl: config.scanProxyUrl || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Đã lưu cấu hình quét');
    } catch (e: any) {
      toast.error(e.message || 'Lưu cấu hình thất bại');
    } finally {
      setConfigSaving(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/admin/scanner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: scanBatchSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const successCount = data.results.filter((r: any) => r.success).length;
      toast.success(`Đã quét ${data.scanned} link - Thành công: ${successCount}/${data.scanned}`);
      fetchLogs();
    } catch (e: any) {
      toast.error(e.message || 'Quét thất bại');
    } finally {
      setScanning(false);
    }
  };

  const rescan = async (logId: string) => {
    setRescanning(logId);
    try {
      const res = await fetch(`/api/admin/scanner/rescan/${logId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.result.success ? `Quét lại thành công - Tìm thấy ${data.result.foundRating} sao` : `Quét lại thất bại: ${data.result.errorMessage}`);
      fetchLogs();
    } catch (e: any) {
      toast.error(e.message || 'Quét lại thất bại');
    } finally {
      setRescanning(null);
    }
  };

  const testScan = async () => {
    if (!testUrl.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/scanner/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e.message || 'Test thất bại' });
    } finally {
      setTestLoading(false);
    }
  };

  const statusTabs = [
    { key: '', label: 'Tất cả' },
    { key: 'success', label: 'Thành công' },
    { key: 'failed', label: 'Thất bại' },
    { key: 'error', label: 'Lỗi' },
  ];

  if (configLoading) {
    return (
      <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-neon" />
      </main>
    );
  }

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline flex items-center gap-3">
          <ScanLine size={32} className="text-primary-neon" />
          Hệ thống quét review
        </h1>
        <p className="text-on-surface-variant mt-1">
          Tự động quét link review để xác minh đánh giá và số sao
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Settings size={18} className="text-primary-neon" />
              <h2 className="font-bold text-on-surface">Cấu hình quét</h2>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">Bật quét tự động</label>
              <button
                onClick={() => setConfig(c => ({ ...c, scanEnabled: !c.scanEnabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${config.scanEnabled ? 'bg-primary-neon' : 'bg-surface-container-high'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.scanEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Scan time */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Giờ chạy mỗi ngày</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min={0} max={23}
                  value={config.scanTimeHour}
                  onChange={e => setConfig(c => ({ ...c, scanTimeHour: parseInt(e.target.value) || 0 }))}
                  className="w-20 bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50"
                />
                <span className="text-on-surface-variant">:</span>
                <input
                  type="number" min={0} max={59}
                  value={config.scanTimeMinute}
                  onChange={e => setConfig(c => ({ ...c, scanTimeMinute: parseInt(e.target.value) || 0 }))}
                  className="w-20 bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50"
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Định dạng 24h (VD: 9:30)</p>
            </div>

            {/* Delay */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Delay giữa các lần quét (ms)
              </label>
              <input
                type="number" min={500} max={30000} step={500}
                value={config.scanDelayMs}
                onChange={e => setConfig(c => ({ ...c, scanDelayMs: parseInt(e.target.value) || 3000 }))}
                className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50"
              />
              <p className="text-xs text-on-surface-variant mt-1">Hiện tại: {config.scanDelayMs / 1000}s</p>
            </div>

            {/* Proxy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Proxy</label>
                <button
                  onClick={() => setConfig(c => ({ ...c, scanProxyEnabled: !c.scanProxyEnabled }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${config.scanProxyEnabled ? 'bg-primary-neon' : 'bg-surface-container-high'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.scanProxyEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {config.scanProxyEnabled && (
                <div>
                  <textarea
                    placeholder="http://user:pass@proxy1:port&#10;http://user:pass@proxy2:port"
                    value={config.scanProxyUrl || ''}
                    onChange={e => setConfig(c => ({ ...c, scanProxyUrl: e.target.value || null }))}
                    rows={3}
                    className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50 placeholder-on-surface-variant/40 resize-none font-mono"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">Mỗi proxy một dòng. Khi bật sẽ chọn ngẫu nhiên.</p>
                </div>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="w-full flex items-center justify-center gap-2 bg-primary-neon text-surface py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {configSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Lưu cấu hình
            </button>
          </div>

          {/* Manual Run */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Play size={18} className="text-green-400" />
              <h2 className="font-bold text-on-surface">Chạy quét ngay</h2>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số link quét (batch)</label>
              <input
                type="number" min={1} max={50}
                value={scanBatchSize}
                onChange={e => setScanBatchSize(parseInt(e.target.value) || 10)}
                className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50"
              />
            </div>
            <button
              onClick={runScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 py-2.5 rounded-xl font-bold text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {scanning ? 'Đang quét...' : 'Bắt đầu quét'}
            </button>
          </div>

          {/* Test URL */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine size={18} className="text-yellow-400" />
              <h2 className="font-bold text-on-surface">Test URL</h2>
            </div>
            <input
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-neon/50 placeholder-on-surface-variant/40"
            />
            <button
              onClick={testScan}
              disabled={testLoading || !testUrl.trim()}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 py-2 rounded-xl font-bold text-sm hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {testLoading ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
              Test quét
            </button>
            {testResult && (
              <div className="rounded-lg bg-surface-container p-3 text-xs space-y-1">
                {testResult.error ? (
                  <p className="text-red-400 flex items-start gap-1"><AlertCircle size={12} className="mt-0.5 shrink-0" />{testResult.error}</p>
                ) : (
                  <>
                    <p className="text-green-400 font-bold">Thành công</p>
                    {testResult.foundRating != null && <p className="text-on-surface">Rating: {testResult.foundRating} ⭐</p>}
                    {testResult.reviewCount != null && <p className="text-on-surface-variant">Số review: {testResult.reviewCount}</p>}
                    {testResult.durationMs != null && <p className="text-on-surface-variant">Thời gian: {testResult.durationMs}ms</p>}
                    {testResult.resolvedUrl && <p className="text-on-surface-variant truncate" title={testResult.resolvedUrl}>URL: {testResult.resolvedUrl}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-on-surface text-lg">Lịch sử quét</h2>
              <p className="text-xs text-on-surface-variant">Tổng {total} lần quét</p>
            </div>
            <button onClick={fetchLogs} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {statusTabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setStatusFilter(t.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === t.key
                    ? 'bg-primary-neon/20 text-primary-neon border border-primary-neon/30'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-lg overflow-hidden">
            {logsLoading ? (
              <div className="p-10 text-center">
                <Loader2 size={24} className="animate-spin text-primary-neon mx-auto mb-3" />
                <p className="text-on-surface-variant text-sm">Đang tải...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center">
                <ScanLine size={32} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
                <p className="text-on-surface-variant">Chưa có lịch sử quét nào</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Nhấn "Bắt đầu quét" để chạy quét thủ công</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Địa điểm</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">URL</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Kết quả</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Mục tiêu</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Thời gian</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold">Trạng thái</th>
                      <th className="text-left p-4 text-on-surface-variant text-xs uppercase tracking-widest font-bold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-on-surface text-xs">
                            {log.reviewItem?.campaign?.mapLocation?.name || '-'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(log.scannedAt).toLocaleString('vi-VN')}
                          </p>
                        </td>
                        <td className="p-4">
                          {log.reviewItem?.publishedUrl ? (
                            <a
                              href={log.reviewItem.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-neon hover:underline flex items-center gap-1 text-xs"
                            >
                              Link <ExternalLink size={10} />
                            </a>
                          ) : <span className="text-on-surface-variant text-xs">-</span>}
                        </td>
                        <td className="p-4">
                          {log.foundRating ? (
                            <span className="text-yellow-400 font-bold">{log.foundRating}⭐</span>
                          ) : (
                            <span className="text-on-surface-variant text-xs">
                              {log.errorMessage
                                ? <span className="text-red-400 max-w-[120px] block truncate" title={log.errorMessage}>{log.errorMessage}</span>
                                : '-'
                              }
                            </span>
                          )}
                          {log.reviewCount && (
                            <p className="text-[10px] text-on-surface-variant">{log.reviewCount} reviews</p>
                          )}
                        </td>
                        <td className="p-4 text-on-surface-variant text-xs">
                          {log.reviewItem?.targetRating ? `${log.reviewItem.targetRating}⭐` : '-'}
                        </td>
                        <td className="p-4 text-on-surface-variant text-xs">
                          {log.scanDurationMs ? `${log.scanDurationMs}ms` : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[log.status] || STATUS_BADGE.pending}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => rescan(log.reviewItem.id)}
                            disabled={rescanning === log.reviewItem.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50"
                            title="Quét lại"
                          >
                            {rescanning === log.reviewItem.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                            Re-Scan
                          </button>
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
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
