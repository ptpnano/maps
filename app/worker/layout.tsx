'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutGrid, Briefcase, UserCircle, Wallet, Settings, Shield, LogOut } from 'lucide-react';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user?.role !== 'worker') {
      if (session?.user?.role === 'admin') router.push('/admin');
      else router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin w-12 h-12 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'worker') return null;

  const user = session.user;
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const trustScore = (user as any)?.trustScore ?? 100;

  const sidebarLinks = [
    { name: 'Trang chủ', icon: LayoutGrid, href: '/worker/dashboard' },
    { name: 'Việc làm', icon: Briefcase, href: '/worker/jobs' },
    { name: 'Tài khoản GG', icon: UserCircle, href: '/worker/accounts' },
    { name: 'Ví', icon: Wallet, href: '/worker/wallet' },
    { name: 'Cài đặt', icon: Settings, href: '/worker/settings' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-surface flex-col gap-4 p-6 shadow-2xl z-[60] pt-24 border-r border-white/5">
        <div className="flex flex-col gap-2 mb-6">
          <div className="bg-primary-neon/10 p-4 rounded-2xl border-l-4 border-primary-neon">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-neon mb-1">Cộng tác viên</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon text-primary-neon font-bold text-sm">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">{user?.name || 'Người dùng'}</h4>
                <p className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>
          </div>
          {/* Trust Score Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-white/5">
            <Shield size={16} className={trustScore >= 80 ? 'text-green-400' : trustScore >= 50 ? 'text-yellow-400' : 'text-red-400'} />
            <span className="text-xs font-bold text-on-surface-variant">Điểm uy tín:</span>
            <span className={`text-sm font-black ${trustScore >= 80 ? 'text-green-400' : trustScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {trustScore}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/worker/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
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
        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={() => signOut({ redirect: false }).then(() => { window.location.href = '/login'; })}
            className="flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-72">
        {children}
      </div>
    </div>
  );
}
