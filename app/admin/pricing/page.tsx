'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Pencil, Trash2, Save, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const LEVEL_OPTIONS = ['basic', 'silver', 'vip'] as const;
const levelLabel: Record<string, string> = { basic: 'Basic', silver: 'Silver', vip: 'VIP' };
const levelColor: Record<string, string> = { basic: 'text-blue-400', silver: 'text-gray-300', vip: 'text-yellow-400' };

const emptyForm = {
  level: 'basic' as 'basic' | 'silver' | 'vip',
  name: '',
  pricePerReview: '',
  workerPayout: '',
  platformFee: '',
  minReviews: '1',
  maxReviews: '1000',
  warrantyDays: '30',
  maxRefills: '3',
  minAccountLevel: '1',
  maxAccountLevel: '10',
};

export default function AdminPricingPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      setTiers(data.tiers || []);
    } catch {
      toast.error('Lỗi tải gói dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTiers(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (tier: any) => {
    setEditId(tier.id);
    setForm({
      level: tier.level,
      name: tier.name,
      pricePerReview: String(tier.pricePerReview),
      workerPayout: String(tier.workerPayout),
      platformFee: String(tier.platformFee),
      minReviews: String(tier.minReviews),
      maxReviews: String(tier.maxReviews),
      warrantyDays: String(tier.warrantyDays),
      maxRefills: String(tier.maxRefills),
      minAccountLevel: String(tier.minAccountLevel ?? 1),
      maxAccountLevel: String(tier.maxAccountLevel ?? 10),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        level: form.level,
        name: form.name,
        pricePerReview: parseFloat(form.pricePerReview),
        workerPayout: parseFloat(form.workerPayout),
        platformFee: parseFloat(form.platformFee),
        minReviews: parseInt(form.minReviews),
        maxReviews: parseInt(form.maxReviews),
        warrantyDays: parseInt(form.warrantyDays),
        maxRefills: parseInt(form.maxRefills),
        minAccountLevel: parseInt(form.minAccountLevel),
        maxAccountLevel: parseInt(form.maxAccountLevel),
      };

      const url = editId ? `/api/admin/pricing/${editId}` : '/api/admin/pricing';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi');
      }
      toast.success(editId ? 'Cập nhật gói thành công' : 'Thêm gói thành công');
      setShowForm(false);
      setEditId(null);
      fetchTiers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (tier: any) => {
    try {
      const res = await fetch(`/api/admin/pricing/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tier.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(tier.isActive ? 'Đã ẩn gói' : 'Đã kích hoạt gói');
      fetchTiers();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa gói này? Thao tác không thể hoàn tác.')) return;
    try {
      const res = await fetch(`/api/admin/pricing/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa gói');
      fetchTiers();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const inputCls = "w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30 text-sm";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Gói dịch vụ</h1>
          <p className="text-on-surface-variant">Quản lý giá và cấu hình các gói review.</p>
        </div>
        <button onClick={openCreate} className="bg-primary-neon text-surface px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)]">
          <Plus size={18} />
          Thêm gói
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-lg p-6 mb-8 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-on-surface">{editId ? 'Chỉnh sửa gói' : 'Thêm gói mới'}</h3>
            <button type="button" onClick={() => setShowForm(false)}><X size={20} className="text-on-surface-variant" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Cấp độ</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as any })} className={inputCls} disabled={!!editId}>
                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{levelLabel[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Tên gói</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gói Cơ Bản" required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Giá / review (đ)</label>
              <input type="number" value={form.pricePerReview} onChange={(e) => setForm({ ...form, pricePerReview: e.target.value })} placeholder="50000" required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Hoa hồng worker (đ)</label>
              <input type="number" value={form.workerPayout} onChange={(e) => setForm({ ...form, workerPayout: e.target.value })} placeholder="35000" required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Platform fee (đ)</label>
              <input type="number" value={form.platformFee} onChange={(e) => setForm({ ...form, platformFee: e.target.value })} placeholder="15000" required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Bảo hành (ngày)</label>
              <input type="number" value={form.warrantyDays} onChange={(e) => setForm({ ...form, warrantyDays: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Min reviews</label>
              <input type="number" value={form.minReviews} onChange={(e) => setForm({ ...form, minReviews: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Max reviews</label>
              <input type="number" value={form.maxReviews} onChange={(e) => setForm({ ...form, maxReviews: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Max refills</label>
              <input type="number" value={form.maxRefills} onChange={(e) => setForm({ ...form, maxRefills: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Level GG tối thiểu</label>
              <input type="number" min={1} max={10} value={form.minAccountLevel} onChange={(e) => setForm({ ...form, minAccountLevel: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Level GG tối đa</label>
              <input type="number" min={1} max={10} value={form.maxAccountLevel} onChange={(e) => setForm({ ...form, maxAccountLevel: e.target.value })} required className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-all">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editId ? 'Cập nhật' : 'Thêm'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant border border-white/10 hover:bg-surface-container-high transition-all">Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
        </div>
      ) : tiers.length === 0 ? (
        <div className="glass-card p-10 rounded-lg text-center text-on-surface-variant">
          Chưa có gói nào. Hãy thêm gói đầu tiên để clients có thể tạo chiến dịch.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tiers.map((tier: any) => (
            <div key={tier.id} className={`glass-card rounded-lg p-6 border ${tier.isActive ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${levelColor[tier.level]}`}>{levelLabel[tier.level]}</span>
                  <h3 className="text-lg font-bold text-on-surface mt-0.5">{tier.name}</h3>
                </div>
                <button onClick={() => handleToggleActive(tier)} title={tier.isActive ? 'Ẩn gói' : 'Kích hoạt'}>
                  {tier.isActive ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-on-surface-variant" />}
                </button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Giá / review</span>
                  <span className="font-bold text-primary-neon">{Number(tier.pricePerReview).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Worker nhận</span>
                  <span className="font-bold text-green-400">{Number(tier.workerPayout).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Platform</span>
                  <span className="font-bold text-on-surface">{Number(tier.platformFee).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Reviews</span>
                  <span className="text-on-surface">{tier.minReviews} – {tier.maxReviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Bảo hành</span>
                  <span className="text-on-surface">{tier.warrantyDays} ngày</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Max refills</span>
                  <span className="text-on-surface">{tier.maxRefills}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Level GG</span>
                  <span className="text-on-surface font-bold">{tier.minAccountLevel ?? 1} – {tier.maxAccountLevel ?? 10}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button onClick={() => openEdit(tier)} className="flex-1 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 text-sm font-bold">
                  <Pencil size={14} />
                  Sửa
                </button>
                <button onClick={() => handleDelete(tier.id)} className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold">
                  <Trash2 size={14} />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
