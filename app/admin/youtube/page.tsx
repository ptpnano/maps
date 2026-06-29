'use client';

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, RefreshCw, Save, Settings, ShieldAlert, Send, XCircle, Youtube } from 'lucide-react';
import { toast } from 'sonner';

const serviceLabels: Record<string, string> = {
  like: 'Tăng Like',
  view: 'Tăng View',
  comment: 'Tăng Comment',
  sub: 'Tăng Sub',
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Chờ duyệt', cls: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' },
  queued: { label: 'Đang chờ chạy', cls: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
  running: { label: 'Đang chạy', cls: 'text-primary-neon bg-primary-neon/10 border-primary-neon/20' },
  partial: { label: 'Một phần', cls: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  completed: { label: 'Hoàn thành', cls: 'text-green-300 bg-green-500/10 border-green-500/20' },
  rejected: { label: 'Từ chối', cls: 'text-red-300 bg-red-500/10 border-red-500/20' },
  cancelled: { label: 'Đã hủy', cls: 'text-red-300 bg-red-500/10 border-red-500/20' },
  failed: { label: 'Lỗi', cls: 'text-red-300 bg-red-500/10 border-red-500/20' },
};

type TelegramConfig = {
  telegramBotToken: string;
  telegramChatId: string;
  telegramOrderNotifications: boolean;
  envConfigured?: boolean;
};

type YoutubeSystemConfig = {
  youtubeOrderTimeoutHours: number;
  youtubeOverdueScanLastAt?: string | null;
  youtubeOverdueScanSource?: string | null;
  youtubeOverdueScanStatus?: string | null;
  youtubeOverdueScanCompleted?: number;
};

const completionLabels: Record<string, string> = {
  completed: 'Đơn hoàn thành',
  completed_overdue: 'Hoàn thành quá thời gian',
  completed_by_admin: 'Hoàn thành bởi admin',
  settled: 'Quyết toán đủ',
  settled_with_refund: 'Quyết toán và hoàn tiền',
};

function completionEvents(order: any) {
  return (order.events || []).filter((event: any) => completionLabels[event.type]);
}

function completionTime(order: any) {
  const event = completionEvents(order)[0];
  return event?.createdAt || null;
}
function targetDelivered(target: any) {
  return Math.min(Number(target.deliveredQuantity || target.ytbQuotaDone || 0), Number(target.quantity || 0));
}

function orderDelivered(order: any) {
  return (order.targets || []).reduce((sum: number, target: any) => sum + targetDelivered(target), 0);
}

function buttonClass(extra = '') {
  return `cursor-pointer transition-colors ${extra}`;
}

export default function AdminYoutubePage() {
  const [tab, setTab] = useState<'config' | 'orders' | 'reports'>('config');
  const [configs, setConfigs] = useState<any[]>([]);
  const [telegram, setTelegram] = useState<TelegramConfig>({ telegramBotToken: '', telegramChatId: '', telegramOrderNotifications: false });
  const [system, setSystem] = useState<YoutubeSystemConfig>({ youtubeOrderTimeoutHours: 24 });
  const [realtimeStatus, setRealtimeStatus] = useState<any>(null);
  const [newWorkerApiKey, setNewWorkerApiKey] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>({ targets: [], histories: [], workers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('all');
  const [serviceType, setServiceType] = useState('');
  const [reportWorker, setReportWorker] = useState('');
  const [reportServiceType, setReportServiceType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status) params.set('status', status);
      if (serviceType) params.set('serviceType', serviceType);

      const reportParams = new URLSearchParams({ limit: '50' });
      if (reportWorker) reportParams.set('workerKey', reportWorker);
      if (reportServiceType) reportParams.set('serviceType', reportServiceType);

      const [configRes, orderRes, realtimeRes, reportRes] = await Promise.all([
        fetch('/api/admin/youtube/config'),
        fetch(`/api/admin/youtube/orders?${params}`),
        fetch('/api/admin/youtube/realtime-status'),
        fetch(`/api/admin/youtube/reports?${reportParams}`),
      ]);

      const configData = await configRes.json();
      const orderData = await orderRes.json().catch(() => ({ orders: [] }));
      const realtimeData = await realtimeRes.json().catch(() => null);
      const reportJson = await reportRes.json().catch(() => ({ targets: [], histories: [], workers: [] }));

      if (!configRes.ok) throw new Error(configData.error || 'Không tải được cấu hình YouTube');

      setConfigs(configData.configs || []);
      setTelegram(configData.telegram || telegram);
      setSystem(configData.system || system);
      setOrders(orderData.orders || []);
      setRealtimeStatus(realtimeData);
      setReportData(reportJson);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải dữ liệu YouTube admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, serviceType, reportWorker, reportServiceType]);

  const updateConfig = (serviceTypeKey: string, patch: Record<string, any>) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.serviceType === serviceTypeKey ? { ...cfg, ...patch } : cfg)));
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      const payload = configs.map((cfg) => ({
        serviceType: cfg.serviceType,
        name: cfg.name,
        isActive: Boolean(cfg.isActive),
        minQuantity: Number(cfg.minQuantity),
        maxQuantity: Number(cfg.maxQuantity),
        defaultQuantity: Number(cfg.defaultQuantity),
        pricePerUnit: Number(cfg.pricePerUnit),
        requireApproval: Boolean(cfg.requireApproval),
        overdeliveryPercent: Number(cfg.overdeliveryPercent),
        telegramEnabled: Boolean(cfg.telegramEnabled),
        defaultConfig: cfg.defaultConfig || {},
      }));

      const res = await fetch('/api/admin/youtube/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          configs: payload,
          telegram: {
            telegramBotToken: telegram.telegramBotToken || null,
            telegramChatId: telegram.telegramChatId || null,
            telegramOrderNotifications: Boolean(telegram.telegramOrderNotifications),
          },
          system: {
            youtubeOrderTimeoutHours: Number(system.youtubeOrderTimeoutHours || 24),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không lưu được cấu hình');
      setConfigs(data.configs || []);
      setTelegram(data.telegram || telegram);
      setSystem(data.system || system);
      toast.success('Đã lưu cấu hình YouTube');
    } catch (error: any) {
      toast.error(error.message || 'Không lưu được cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const testTelegram = async () => {
    try {
      const res = await fetch('/api/admin/youtube/telegram/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: telegram.telegramBotToken || null,
          telegramChatId: telegram.telegramChatId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test Telegram thất bại');
      toast.success('Đã gửi tin test Telegram');
    } catch (error: any) {
      toast.error(error.message || 'Test Telegram thất bại');
    }
  };

  const action = async (id: string, name: 'approve' | 'reject' | 'sync' | 'compensate' | 'complete') => {
    try {
      let body: any = undefined;
      if (name === 'reject') {
        const reason = prompt('Lý do từ chối:');
        if (reason === null) return;
        body = { reason };
      }
      if (name === 'compensate') {
        const quantityRaw = prompt('Số lượng bù cho mỗi target:');
        if (quantityRaw === null) return;
        body = { quantity: Number(quantityRaw), reason: 'Admin tạo đơn bù khi bị tụt' };
      }
      if (name === 'complete') {
        const ok = confirm('Đánh dấu đơn này là hoàn thành? Đơn sẽ dừng cấp việc mới cho worker.');
        if (!ok) return;
        const reason = prompt('Ghi chú hoàn thành:', 'Admin đánh dấu đơn YouTube hoàn thành');
        if (reason === null) return;
        body = { reason };
      }

      const res = await fetch(`/api/admin/youtube/orders/${id}/${name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại');
      toast.success('Đã thực hiện thao tác');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Thao tác thất bại');
    }
  };

  const createWorkerKey = async () => {
    try {
      const workerKey = prompt('Worker key, ví dụ: ytb-vps-01') || '';
      if (!workerKey.trim()) return;
      const label = prompt('Tên hiển thị cho worker:', workerKey) || workerKey;
      const res = await fetch('/api/admin/youtube/workers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerKey: workerKey.trim(), label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tạo được worker key');
      setNewWorkerApiKey(data.apiKey || '');
      toast.success('Đã tạo worker API key. Hãy copy key này ngay bây giờ.');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Không tạo được worker key');
    }
  };

  const toggleTarget = async (id: string, isPaused: boolean) => {
    try {
      const res = await fetch(`/api/admin/youtube/targets/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPaused }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không cập nhật được video');
      toast.success(isPaused ? 'Đã tạm dừng video' : 'Đã bật lại video');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Không cập nhật được video');
    }
  };

  const updateTargetQuantity = async (target: any) => {
    const current = Number(target.executionQuantity || target.quantity || 0);
    const min = Number(target.quantity || 0);
    const raw = prompt(`Nhập quota chạy mới cho ${target.targetKey}. Tối thiểu: ${min}`, String(current));
    if (raw === null) return;
    const executionQuantity = Number(raw);
    if (!Number.isInteger(executionQuantity) || executionQuantity < min) {
      toast.error(`Quota chạy phải là số nguyên và không được nhỏ hơn ${min}`);
      return;
    }

    try {
      const res = await fetch(`/api/admin/youtube/targets/${target.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ executionQuantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không cập nhật được quota chạy');
      toast.success('Đã cập nhật quota chạy');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Không cập nhật được quota chạy');
    }
  };

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Youtube size={16} />
            Admin
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline">Quản lý YouTube</h1>
          <p className="text-on-surface-variant mt-1">Cấu hình giá, Telegram, duyệt đơn, sync, worker và báo cáo xử lý.</p>
        </div>
        <div className="flex rounded-lg bg-surface-container p-1 border border-white/5">
          {[
            ['config', 'Cấu hình dịch vụ'],
            ['orders', 'Đơn hàng'],
            ['reports', 'Báo cáo'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value as any)}
              className={buttonClass(`px-4 py-2 rounded-md text-sm font-bold hover:text-on-surface ${tab === value ? 'bg-primary-neon text-surface' : 'text-on-surface-variant'}`)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <RealtimeStatusCard status={realtimeStatus} newWorkerApiKey={newWorkerApiKey} createWorkerKey={createWorkerKey} />

      {tab === 'config' ? (
        <ConfigSection
          configs={configs}
          telegram={telegram}
          system={system}
          setTelegram={setTelegram}
          setSystem={setSystem}
          loading={loading}
          saving={saving}
          updateConfig={updateConfig}
          saveConfigs={saveConfigs}
          testTelegram={testTelegram}
        />
      ) : tab === 'orders' ? (
        <OrdersSection
          loading={loading}
          orders={orders}
          status={status}
          setStatus={setStatus}
          serviceType={serviceType}
          setServiceType={setServiceType}
          action={action}
          toggleTarget={toggleTarget}
          updateTargetQuantity={updateTargetQuantity}
        />
      ) : (
        <ReportsSection
          loading={loading}
          reportData={reportData}
          serviceType={reportServiceType}
          setServiceType={setReportServiceType}
          workerKey={reportWorker}
          setWorkerKey={setReportWorker}
          toggleTarget={toggleTarget}
          updateTargetQuantity={updateTargetQuantity}
        />
      )}
    </main>
  );
}

function RealtimeStatusCard({ status, newWorkerApiKey, createWorkerKey }: { status: any; newWorkerApiKey: string; createWorkerKey: () => void }) {
  const isOnline = status?.status === 'online' && Number(status?.activeClients || 0) > 0;
  const isWarning = status?.status === 'no_active_worker';
  const tone = isOnline
    ? 'border-green-500/20 bg-green-500/10 text-green-300'
    : isWarning
      ? 'border-yellow-500/25 bg-yellow-500/10 text-yellow-300'
      : 'border-red-500/25 bg-red-500/10 text-red-300';
  const title = !status
    ? 'Đang kiểm tra worker YouTube'
    : isOnline
      ? 'Worker Python đang hoạt động'
      : status.status === 'no_active_worker'
        ? 'Chưa thấy worker Python hoạt động'
        : 'Không đọc được trạng thái worker';
  const clients = Array.isArray(status?.clients) ? status.clients.slice(0, 4) : [];
  const stats = Array.isArray(status?.jobStats) ? status.jobStats : [];
  const doneCount = stats.filter((row: any) => ['done', 'completed'].includes(row.status)).reduce((sum: number, row: any) => sum + Number(row._count?._all || 0), 0);
  const failedCount = stats.filter((row: any) => row.status === 'failed').reduce((sum: number, row: any) => sum + Number(row._count?._all || 0), 0);

  return (
    <section className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-3">
          <Activity size={20} className="shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-on-surface">{title}</h2>
            <p className="text-sm mt-1">{status?.message || 'Hệ thống đang đọc heartbeat worker từ Maps.'}</p>
            <p className="text-xs text-on-surface-variant mt-2">
              Worker hoạt động: {Number(status?.activeClients || 0)} / {Number(status?.totalClients || 0)} client · Queue: {Number(status?.queuedTargets || 0)} target · 24h hoàn thành/lỗi: {doneCount}/{failedCount}
            </p>
            {newWorkerApiKey && (
              <div className="mt-3 rounded-lg bg-surface-container-lowest border border-white/10 p-3 text-xs">
                <div className="font-bold text-on-surface mb-1">Worker API key mới - chỉ hiển thị một lần</div>
                <code className="block break-all text-primary-neon">{newWorkerApiKey}</code>
              </div>
            )}
          </div>
        </div>

        <button onClick={createWorkerKey} className={buttonClass('rounded-lg bg-primary-neon text-surface px-4 py-2 text-sm font-bold shrink-0 hover:bg-primary-neon/90')}>
          Tạo worker key
        </button>

        {clients.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 min-w-[280px]">
            {clients.map((client: any) => (
              <div key={client.client_id || client.clientId} className="rounded-lg bg-surface-container-lowest/70 border border-white/10 p-3 text-xs">
                <div className="font-bold text-on-surface truncate">{client.client_id || client.clientId || 'worker'}</div>
                <div className="text-on-surface-variant">Dịch vụ: {(client.capabilities || []).join(', ') || '-'}</div>
                <div className="text-on-surface-variant">Key: {client.apiKeyPrefix ? `${client.apiKeyPrefix}...` : 'global/env'}</div>
                <div className="text-on-surface-variant">Lần cuối: {client.last_seen_at ? new Date(Number(client.last_seen_at) * 1000).toLocaleString('vi-VN') : '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ConfigSection({
  configs,
  telegram,
  system,
  setTelegram,
  setSystem,
  loading,
  saving,
  updateConfig,
  saveConfigs,
  testTelegram,
}: {
  configs: any[];
  telegram: TelegramConfig;
  system: YoutubeSystemConfig;
  setTelegram: (value: TelegramConfig) => void;
  setSystem: (value: YoutubeSystemConfig) => void;
  loading: boolean;
  saving: boolean;
  updateConfig: (serviceType: string, patch: Record<string, any>) => void;
  saveConfigs: () => void;
  testTelegram: () => void;
}) {
  const lastScanAt = system.youtubeOverdueScanLastAt ? new Date(system.youtubeOverdueScanLastAt) : null;
  const scanAgeMinutes = lastScanAt ? Math.floor((Date.now() - lastScanAt.getTime()) / 60000) : null;
  const scanIsFresh = scanAgeMinutes !== null && scanAgeMinutes <= 30;
  const scanSourceLabel = system.youtubeOverdueScanSource === 'cron' ? 'Cron tự động' : system.youtubeOverdueScanSource === 'worker' ? 'Worker kích hoạt' : 'Chưa có dữ liệu';
  const scanStatusLabel = lastScanAt
    ? system.youtubeOverdueScanSource === 'cron' && scanIsFresh
      ? 'Đang hoạt động'
      : system.youtubeOverdueScanSource === 'cron'
        ? 'Có cron nhưng đã lâu chưa chạy'
        : 'Có quét khi worker hoạt động'
    : 'Chưa thấy lịch quét chạy';

  return (
    <section className="space-y-6">
      <div className="grid md:grid-cols-6 gap-3">
        <SummaryCard label="Bật dịch vụ" value={`${configs.filter((cfg) => cfg.isActive).length}/${configs.length}`} />
        <SummaryCard label="Cần duyệt" value={`${configs.filter((cfg) => cfg.requireApproval).length}/${configs.length}`} />
        <SummaryCard label="Telegram" value={telegram.telegramOrderNotifications ? 'Bật' : 'Tắt'} />
        <SummaryCard label="Giá thấp nhất" value={configs.length ? `${Math.min(...configs.map((cfg) => Number(cfg.pricePerUnit || 0))).toLocaleString('vi-VN')} xu` : '-'} />
        <SummaryCard label="Khấu hao cao nhất" value={configs.length ? `${Math.max(...configs.map((cfg) => Number(cfg.overdeliveryPercent || 0)))}%` : '-'} />
      </div>

      <div className="bg-surface-container rounded-lg border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center gap-2">
          <Settings size={18} className="text-primary-neon" />
          <div>
            <h2 className="font-bold text-on-surface">Cấu hình giá và trạng thái từng dịch vụ</h2>
            <p className="text-xs text-on-surface-variant">Bật/tắt dịch vụ, đặt giá, giới hạn số lượng, duyệt đơn và % khấu hao.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-on-surface-variant">Đang tải cấu hình...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                <tr className="border-b border-white/5">
                  <th className="p-4 text-left">Dịch vụ</th>
                  <th className="p-4 text-left">Bật/tắt</th>
                  <th className="p-4 text-left">Giá / đơn vị</th>
                  <th className="p-4 text-left">Min</th>
                  <th className="p-4 text-left">Max</th>
                  <th className="p-4 text-left">Mặc định</th>
                  <th className="p-4 text-left">Duyệt đơn</th>
                  <th className="p-4 text-left">% khấu hao</th>
                  <th className="p-4 text-left">Báo Telegram</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {configs.map((cfg) => (
                  <tr key={cfg.serviceType}>
                    <td className="p-4 font-bold text-on-surface">{serviceLabels[cfg.serviceType]}</td>
                    <td className="p-4"><Toggle checked={cfg.isActive} onChange={(checked) => updateConfig(cfg.serviceType, { isActive: checked })} on="Đang bật" off="Đang tắt" /></td>
                    <td className="p-4"><NumberInput value={Number(cfg.pricePerUnit)} onChange={(value) => updateConfig(cfg.serviceType, { pricePerUnit: value })} suffix="xu" /></td>
                    <td className="p-4"><NumberInput value={Number(cfg.minQuantity)} onChange={(value) => updateConfig(cfg.serviceType, { minQuantity: value })} /></td>
                    <td className="p-4"><NumberInput value={Number(cfg.maxQuantity)} onChange={(value) => updateConfig(cfg.serviceType, { maxQuantity: value })} /></td>
                    <td className="p-4"><NumberInput value={Number(cfg.defaultQuantity)} onChange={(value) => updateConfig(cfg.serviceType, { defaultQuantity: value })} /></td>
                    <td className="p-4"><Toggle checked={cfg.requireApproval} onChange={(checked) => updateConfig(cfg.serviceType, { requireApproval: checked })} on="Cần duyệt" off="Tự động" /></td>
                    <td className="p-4"><NumberInput value={Number(cfg.overdeliveryPercent)} onChange={(value) => updateConfig(cfg.serviceType, { overdeliveryPercent: value })} suffix="%" /></td>
                    <td className="p-4"><Toggle checked={cfg.telegramEnabled} onChange={(checked) => updateConfig(cfg.serviceType, { telegramEnabled: checked })} on="Báo" off="Không" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="bg-surface-container rounded-lg p-5 border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-primary-neon" />
            <div>
              <h2 className="font-bold text-on-surface">Thông báo Telegram bot</h2>
              <p className="text-xs text-on-surface-variant">Dùng để báo đơn mới, đơn hoàn thành và lỗi sync YouTube.</p>
            </div>
          </div>

          {telegram.envConfigured && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-300">
              Server đã cấu hình Telegram trong env. Giá trị trong form chỉ dùng khi env thiếu.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={telegram.telegramOrderNotifications}
              onChange={(e) => setTelegram({ ...telegram, telegramOrderNotifications: e.target.checked })}
              className="accent-primary-neon cursor-pointer"
            />
            Bật thông báo đơn YouTube qua Telegram
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <label>
              <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1 block">Bot token</span>
              <input
                type="password"
                value={telegram.telegramBotToken || ''}
                onChange={(e) => setTelegram({ ...telegram, telegramBotToken: e.target.value })}
                placeholder="123456:ABC..."
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface"
              />
            </label>
            <label>
              <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1 block">Chat ID</span>
              <input
                value={telegram.telegramChatId || ''}
                onChange={(e) => setTelegram({ ...telegram, telegramChatId: e.target.value })}
                placeholder="-1001234567890"
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={testTelegram}
            className={buttonClass('rounded-lg bg-blue-500/10 text-blue-300 px-4 py-2 text-sm font-bold hover:bg-blue-500/20')}
          >
            Gửi test Telegram
          </button>
          <div className="rounded-lg bg-surface-container-lowest border border-white/10 p-3 text-xs text-on-surface-variant space-y-1">
            <p className="font-bold text-on-surface">Hướng dẫn cấu hình Telegram</p>
            <p>1. Mở Telegram, tìm @BotFather, gửi /newbot và copy Bot token.</p>
            <p>2. Thêm bot vào group/kênh cần nhận thông báo, cấp quyền gửi tin.</p>
            <p>3. Lấy Chat ID bằng cách gửi tin vào group rồi mở: https://api.telegram.org/botTOKEN/getUpdates. Group thường có Chat ID dạng -100...</p>
            <p>4. Nhập Bot token và Chat ID, bấm Lưu cấu hình, sau đó bấm Gửi test Telegram.</p>
          </div>
        </div>

        <div className="bg-surface-container rounded-lg p-5 border border-white/5">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-yellow-400 shrink-0" />
              <div>
                <p className="font-bold text-on-surface">Thời gian quá hạn đơn</p>
                <p className="text-xs text-on-surface-variant">Qua số giờ này, đơn đang chạy sẽ tự hoàn thành và không cấp việc mới cho worker.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={8760}
                value={system.youtubeOrderTimeoutHours}
                onChange={(e) => setSystem({ ...system, youtubeOrderTimeoutHours: Number(e.target.value || 24) })}
                className="w-32 bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface"
              />
              <span className="text-sm text-on-surface-variant">giờ</span>
            </div>
            <div className="mt-4 rounded-lg bg-surface-container-lowest border border-white/10 p-3 text-xs text-on-surface-variant space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-on-surface">Trạng thái quét quá hạn</span>
                <span className={`rounded-full border px-2 py-1 font-bold ${scanIsFresh ? 'text-green-300 border-green-500/20 bg-green-500/10' : 'text-yellow-300 border-yellow-500/20 bg-yellow-500/10'}`}>
                  {scanStatusLabel}
                </span>
              </div>
              <p>Nguồn chạy gần nhất: {scanSourceLabel}</p>
              <p>Lần quét gần nhất: {lastScanAt ? lastScanAt.toLocaleString('vi-VN') : 'Chưa có'}</p>
              <p>Số đơn tự hoàn thành lần gần nhất: {Number(system.youtubeOverdueScanCompleted || 0).toLocaleString('vi-VN')}</p>
            </div>          </div>
          <div className="text-xs text-on-surface-variant flex gap-2">
            <ShieldAlert size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="font-bold text-on-surface mb-1">Ghi chú % khấu hao</p>
              <p>Đây là quota chạy ẩn, user không thấy. Ví dụ đặt 30% thì user mua 1000 like, hệ thống giao 1300 like cho worker nhưng chỉ tính tiền 1000 like.</p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={saveConfigs} disabled={saving} className={buttonClass('w-full bg-primary-neon text-surface font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-neon/90 disabled:opacity-50 disabled:cursor-not-allowed')}>
        <Save size={18} />
        {saving ? 'Đang lưu...' : 'Lưu toàn bộ cấu hình YouTube'}
      </button>
    </section>
  );
}

function OrdersSection({
  loading,
  orders,
  status,
  setStatus,
  serviceType,
  setServiceType,
  action,
  toggleTarget,
  updateTargetQuantity,
}: {
  loading: boolean;
  orders: any[];
  status: string;
  setStatus: (value: string) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  action: (id: string, name: 'approve' | 'reject' | 'sync' | 'compensate' | 'complete') => void;
  toggleTarget: (id: string, isPaused: boolean) => void;
  updateTargetQuantity: (target: any) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="bg-surface-container rounded-lg p-4 border border-white/5 grid md:grid-cols-2 gap-3">
        <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="cursor-pointer bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
          <option value="">Tất cả dịch vụ</option>
          <option value="like">Tăng Like</option>
          <option value="view">Tăng View</option>
          <option value="comment">Tăng Comment</option>
          <option value="sub">Tăng Sub</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="cursor-pointer bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
          <option value="all">Tất cả trạng thái</option>
          <option value="pending_review">Chờ duyệt</option>
          <option value="queued">Đang chờ chạy</option>
          <option value="running">Đang chạy</option>
          <option value="partial">Một phần</option>
          <option value="completed">Hoàn thành</option>
          <option value="rejected">Từ chối</option>
          <option value="failed">Lỗi</option>
        </select>
      </div>

      <div className="bg-surface-container rounded-lg border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-on-surface-variant">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Không có đơn YouTube nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                <tr className="border-b border-white/5">
                  <th className="p-4 text-left">Khách hàng</th>
                  <th className="p-4 text-left">Thời gian</th>
                  <th className="p-4 text-left">Dịch vụ</th>
                  <th className="p-4 text-left">Target</th>
                  <th className="p-4 text-left">Trạng thái</th>
                  <th className="p-4 text-left">Tiến độ</th>
                  <th className="p-4 text-left">Xu</th>
                  <th className="p-4 text-left">Lịch sử hoàn thành</th>
                  <th className="p-4 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => {
                  const meta = statusMeta[order.status] || { label: order.status, cls: 'text-on-surface-variant bg-surface-container-lowest border-white/10' };
                  const delivered = orderDelivered(order);
                  const histories = completionEvents(order);
                  const completedAt = completionTime(order);
                  return (
                    <tr key={order.id} className="hover:bg-white/5 align-top">
                      <td className="p-4 text-on-surface">{order.client?.email}</td>
                      <td className="p-4 min-w-[180px] text-xs text-on-surface-variant">
                        <div><span className="font-bold text-on-surface">Đặt:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}</div>
                        <div className="mt-1"><span className="font-bold text-on-surface">Hoàn thành:</span> {completedAt ? new Date(completedAt).toLocaleString('vi-VN') : '-'}</div>
                      </td>
                      <td className="p-4 font-bold text-on-surface">{serviceLabels[order.serviceType]}</td>
                      <td className="p-4 min-w-[320px]">
                        <div className="space-y-2">
                          {order.targets?.map((target: any) => (
                            <div key={target.id} className="rounded-lg bg-surface-container-lowest p-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-on-surface truncate">{target.targetKey}</span>
                                <span className="text-xs text-on-surface-variant shrink-0">{targetDelivered(target).toLocaleString('vi-VN')} / {Number(target.quantity).toLocaleString('vi-VN')}</span>
                              </div>
                              <div className="mt-1 text-[11px] text-on-surface-variant">
                                Quota gửi: {Number(target.executionQuantity || 0).toLocaleString('vi-VN')}
                                {target.ytbStatus ? ` · Worker: ${target.ytbStatus}` : ''}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => toggleTarget(target.id, !target.isPaused)}
                                  className={buttonClass(`rounded-lg px-2 py-1 text-[11px] font-bold ${target.isPaused ? 'bg-green-500/10 text-green-300 hover:bg-green-500/20' : 'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'}`)}
                                >
                                  {target.isPaused ? 'Bật lại video' : 'Tạm dừng video'}
                                </button>
                                <button
                                  onClick={() => updateTargetQuantity(target)}
                                  className={buttonClass('rounded-lg px-2 py-1 text-[11px] font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20')}
                                >
                                  Sửa quota chạy
                                </button>
                              </div>
                              {target.ytbLastError && <div className="mt-1 text-[11px] text-red-300 truncate">{target.ytbLastError}</div>}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${meta.cls}`}>{meta.label}</span></td>
                      <td className="p-4 text-on-surface">{delivered.toLocaleString('vi-VN')} / {Number(order.totalQuantity).toLocaleString('vi-VN')}</td>
                      <td className="p-4 text-on-surface">{Number(order.totalCost).toLocaleString('vi-VN')}</td>
                      <td className="p-4 min-w-[240px]">
                        {histories.length === 0 ? (
                          <span className="text-xs text-on-surface-variant">Chưa có</span>
                        ) : (
                          <div className="space-y-2">
                            {histories.slice(0, 4).map((event: any) => (
                              <div key={event.id} className="rounded-lg bg-surface-container-lowest border border-white/10 p-2 text-xs">
                                <div className="font-bold text-on-surface">{completionLabels[event.type] || event.type}</div>
                                <div className="text-on-surface-variant mt-0.5">{event.message}</div>
                                <div className="text-on-surface-variant mt-1">{new Date(event.createdAt).toLocaleString('vi-VN')}{event.actor?.email ? ` · ${event.actor.email}` : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'pending_review' && (
                            <>
                              <button onClick={() => action(order.id, 'approve')} className={buttonClass('px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold flex items-center gap-1 hover:bg-green-500/20')}><CheckCircle size={14} />Duyệt</button>
                              <button onClick={() => action(order.id, 'reject')} className={buttonClass('px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-1 hover:bg-red-500/20')}><XCircle size={14} />Từ chối</button>
                            </>
                          )}
                          <button onClick={() => action(order.id, 'sync')} className={buttonClass('px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 text-xs font-bold flex items-center gap-1 hover:bg-blue-500/20')}><RefreshCw size={14} />Sync</button>
                          {!['completed', 'rejected', 'cancelled'].includes(order.status) && (
                            <button onClick={() => action(order.id, 'complete')} className={buttonClass('px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300 text-xs font-bold flex items-center gap-1 hover:bg-green-500/20')}><CheckCircle size={14} />Hoàn thành</button>
                          )}
                          <button onClick={() => action(order.id, 'compensate')} className={buttonClass('px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-300 text-xs font-bold hover:bg-yellow-500/20')}>Bù đơn</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ReportsSection({
  loading,
  reportData,
  serviceType,
  setServiceType,
  workerKey,
  setWorkerKey,
  toggleTarget,
  updateTargetQuantity,
}: {
  loading: boolean;
  reportData: any;
  serviceType: string;
  setServiceType: (value: string) => void;
  workerKey: string;
  setWorkerKey: (value: string) => void;
  toggleTarget: (id: string, isPaused: boolean) => void;
  updateTargetQuantity: (target: any) => void;
}) {
  const targets = reportData?.targets || [];
  const histories = reportData?.histories || [];
  const workers = reportData?.workers || [];
  const historiesByTarget = new Map<string, any[]>();
  for (const row of histories) {
    if (!row.targetId) continue;
    const list = historiesByTarget.get(row.targetId) || [];
    if (list.length < 8) list.push(row);
    historiesByTarget.set(row.targetId, list);
  }

  return (
    <section className="space-y-4">
      <div className="bg-surface-container rounded-lg p-4 border border-white/5 grid md:grid-cols-2 gap-3">
        <select value={workerKey} onChange={(e) => setWorkerKey(e.target.value)} className="cursor-pointer bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
          <option value="">Tất cả worker</option>
          {workers.map((worker: any) => (
            <option key={worker.workerKey} value={worker.workerKey}>{worker.label || worker.workerKey}</option>
          ))}
        </select>
        <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="cursor-pointer bg-surface-container-lowest border border-white/10 rounded-lg p-3 text-on-surface">
          <option value="">Tất cả dịch vụ</option>
          <option value="like">Tăng Like</option>
          <option value="view">Tăng View</option>
          <option value="comment">Tăng Comment</option>
          <option value="sub">Tăng Sub</option>
        </select>
      </div>

      <div className="bg-surface-container rounded-lg border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-on-surface-variant">Đang tải báo cáo...</div>
        ) : targets.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">Chưa có dữ liệu báo cáo YouTube.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                <tr className="border-b border-white/5">
                  <th className="p-4 text-left">Video</th>
                  <th className="p-4 text-left">Dịch vụ</th>
                  <th className="p-4 text-left">Like/Quota</th>
                  <th className="p-4 text-left">Gmail/IP</th>
                  <th className="p-4 text-left">IP trùng</th>
                  <th className="p-4 text-left">Lịch sử gần nhất</th>
                  <th className="p-4 text-left">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {targets.map((target: any) => {
                  const rows = historiesByTarget.get(target.id) || [];
                  const occurrenceBuckets = target.ipStats?.occurrenceBuckets || [];
                  return (
                    <tr key={target.id} className="hover:bg-white/5 align-top">
                      <td className="p-4 min-w-[220px]">
                        <div className="font-bold text-on-surface truncate">{target.targetKey}</div>
                        <div className="text-xs text-on-surface-variant truncate">{target.client?.email || '-'}</div>
                      </td>
                      <td className="p-4 text-on-surface">{serviceLabels[target.serviceType] || target.serviceType}</td>
                      <td className="p-4 text-on-surface">
                        <div className="font-bold text-primary-neon">{Number(target.ytbQuotaDone || 0).toLocaleString('vi-VN')} / {Number(target.executionQuantity || 0).toLocaleString('vi-VN')}</div>
                        <div className="text-xs text-on-surface-variant">User thấy: {Number(target.deliveredQuantity || 0).toLocaleString('vi-VN')} / {Number(target.quantity || 0).toLocaleString('vi-VN')}</div>
                      </td>
                      <td className="p-4 text-on-surface">
                        <div>{Number(target.uniqueGmailCount || 0).toLocaleString('vi-VN')} Gmail</div>
                        <div className="text-xs text-on-surface-variant">{Number(target.ipStats?.uniqueIpCount || 0).toLocaleString('vi-VN')} IP</div>
                      </td>
                      <td className="p-4 text-on-surface min-w-[180px]">
                        <div>Tổng IP ({Number(target.ipStats?.totalIpCount || 0).toLocaleString('vi-VN')})</div>
                        <div className="text-xs text-on-surface-variant">{Number(target.ipStats?.uniqueIpCount || 0).toLocaleString('vi-VN')} IP khác nhau</div>
                        <div className="mt-2 space-y-1">
                          {occurrenceBuckets.length === 0 ? (
                            <div className="text-[11px] text-on-surface-variant">Chưa có dữ liệu IP</div>
                          ) : occurrenceBuckets.map((row: any) => (
                            <div key={`${target.id}-${row.occurrences}`} className="text-[11px] text-on-surface-variant">
                              Trùng IP {Number(row.occurrences).toLocaleString('vi-VN')} ({Number(row.ipCount || 0).toLocaleString('vi-VN')})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 min-w-[300px]">
                        <div className="space-y-1">
                          {rows.map((row: any) => (
                            <div key={row.id} className="rounded bg-surface-container-lowest p-2 text-xs">
                              <span className={row.status === 'success' ? 'text-green-300' : 'text-yellow-300'}>{row.status === 'success' ? 'Thành công' : row.status}</span>
                              <span className="text-on-surface"> · {row.gmail || '-'}</span>
                              <span className="text-on-surface-variant"> · {row.ip || '-'}</span>
                              <div className="text-on-surface-variant">{new Date(row.actedAt).toLocaleString('vi-VN')} · {row.workerKey}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleTarget(target.id, !target.isPaused)}
                            className={buttonClass(`rounded-lg px-3 py-1.5 text-xs font-bold ${target.isPaused ? 'bg-green-500/10 text-green-300 hover:bg-green-500/20' : 'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'}`)}
                          >
                            {target.isPaused ? 'Bật lại' : 'Tạm dừng'}
                          </button>
                          <button
                            onClick={() => updateTargetQuantity(target)}
                            className={buttonClass('rounded-lg px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20')}
                          >
                            Sửa quota
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-on-surface-variant">{target.isPaused ? 'Đang tắt' : (statusMeta[target.status]?.label || target.status || 'Đang chờ chạy')}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container rounded-lg p-4 border border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{label}</p>
      <p className="text-xl font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="w-28 bg-surface-container-lowest border border-white/10 rounded-lg p-2 text-on-surface"
      />
      {suffix && <span className="text-xs text-on-surface-variant">{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, on, off }: { checked: boolean; onChange: (checked: boolean) => void; on: string; off: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={buttonClass(`w-28 rounded-lg px-3 py-2 text-xs font-bold border ${
        checked
          ? 'bg-primary-neon/15 text-primary-neon border-primary-neon/30 hover:bg-primary-neon/25'
          : 'bg-surface-container-lowest text-on-surface-variant border-white/10 hover:bg-white/10'
      }`)}
    >
      {checked ? on : off}
    </button>
  );
}
