'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Briefcase, DollarSign, Shield, UserCircle, MapPin, Star, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function WorkerDashboardPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobsRes, walletRes] = await Promise.all([
        fetch('/api/worker/jobs?status=assigned'),
        fetch('/api/wallet'),
      ]);
      const jobsData = await jobsRes.json();
      const walletData = await walletRes.json();
      if (jobsData.jobs) setJobs(jobsData.jobs);
      if (walletData.availableBalance !== undefined) setWallet(walletData);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const user = session?.user;
  const trustScore = (user as any)?.trustScore ?? 100;
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  const stats = [
    { label: 'Jobs đang làm', value: jobs.length.toString(), icon: Briefcase, color: 'text-primary-neon', status: 'Active' },
    { label: 'Thu nhập', value: formatCurrency(Number(wallet?.availableBalance || 0)), icon: DollarSign, color: 'text-green-400', status: 'Ví' },
    { label: 'Điểm uy tín', value: trustScore.toString(), icon: Shield, color: trustScore >= 80 ? 'text-green-400' : 'text-yellow-400', status: trustScore >= 80 ? 'Tốt' : 'Trung bình' },
    { label: 'Tài khoản', value: '--', icon: UserCircle, color: 'text-primary-neon', status: 'GG Maps' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const workerStatus = (user as any)?.workerStatus;

  return (
    <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto space-y-8">
      {/* Pending/Rejected status banner */}
      {workerStatus === 'pending' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Tài khoản đang chờ phê duyệt</p>
            <p className="text-sm text-yellow-400/80 mt-0.5">Admin đang xem xét hồ sơ của bạn. Bạn sẽ có thể nhận việc sau khi được duyệt. Thường trong vòng 24 giờ.</p>
          </div>
        </div>
      )}
      {workerStatus === 'rejected' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Tài khoản bị từ chối</p>
            <p className="text-sm text-red-400/80 mt-0.5">Hồ sơ của bạn không được chấp thuận. Vui lòng liên hệ admin để biết thêm thông tin.</p>
          </div>
        </div>
      )}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="md:hidden w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/10">
            <UserCircle className="text-primary-neon" />
          </div>
          <h1 className="font-headline font-bold tracking-tight text-lg md:text-2xl text-primary-neon">
            Xin chào, {user?.name || 'Worker'}!
          </h1>
        </div>
        <Link href="/worker/jobs" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,245,255,0.4)]">
          <Briefcase size={18} />
          Xem việc làm
        </Link>
      </header>

      {error && (
        <div className="glass-card p-4 rounded-lg text-red-400 text-center">
          {error}
          <button onClick={fetchData} className="ml-3 underline text-primary-neon">Thử lại</button>
        </div>
      )}

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-5 rounded-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,245,255,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <stat.icon className={stat.color} size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{stat.status}</span>
            </div>
            <h3 className="text-on-surface-variant text-sm font-medium mb-1">{stat.label}</h3>
            <p className={`text-2xl md:text-3xl font-headline font-extrabold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Recent Assigned Jobs */}
      <section className="pb-8">
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="font-headline font-bold text-xl flex items-center gap-2">
              Việc đang thực hiện
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {jobs.length === 0 ? (
              <div className="p-10 text-center text-on-surface-variant">Chưa có việc nào được giao.</div>
            ) : jobs.slice(0, 5).map((job: any) => (
              <Link href="/worker/jobs" key={job.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors group block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex shrink-0 items-center justify-center">
                    <MapPin className="text-on-surface-variant/50" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{job.campaign?.mapLocation?.name || 'Vị trí'}</h4>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Star size={12} className="text-yellow-400" />
                      <span>{job.targetRating || 5} sao</span>
                      <Clock size={12} className="ml-2" />
                      <span>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString('vi-VN') : 'Chưa lên lịch'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4">
                  <span className="text-primary-neon font-bold">{formatCurrency(Number(job.workerPayout || 0))}</span>
                  <ChevronRight className="text-on-surface-variant group-hover:text-primary-neon transition-colors" size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
