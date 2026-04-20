'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, Shield, Lock, LogOut, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkerSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({ name: '', phone: '', workerBio: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const user = session?.user;
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data?.user) {
          setProfileData({
            name: data.user.name || user?.name || '',
            phone: data.user.phone || '',
            workerBio: data.user.workerBio || '',
          });
        }
      } catch {
        setError('Không thể tải thông tin cài đặt.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Cập nhật thông tin thành công!');
      } else {
        toast.error(data.error || 'Không thể cập nhật.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Vui lòng điền đầy đủ mật khẩu.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đổi mật khẩu thành công!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Không thể đổi mật khẩu.');
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSavingPassword(false);
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
        {/* Profile Card */}
        <section className="glass-card rounded-lg p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary-neon to-secondary-neon">
              <div className="w-full h-full rounded-full border-4 border-surface-container-low bg-surface-container-highest flex items-center justify-center text-3xl font-black text-primary-neon">
                {initials}
              </div>
            </div>
          </div>
          <h2 className="font-headline font-bold text-2xl text-on-surface">{user?.name || 'Người dùng'}</h2>
          <p className="text-on-surface-variant text-sm mb-2">{user?.email || ''}</p>
          <span className="text-xs px-3 py-1 rounded-full bg-primary-neon/10 text-primary-neon font-bold uppercase tracking-wider border border-primary-neon/20 mb-6">
            Cộng tác viên
          </span>
        </section>

        {error && (
          <div className="glass-card p-4 rounded-lg text-red-400 text-center">{error}</div>
        )}

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile} className="glass-card rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <User size={20} className="text-primary-neon" />
            <h3 className="font-bold text-on-surface text-lg">Thông tin cá nhân</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Họ tên</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Số điện thoại</label>
            <input
              type="text"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="0901234567"
              className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Giới thiệu bản thân</label>
            <textarea
              value={profileData.workerBio}
              onChange={(e) => setProfileData({ ...profileData, workerBio: e.target.value })}
              placeholder="Mô tả kinh nghiệm làm việc của bạn..."
              rows={3}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Lưu thay đổi
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="glass-card rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={20} className="text-primary-neon" />
            <h3 className="font-bold text-on-surface text-lg">Đổi mật khẩu</h3>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Mật khẩu mới</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary-neon/50 focus:ring-1 focus:ring-primary-neon/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className={`w-full bg-surface-container border rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-1 ${
                passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword
                  ? 'border-red-500/50 focus:ring-red-500/30'
                  : 'border-white/10 focus:border-primary-neon/50 focus:ring-primary-neon/30'
              }`}
            />
            {passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword && (
              <p className="text-red-400 text-xs mt-1">Mật khẩu không khớp</p>
            )}
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="bg-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-[0_0_10px_rgba(0,245,255,0.3)] disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Đổi mật khẩu
          </button>
        </form>

        {/* Logout */}
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
