'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Save, Loader2, Building2, QrCode, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    holdingDays: 7,
    jobTimeoutMinutes: 30,
    bankName: '',
    bankAccount: '',
    bankAccountHolder: '',
    bankQrUrl: '',
  });

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        setConfig({
          holdingDays: data.holdingDays || 7,
          jobTimeoutMinutes: data.jobTimeoutMinutes || 30,
          bankName: data.bankName || '',
          bankAccount: data.bankAccount || '',
          bankAccountHolder: data.bankAccountHolder || '',
          bankQrUrl: data.bankQrUrl || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('Cập nhật cấu hình thành công!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Lỗi cập nhật');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">Cài đặt hệ thống</h1>
        <p className="text-on-surface-variant">Cấu hình chung cho toàn bộ hệ thống MapBoost.</p>
      </div>

      <div className="space-y-8">
        {/* System Config */}
        <div className="glass-card rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
              <Shield size={20} />
            </div>
            <h2 className="text-lg font-bold text-on-surface">Cấu hình hệ thống</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                <Clock size={12} className="inline mr-1" />
                Holding Days (ngày giữ tiền)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={config.holdingDays}
                onChange={(e) => setConfig({ ...config, holdingDays: parseInt(e.target.value) || 7 })}
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">Số ngày chờ trước khi trả tiền cho worker</p>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                <Clock size={12} className="inline mr-1" />
                Job Timeout (phút)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={config.jobTimeoutMinutes}
                onChange={(e) => setConfig({ ...config, jobTimeoutMinutes: parseInt(e.target.value) || 30 })}
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">Thời gian worker phải nộp bài sau khi nhận job</p>
            </div>
          </div>
        </div>

        {/* Bank Info */}
        <div className="glass-card rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg font-bold text-on-surface">Thông tin ngân hàng (QR nạp tiền)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Tên ngân hàng</label>
              <input
                type="text"
                value={config.bankName}
                onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                placeholder="Vietcombank, MB Bank, ..."
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Số tài khoản</label>
                <input
                  type="text"
                  value={config.bankAccount}
                  onChange={(e) => setConfig({ ...config, bankAccount: e.target.value })}
                  placeholder="0123456789"
                  className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">Chủ tài khoản</label>
                <input
                  type="text"
                  value={config.bankAccountHolder}
                  onChange={(e) => setConfig({ ...config, bankAccountHolder: e.target.value })}
                  placeholder="NGUYEN VAN A"
                  className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                <QrCode size={12} className="inline mr-1" />
                URL ảnh QR Code
              </label>
              <input
                type="text"
                value={config.bankQrUrl}
                onChange={(e) => setConfig({ ...config, bankQrUrl: e.target.value })}
                placeholder="https://img.vietqr.io/image/..."
                className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
              />
              {config.bankQrUrl && (
                <div className="mt-3 p-4 bg-white rounded-xl inline-block">
                  <img src={config.bankQrUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-neon text-surface font-bold py-4 rounded-xl hover:scale-[1.01] transition-transform shadow-[0_0_20px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
