'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Briefcase,
  DollarSign,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  ScanLine,
  Settings,
  Sliders,
  Tag,
  UserCircle,
  Users,
  X,
  Youtube,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      if (session?.user?.role === 'worker') router.push('/worker/dashboard');
      else router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin w-12 h-12 border-4 border-primary-neon border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== 'admin') return null;

  const user = session.user;
  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebarLinks = [
    { name: 'Dashboard', icon: LayoutGrid, href: '/admin' },
    { name: 'Người dùng', icon: Users, href: '/admin/users' },
    { name: 'Chiến dịch', icon: Megaphone, href: '/admin/campaigns' },
    { name: 'Công việc', icon: Briefcase, href: '/admin/jobs' },
    { name: 'Tài khoản GG', icon: UserCircle, href: '/admin/accounts' },
    { name: 'Quét review', icon: ScanLine, href: '/admin/scanner' },
    { name: 'YouTube', icon: Youtube, href: '/admin/youtube' },
    { name: 'Tài chính', icon: DollarSign, href: '/admin/finance' },
    { name: 'Gói dịch vụ', icon: Tag, href: '/admin/pricing' },
    { name: 'Phân bổ việc', icon: Sliders, href: '/admin/dispatch-config' },
    { name: 'Cài đặt', icon: Settings, href: '/admin/settings' },
  ];

  const renderLinks = (onNavigate?: () => void) => (
    <div className="space-y-1 overflow-y-auto pr-1">
      {sidebarLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all group border-l-4 ${
              isActive
                ? 'bg-primary-neon/10 text-primary-neon border-primary-neon'
                : 'text-on-surface-variant hover:bg-surface-container border-transparent'
            }`}
          >
            <Icon size={20} className={isActive ? '' : 'group-hover:text-primary-neon'} />
            <span className={`font-medium ${isActive ? '' : 'group-hover:text-primary-neon'}`}>{link.name}</span>
          </Link>
        );
      })}
    </div>
  );

  const logout = () => signOut({ redirect: false }).then(() => { window.location.href = '/login'; });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-surface flex-col gap-4 p-6 shadow-2xl z-[60] pt-24 border-r border-white/5">
        <div className="flex flex-col gap-2 mb-6">
          <div className="bg-primary-neon/10 p-4 rounded-2xl border-l-4 border-primary-neon">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-neon mb-1">Admin Panel</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon text-primary-neon font-bold text-sm">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">{user?.name || 'Admin'}</h4>
                <p className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {renderLinks()}

        <div className="mt-auto pt-4 border-t border-white/5">
          <button onClick={logout} className="flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full">
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[70] h-11 w-11 rounded-xl bg-surface-container border border-white/10 text-primary-neon flex items-center justify-center shadow-xl"
        aria-label="Mở menu admin"
      >
        <Menu size={22} />
      </button>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[80]">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Đóng menu admin" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] bg-surface border-r border-white/10 p-5 pt-8 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-neon">Menu admin</p>
                <p className="text-sm text-on-surface-variant truncate max-w-[240px]">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 rounded-xl bg-surface-container border border-white/10 text-on-surface flex items-center justify-center"
                aria-label="Đóng menu admin"
              >
                <X size={20} />
              </button>
            </div>

            {renderLinks(() => setMobileMenuOpen(false))}

            <button onClick={logout} className="mt-auto flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full">
              <LogOut size={20} />
              <span className="font-medium">Đăng xuất</span>
            </button>
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-72">{children}</div>
    </div>
  );
}
