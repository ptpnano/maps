'use client';

import React, { useEffect, useState } from 'react';
import { Sliders, Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const ALGORITHMS = [
  { value: 'trust_score', label: 'Trust Score cao nhất', desc: 'Ưu tiên worker có điểm uy tín cao nhất' },
  { value: 'least_jobs', label: 'Ít việc nhất', desc: 'Ưu tiên worker đang có ít việc nhất (phân phối đều)' },
  { value: 'highest_level', label: 'Level cao nhất', desc: 'Ưu tiên worker có tài khoản GG level cao nhất' },
  { value: 'fifo', label: 'Lâu chưa nhận việc', desc: 'Ưu tiên worker chưa được giao việc lâu nhất (FIFO)' },
] as const;

export default function DispatchConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [tierEdits, setTierEdits] = useState<Record<string, { min: string; max: string }>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/config').then(r => r.json()),
      fetch('/api/admin/pricing').then(r => r.json()),
    ]).then(([configData, pricingData]) => {
      setConfig(configData.config || configData);
      const tierList = pricingData.tiers || [];
      setTiers(tierList);
      const edits: Record<string, { min: string; max: string }> = {};
      tierList.forEach((t: any) => {
        edits[t.id] = { min: String(t.minAccountLevel ?? 1), max: String(t.maxAccountLevel ?? 10) };
      });
      setTierEdits(edits);
    }).catch(() => toast.error('Lỗi tải cấu hình'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatchMode: config.dispatchMode,
          autoAssignAlgorithm: config.autoAssignAlgorithm,
          autoAssignIntervalMinutes: Number(config.autoAssignIntervalMinutes),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Đã lưu cấu hình phân bổ việc');
    } catch {
      toast.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTier = async (tierId: string) => {
    setSavingTier(tierId);
    try {
      const edit = tierEdits[tierId];
      const res = await fetch(`/api/admin/pricing/${tierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minAccountLevel: parseInt(edit.min),
          maxAccountLevel: parseInt(edit.max),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Đã cập nhật yêu cầu level');
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setSavingTier(null);
    }
  };

  const handleRunNow = async () => {
    try {
      const res = await fetch('/api/cron/auto-assign', { headers: { 'x-cron-secret': '' } });
      const data = await res.json();
      if (data.skipped) toast.error('Auto-assign đang tắt hoặc không có việc');
      else toast.success(`Đã phân bổ ${data.assigned} / ${data.total} việc`);
    } catch {
      toast.error('Lỗi chạy auto-assign');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <main className="pt-24 px-6 pb-32 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight font-headline flex items-center gap-3">
          <Sliders className="text-primary-neon" size={32} />
          Phân bổ công việc
        </h1>
        <p className="text-on-surface-variant mt-1">Cấu hình chế độ phân bổ việc cho worker</p>
      </header>

      {/* Dispatch Mode */}
      <section className="glass-card rounded-lg p-6 space-y-4">
        <h2 className="font-bold text-lg text-on-surface">Chế độ phân bổ</h2>
        <div className="flex gap-4">
          {['manual', 'auto'].map(mode => (
            <button
              key={mode}
              onClick={() => setConfig({ ...config, dispatchMode: mode })}
              className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                config?.dispatchMode === mode
                  ? 'border-primary-neon bg-primary-neon/10 text-primary-neon'
                  : 'border-white/10 bg-surface-container text-on-surface-variant hover:border-white/20'
              }`}
            >
              {mode === 'manual' ? '👤 Thủ công' : '🤖 Tự động'}
              <p className={`text-xs mt-1 font-normal ${config?.dispatchMode === mode ? 'text-primary-neon/70' : 'text-on-surface-variant'}`}>
                {mode === 'manual' ? 'Worker tự lấy việc' : 'Hệ thống phân bổ tự động'}
              </p>
            </button>
          ))}
        </div>

        {/* Algorithm (when auto) */}
        {config?.dispatchMode === 'auto' && (
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-on-surface text-sm">Thuật toán phân bổ</h3>
            {ALGORITHMS.map(algo => (
              <label key={algo.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="algorithm"
                  value={algo.value}
                  checked={config.autoAssignAlgorithm === algo.value}
                  onChange={() => setConfig({ ...config, autoAssignAlgorithm: algo.value })}
                  className="mt-1 accent-primary-neon"
                />
                <div>
                  <p className="font-bold text-on-surface text-sm">{algo.label}</p>
                  <p className="text-xs text-on-surface-variant">{algo.desc}</p>
                </div>
              </label>
            ))}

            <div className="pt-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Khoảng thời gian chạy (phút)</label>
              <input
                type="number"
                min={1}
                max={1440}
                value={config.autoAssignIntervalMinutes || 5}
                onChange={e => setConfig({ ...config, autoAssignIntervalMinutes: parseInt(e.target.value) })}
                className="w-32 bg-surface-container border border-white/10 rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary-neon/50 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSaveConfig} disabled={saving} className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Lưu cấu hình
          </button>
          {config?.dispatchMode === 'auto' && (
            <button onClick={handleRunNow} className="px-6 py-2.5 rounded-xl font-bold text-sm border border-white/10 text-on-surface-variant flex items-center gap-2 hover:bg-surface-container-high transition-all">
              <RefreshCw size={16} />
              Chạy ngay
            </button>
          )}
        </div>
      </section>

      {/* Tier Level Mapping */}
      <section className="glass-card rounded-lg p-6 space-y-4">
        <div>
          <h2 className="font-bold text-lg text-on-surface">Yêu cầu Level GG theo gói</h2>
          <p className="text-xs text-on-surface-variant mt-1">Chỉ worker có tài khoản GG trong khoảng level này mới thấy và nhận việc của gói tương ứng</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-3 text-on-surface-variant text-xs uppercase tracking-widest">Gói</th>
                <th className="text-left p-3 text-on-surface-variant text-xs uppercase tracking-widest">Cấp độ</th>
                <th className="text-left p-3 text-on-surface-variant text-xs uppercase tracking-widest">Level GG tối thiểu</th>
                <th className="text-left p-3 text-on-surface-variant text-xs uppercase tracking-widest">Level GG tối đa</th>
                <th className="text-left p-3 text-on-surface-variant text-xs uppercase tracking-widest">Lưu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tiers.map((tier: any) => (
                <tr key={tier.id} className="hover:bg-white/5">
                  <td className="p-3 font-bold text-on-surface">{tier.name}</td>
                  <td className="p-3 text-on-surface-variant text-xs">{tier.level}</td>
                  <td className="p-3">
                    <input
                      type="number" min={1} max={10}
                      value={tierEdits[tier.id]?.min ?? 1}
                      onChange={e => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], min: e.target.value } }))}
                      className="w-20 bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary-neon/50 text-sm"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number" min={1} max={10}
                      value={tierEdits[tier.id]?.max ?? 10}
                      onChange={e => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], max: e.target.value } }))}
                      className="w-20 bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary-neon/50 text-sm"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleSaveTier(tier.id)}
                      disabled={savingTier === tier.id}
                      className="px-3 py-1.5 bg-primary-neon/10 text-primary-neon rounded-lg text-xs font-bold hover:bg-primary-neon/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingTier === tier.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Lưu
                    </button>
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
