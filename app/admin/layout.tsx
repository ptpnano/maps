'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutGrid, Users, Megaphone, Briefcase, DollarSign, Settings, LogOut, Tag, Sliders, UserCircle, ScanLine } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      if (session?.user?.role === 'worker') router.push('/worker/dashboard');
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

  if (session?.user?.role !== 'admin') return null;

  const user = session.user;
  const initials = (user?.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebarLinks = [
    { name: 'Dashboard', icon: LayoutGrid, href: '/admin' },
    { name: 'Người dùng', icon: Users, href: '/admin/users' },
    { name: 'Chiến dịch', icon: Megaphone, href: '/admin/campaigns' },
    { name: 'Công việc', icon: Briefcase, href: '/admin/jobs' },
    { name: 'Tài khoản GG', icon: UserCircle, href: '/admin/accounts' },
    { name: 'Quét review', icon: ScanLine, href: '/admin/scanner' },
    { name: 'Tài chính', icon: DollarSign, href: '/admin/finance' },
    { name: 'Gói dịch vụ', icon: Tag, href: '/admin/pricing' },
    { name: 'Phân bổ việc', icon: Sliders, href: '/admin/dispatch-config' },
    { name: 'Cài đặt', icon: Settings, href: '/admin/settings' },
  ];

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
        <div className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
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

      <div className="flex-1 md:ml-72">
        {children}
      </div>
    </div>
  );
}
