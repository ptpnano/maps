'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, Zap, TrendingUp, MapPin, MessageSquare, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import Link from 'next/link';

export default function HomeContent() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-neon/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-neon/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-white/5 mb-8 shadow-2xl"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary-neon animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Top #1 Google Maps Optimization 2024</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-headline font-black tracking-tight text-on-surface mb-8 leading-[1.1]"
          >
            Bứt Phá Doanh Thu <br />
            <span className="text-primary-neon drop-shadow-[0_0_20px_rgba(0,245,255,0.4)] italic">Từ Google Maps</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-2xl text-on-surface-variant max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Giải pháp tăng review 5 sao, tối ưu SEO Local và bảo vệ thương hiệu toàn diện trên bản đồ. Giúp khách hàng tìm thấy bạn đầu tiên.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link 
              href="/audit" 
              className="w-full sm:w-auto px-10 py-5 bg-primary-neon text-surface font-headline font-black text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(0,245,255,0.3)] flex items-center justify-center gap-3"
            >
              Audit Map Miễn Phí
              <ArrowRight size={24} />
            </Link>
            <Link 
              href="/case-studies" 
              className="w-full sm:w-auto px-10 py-5 bg-surface-container-low text-on-surface font-headline font-bold text-xl rounded-2xl border border-white/10 hover:bg-surface-container-high transition-all flex items-center justify-center gap-3"
            >
              <Play size={20} fill="currentColor" />
              Xem Case Study
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-20 flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500"
          >
            {['Google', 'TripAdvisor', 'Foody', 'ShopeeFood', 'GrabFood'].map((brand) => (
              <span key={brand} className="text-2xl font-black tracking-tighter text-on-surface">{brand}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 px-6 bg-surface-container-lowest/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-headline font-black text-on-surface mb-6">Bạn Có Đang Gặp Vấn Đề Này?</h2>
            <div className="w-24 h-1.5 bg-primary-neon mx-auto rounded-full shadow-[0_0_10px_#00f5ff]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Star, title: 'Bị Đối Thủ Spam 1 Sao', desc: 'Những đánh giá tiêu cực vô căn cứ làm sụt giảm uy tín nghiêm trọng.', color: 'text-red-400' },
              { icon: TrendingUp, title: 'Map Bị Ẩn, Không Lên Top', desc: 'Khách hàng tìm kiếm từ khóa ngành nhưng không thấy bạn đâu.', color: 'text-yellow-400' },
              { icon: ShieldCheck, title: 'Thiếu Review Chất Lượng', desc: 'Khách hàng do dự khi thấy Map quá ít đánh giá hoặc đánh giá cũ.', color: 'text-primary-neon' }
            ].map((item, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl border border-white/5 hover:border-primary-neon/30 transition-all group">
                <div className={`w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6 ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-4">{item.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-headline font-black text-on-surface mb-8 leading-tight">
              Giải Pháp <span className="text-primary-neon">Tối Ưu Toàn Diện</span>
            </h2>
            <div className="space-y-6">
              {[
                { title: 'Tăng Review Thật 100%', desc: 'Hệ thống người dùng thật, nội dung đa dạng, có hình ảnh và từ khóa SEO.' },
                { title: 'SEO Map Lên Top 3', desc: 'Tối ưu hóa các chỉ số kỹ thuật để Map luôn xuất hiện ở vị trí ưu tiên.' },
                { title: 'Xử Lý Review Xấu', desc: 'Hỗ trợ báo cáo và đẩy lùi các đánh giá tiêu cực, bảo vệ thương hiệu.' },
                { title: 'Quản Lý Chiến Dịch Thông Minh', desc: 'Dashboard theo dõi tiến độ và hiệu quả theo thời gian thực.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="text-primary-neon" size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-on-surface mb-1">{item.title}</h4>
                    <p className="text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary-neon/20 blur-[100px] rounded-full"></div>
            <div className="relative glass-card p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <img 
                src="https://picsum.photos/seed/dashboard/800/600" 
                alt="MapBoost Dashboard Preview" 
                className="rounded-[2rem] w-full shadow-2xl"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 -left-6 bg-surface-container-high p-6 rounded-2xl border border-primary-neon/30 shadow-2xl animate-bounce-slow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center text-green-400">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase">Tăng trưởng</p>
                    <p className="text-xl font-black text-on-surface">+245%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto glass-card p-12 md:p-20 rounded-[3rem] border border-primary-neon/30 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-neon/10 to-transparent z-[-1]"></div>
          <h2 className="text-4xl md:text-6xl font-headline font-black text-on-surface mb-8">Sẵn Sàng Để <span className="text-primary-neon">Phá Đảo</span> Google Maps?</h2>
          <p className="text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto">
            Đừng để đối thủ cướp mất khách hàng tiềm năng của bạn. Bắt đầu tối ưu ngay hôm nay với MapBoost Neon.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-12 py-6 bg-primary-neon text-surface font-headline font-black text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(0,245,255,0.4)]"
            >
              Đăng Ký Ngay
            </Link>
            <Link 
              href="/audit" 
              className="w-full sm:w-auto px-12 py-6 border border-white/10 text-on-surface font-headline font-bold text-2xl rounded-2xl hover:bg-white/5 transition-all"
            >
              Audit Miễn Phí
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
