'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Verified, User, Shield, Wallet, LogOut, ChevronRight, Save, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || '');
          setPhone(data.user.phone || '');
        }
      });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const user = session?.user;
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã cập nhật thông tin');
        setEditMode(null);
      } else {
        toast.error(data.error || 'Lỗi cập nhật');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Vui lòng nhập đầy đủ');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã đổi mật khẩu');
        setEditMode(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(data.error || 'Lỗi đổi mật khẩu');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl w-full h-16 flex items-center justify-between px-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-neon/20 flex items-center justify-center text-primary-neon text-xs font-bold border border-primary-neon/30">
            {initials}
          </div>
          <h1 className="font-headline font-bold tracking-tight text-xl text-on-surface">Cài đặt</h1>
        </div>
      </header>

      <main className="pt-8 px-6 space-y-6 max-w-2xl mx-auto">
        <section className="glass-card rounded-lg p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary-neon to-secondary-neon">
              <div className="w-full h-full rounded-full border-4 border-surface-container-low bg-surface-container-highest flex items-center justify-center text-3xl font-black text-primary-neon">
                {initials}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary-neon text-surface rounded-full p-1.5 shadow-lg border-2 border-surface-container-low">
              <Verified size={16} fill="currentColor" />
            </div>
          </div>
          <h2 className="font-headline font-bold text-2xl text-on-surface">{user?.name || 'Người dùng'}</h2>
          <p className="text-on-surface-variant text-sm mb-2">{user?.email || ''}</p>
          <span className="text-xs px-3 py-1 rounded-full bg-primary-neon/10 text-primary-neon font-bold uppercase tracking-wider border border-primary-neon/20 mb-6">
            {user?.role === 'client' ? 'Khách hàng' : user?.role === 'worker' ? 'Cộng tác viên' : 'Quản trị viên'}
          </span>
        </section>

        <section className="glass-card rounded-lg overflow-hidden">
          <div className="divide-y divide-white/5">
            {/* Personal Info */}
            <div className="p-5">
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => setEditMode(editMode === 'profile' ? null : 'profile')}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-neon">
                  <User size={24} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-on-surface font-bold">Thông tin cá nhân</h3>
                  <p className="text-xs text-on-surface-variant">Họ tên, Số điện thoại</p>
                </div>
                <ChevronRight className={`text-on-surface-variant transition-transform ${editMode === 'profile' ? 'rotate-90' : ''}`} size={20} />
              </div>
              {editMode === 'profile' && (
                <div className="mt-4 space-y-4 pl-16">
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Họ tên</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-neon"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Số điện thoại</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-neon"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 bg-primary-neon text-surface px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      <Save size={16} /> Lưu
                    </button>
                    <button onClick={() => setEditMode(null)} className="flex items-center gap-2 text-on-surface-variant px-4 py-2 rounded-lg text-sm hover:text-on-surface">
                      <X size={16} /> Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="p-5">
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => setEditMode(editMode === 'security' ? null : 'security')}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-neon">
                  <Shield size={24} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-on-surface font-bold">Bảo mật</h3>
                  <p className="text-xs text-on-surface-variant">Đổi mật khẩu</p>
                </div>
                <ChevronRight className={`text-on-surface-variant transition-transform ${editMode === 'security' ? 'rotate-90' : ''}`} size={20} />
              </div>
              {editMode === 'security' && (
                <div className="mt-4 space-y-4 pl-16">
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-neon"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-neon"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-neon"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="flex items-center gap-2 bg-primary-neon text-surface px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      <Save size={16} /> Đổi mật khẩu
                    </button>
                    <button onClick={() => { setEditMode(null); setCurrentPassword(''); setNewPassword(''); }} className="flex items-center gap-2 text-on-surface-variant px-4 py-2 rounded-lg text-sm hover:text-on-surface">
                      <X size={16} /> Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Link */}
            <Link href="/dashboard/wallet" className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group block">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-neon">
                <Wallet size={24} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-on-surface font-bold">Ví MapLocals</h3>
                <p className="text-xs text-on-surface-variant">Số dư, lịch sử giao dịch</p>
              </div>
              <ChevronRight className="text-on-surface-variant group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
          </div>
        </section>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full py-4 px-6 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500 font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 group"
        >
          <LogOut className="group-hover:rotate-180 transition-transform duration-500" size={20} />
          Đăng xuất
        </button>
      </main>
    </div>
  );
}
