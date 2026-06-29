'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, History, Loader2, Send, Youtube } from 'lucide-react';
import { toast } from 'sonner';

type ServiceType = 'like' | 'view' | 'comment' | 'sub';

type Config = {
  serviceType: ServiceType;
  name: string;
  isActive: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  pricePerUnit: string | number;
  requireApproval: boolean;
};

const labels: Record<ServiceType, string> = {
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

function videoKey(raw: string) {
  const value = raw.trim();
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.includes('youtube.com')) {
      const byQuery = url.searchParams.get('v');
      if (byQuery) return byQuery;
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex((part) => ['shorts', 'embed', 'live'].includes(part));
      if (marker >= 0) return parts[marker + 1] || '';
    }
  } catch {
    return value;
  }
  return '';
}

function channelKey(raw: string) {
  let value = raw.trim();
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    value = parts[0] === 'channel' && parts[1] ? parts[1] : parts[0] || '';
  } catch {
    // Keep raw value.
  }
  if (value && !value.startsWith('@') && !value.startsWith('UC')) value = `@${value}`;
  return value;
}

function parseTargets(serviceType: ServiceType, raw: string, quantity: number) {
  const errors: string[] = [];
  const targets: { key: string; quantity: number; raw: string }[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const [targetRaw, qtyRaw] = line.split('|').map((part) => part.trim());
    const key = serviceType === 'sub' ? channelKey(targetRaw) : videoKey(targetRaw);
    const valid = serviceType === 'sub'
      ? /^(@[A-Za-z0-9._-]{2,}|UC[A-Za-z0-9_-]{10,})$/.test(key)
      : /^[A-Za-z0-9_-]{6,}$/.test(key);
    const qty = qtyRaw ? Number(qtyRaw) : quantity;

    if (!valid) errors.push(`${line}: link hoặc ID không hợp lệ`);
    else if (!Number.isInteger(qty) || qty <= 0) errors.push(`${line}: số lượng không hợp lệ`);
    else if (seen.has(key)) errors.push(`${line}: target bị trùng`);
    else {
      seen.add(key);
      targets.push({ key, quantity: qty, raw: line });
    }
  }

  return { targets, errors };
}

function targetProgress(target: any) {
  return Math.min(Number(target.deliveredQuantity || target.ytbQuotaDone || 0), Number(target.quantity || 0));
}

function orderDelivered(order: any) {
  return (order.targets || []).reduce((sum: number, target: any) => sum + targetProgress(target), 0);
}

function buttonClass(extra = '') {
  return `cursor-pointer transition-colors ${extra}`;
}

export default function YoutubeServicePage({ serviceType }: { serviceType: ServiceType }) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [config, setConfig] = useState<Config | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [note, setNote] = useState('');
  const [commentsText, setCommentsText] = useState('');
  const [allowDuplicateComments, setAllowDuplicateComments] = useState(true);

  const reloadOrdersAndWallet = async () => {
    const [ordersRes, walletRes] = await Promise.all([
      fetch(`/api/youtube/orders?serviceType=${serviceType}`),
      fetch('/api/wallet'),
    ]);
    const orderData = await ordersRes.json().catch(() => ({}));
    const walletData = await walletRes.json().catch(() => null);
    if (ordersRes.ok) setOrders(orderData.orders || []);
    if (walletRes.ok) setWallet(walletData);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, ordersRes, walletRes] = await Promise.all([
          fetch('/api/youtube/config/public'),
          fetch(`/api/youtube/orders?serviceType=${serviceType}`),
          fetch('/api/wallet'),
        ]);
        const configData = await configRes.json();
        const orderData = await ordersRes.json();
        const walletData = await walletRes.json().catch(() => null);
        const cfg = configData.services?.find((row: Config) => row.serviceType === serviceType) || null;
        setConfig(cfg);
        setQuantity(cfg?.defaultQuantity || 100);
        setOrders(orderData.orders || []);
        if (walletRes.ok) setWallet(walletData);
      } catch {
        toast.error('Không thể tải dữ liệu YouTube');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [serviceType]);

  const preview = useMemo(() => parseTargets(serviceType, targetInput, quantity), [serviceType, targetInput, quantity]);
  const totalQuantity = preview.targets.reduce((sum, target) => sum + target.quantity, 0);
  const unitPrice = Number(config?.pricePerUnit || 0);
  const totalCost = totalQuantity * unitPrice;
  const availableBalance = Number(wallet?.availableBalance || 0);
  const hasWallet = wallet?.availableBalance !== undefined;
  const remainingBalance = availableBalance - totalCost;
  const insufficientBalance = hasWallet && totalCost > availableBalance;
  const lineCount = Math.max(1, targetInput.split(/\r?\n/).length);

  const submit = async () => {
    if (!config?.isActive) return toast.error('Dịch vụ đang tạm ngưng');
    if (preview.targets.length === 0) return toast.error('Chưa có target hợp lệ');
    if (preview.errors.length > 0) return toast.error('Vui lòng sửa các dòng chưa hợp lệ');
    if (insufficientBalance) return toast.error('Số dư không đủ để tạo đơn này');

    setSubmitting(true);
    try {
      const res = await fetch('/api/youtube/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceType,
          targetsText: targetInput,
          quantity,
          note,
          commentLines: commentsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
          allowDuplicateComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tạo được đơn');
      toast.success(config.requireApproval ? 'Đã tạo đơn, vui lòng chờ duyệt' : 'Đã tạo đơn và đưa vào hàng đợi');
      setTargetInput('');
      setNote('');
      setCommentsText('');
      setAllowDuplicateComments(true);
      setActiveTab('create');
      await reloadOrdersAndWallet();
    } catch (error: any) {
      toast.error(error.message === 'Insufficient balance' ? 'Số dư không đủ để tạo đơn này' : error.message || 'Không tạo được đơn');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-on-surface-variant">Đang tải...</div>;

  return (
    <main className="p-6 md:p-10 max-w-6xl mx-auto pb-32 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Youtube size={16} />
            YouTube
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface font-headline">{labels[serviceType]}</h1>
          <p className="text-on-surface-variant mt-1">Tạo đơn và theo dõi tiến độ dịch vụ YouTube.</p>
        </div>
        <div className="flex rounded-lg bg-surface-container p-1 border border-white/5">
          <button onClick={() => setActiveTab('create')} className={buttonClass(`px-4 py-2 rounded-md text-sm font-bold hover:text-on-surface ${activeTab === 'create' ? 'bg-primary-neon text-surface' : 'text-on-surface-variant'}`)}>
            Tạo chiến dịch
          </button>
          <button onClick={() => setActiveTab('history')} className={buttonClass(`px-4 py-2 rounded-md text-sm font-bold hover:text-on-surface ${activeTab === 'history' ? 'bg-primary-neon text-surface' : 'text-on-surface-variant'}`)}>
            Lịch sử
          </button>
        </div>
      </header>

      {activeTab === 'create' ? (
        <section className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="bg-surface-container rounded-lg p-6 border border-white/5 space-y-6">
            {!config?.isActive && (
              <div className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300 text-sm">
                <AlertCircle size={18} />
                Dịch vụ này đang tạm ngưng.
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                {serviceType === 'sub' ? 'Link kênh YouTube' : 'Link video YouTube'}
              </label>
              <textarea
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                rows={Math.min(8, Math.max(1, lineCount))}
                placeholder={serviceType === 'sub' ? 'https://www.youtube.com/@popskids' : 'hU05BYnHUJA|200'}
                className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-4 text-on-surface outline-none focus:border-primary-neon/50 resize-y"
              />
              <p className="mt-2 text-xs text-on-surface-variant">
                Hỗ trợ một hoặc nhiều dòng. Có thể nhập dạng link/id hoặc `link|số lượng`; nếu không ghi số lượng riêng, hệ thống dùng số lượng mặc định bên dưới.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Số lượng mặc định</label>
                <input
                  type="number"
                  min={config?.minQuantity || 1}
                  max={config?.maxQuantity || 100000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value || 0))}
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-3 text-on-surface outline-none focus:border-primary-neon/50"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">Phạm vi hỗ trợ: {config?.minQuantity} - {config?.maxQuantity}</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Đơn giá</label>
                <input readOnly value={`${unitPrice.toLocaleString('vi-VN')} xu / lượt`} className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-3 text-on-surface outline-none" />
                <p className="text-[11px] text-on-surface-variant mt-1">Áp dụng theo bảng giá hiện hành.</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Tổng xu</label>
                <input readOnly value={`${totalCost.toLocaleString('vi-VN')} xu`} className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-3 text-primary-neon font-bold outline-none" />
                <p className="text-[11px] text-on-surface-variant mt-1">Chi phí dự kiến cho đơn này.</p>
              </div>
            </div>

            {hasWallet && (
              <div className={`rounded-lg border p-4 text-sm ${insufficientBalance ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-white/5 bg-surface-container-lowest text-on-surface'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>Số dư khả dụng: <b>{availableBalance.toLocaleString('vi-VN')} xu</b></span>
                  <span>Sau đơn này: <b>{remainingBalance.toLocaleString('vi-VN')} xu</b></span>
                </div>
              </div>
            )}

            {serviceType === 'comment' && (
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant">Nội dung comment</label>
                <textarea
                  value={commentsText}
                  onChange={(e) => setCommentsText(e.target.value)}
                  rows={7}
                  placeholder="Mỗi dòng là 1 nội dung comment"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-4 text-on-surface outline-none focus:border-primary-neon/50"
                />
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={allowDuplicateComments} onChange={(e) => setAllowDuplicateComments(e.target.checked)} className="accent-primary-neon cursor-pointer" />
                  Cho phép trùng nội dung comment
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-2">Ghi chú</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} className="w-full bg-surface-container-lowest border border-white/10 rounded-xl p-4 text-on-surface outline-none focus:border-primary-neon/50" />
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300 space-y-1">
                {preview.errors.map((error) => <div key={error}>{error}</div>)}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting || !config?.isActive || insufficientBalance}
              className={buttonClass('w-full bg-primary-neon text-surface font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-neon/90 disabled:opacity-50 disabled:cursor-not-allowed')}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Gửi đơn
            </button>
          </div>

          <aside className="bg-surface-container rounded-lg p-6 border border-white/5 h-fit space-y-4">
            <h2 className="font-bold text-on-surface">Tóm tắt</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Target hợp lệ" value={preview.targets.length.toString()} />
              <Metric label="Dòng lỗi" value={preview.errors.length.toString()} danger={preview.errors.length > 0} />
              <Metric label="Tổng số lượng" value={totalQuantity.toLocaleString('vi-VN')} />
              <Metric label="Tổng xu" value={totalCost.toLocaleString('vi-VN')} highlight />
              {hasWallet && <Metric label="Số dư" value={availableBalance.toLocaleString('vi-VN')} />}
              {hasWallet && <Metric label="Còn lại" value={remainingBalance.toLocaleString('vi-VN')} danger={remainingBalance < 0} />}
            </div>

            {preview.targets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Chi tiết target</p>
                {preview.targets.map((target) => (
                  <div key={target.key} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest p-3 text-sm">
                    <span className="text-on-surface truncate">{target.key}</span>
                    <span className="font-bold text-primary-neon shrink-0">{target.quantity.toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 text-xs text-on-surface-variant">
              <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              Mỗi dòng được xử lý như một target riêng để bạn dễ theo dõi tiến độ.
            </div>
          </aside>
        </section>
      ) : (
        <section className="bg-surface-container rounded-lg border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 text-on-surface font-bold">
            <History size={18} />
            Lịch sử {labels[serviceType]}
          </div>
          <YoutubeHistoryTable orders={orders} />
        </section>
      )}
    </main>
  );
}

function Metric({ label, value, danger, highlight }: { label: string; value: string; danger?: boolean; highlight?: boolean }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-3">
      <p className="text-on-surface-variant text-xs">{label}</p>
      <p className={`text-2xl font-bold ${danger ? 'text-red-300' : highlight ? 'text-primary-neon' : 'text-on-surface'}`}>{value}</p>
    </div>
  );
}

export function YoutubeHistoryTable({ orders }: { orders: any[] }) {
  if (!orders.length) return <div className="p-10 text-center text-on-surface-variant">Chưa có đơn nào.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          <tr className="border-b border-white/5">
            <th className="p-4 text-left">Dịch vụ</th>
            <th className="p-4 text-left">Target</th>
            <th className="p-4 text-left">Trạng thái</th>
            <th className="p-4 text-left">Tiến độ</th>
            <th className="p-4 text-left">Tổng xu</th>
            <th className="p-4 text-left">Thời gian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orders.map((order) => {
            const meta = statusMeta[order.status] || { label: order.status, cls: 'text-on-surface-variant bg-surface-container-lowest border-white/10' };
            const delivered = orderDelivered(order);
            return (
              <tr key={order.id} className="hover:bg-white/5 align-top">
                <td className="p-4 font-bold text-on-surface">{labels[order.serviceType as ServiceType] || order.serviceType}</td>
                <td className="p-4 min-w-[260px]">
                  <div className="space-y-2">
                    {order.targets?.map((target: any) => (
                      <div key={target.id} className="rounded-lg bg-surface-container-lowest p-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-on-surface truncate">{target.targetKey}</span>
                          <span className="text-xs text-on-surface-variant shrink-0">{targetProgress(target).toLocaleString('vi-VN')} / {Number(target.quantity).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-4"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${meta.cls}`}>{meta.label}</span></td>
                <td className="p-4 text-on-surface">{delivered.toLocaleString('vi-VN')} / {Number(order.totalQuantity).toLocaleString('vi-VN')}</td>
                <td className="p-4 text-on-surface">{Number(order.totalCost).toLocaleString('vi-VN')}</td>
                <td className="p-4 text-on-surface-variant">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
