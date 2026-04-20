'use client';

import React from 'react';
import { CheckCircle, Zap, Crown, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PricingContent() {
  const plans = [
    {
      tier: 'Basic Tier',
      name: '🟢 Khởi Nghiệp',
      price: 'Thoát ế Map',
      features: [
        '20–30 review chất lượng',
        'Nội dung tự nhiên',
        '👉 chỉ "cầm máu"'
      ],
      cta: '⚡ Test nhẹ',
      highlight: false
    },
    {
      tier: 'Most Popular',
      name: '🔥 PHÁ ĐẢO',
      price: 'HIGHLIGHT',
      savings: '👉 Tiết kiệm 20–30% vs mua lẻ',
      features: [
        '50–80 review cao cấp',
        'Boost trust mạnh mẽ',
        'Tối ưu từ khóa Local SEO'
      ],
      cta: '🚀 Đẩy Top Nhanh',
      highlight: true
    },
    {
      tier: 'Enterprise Tier',
      name: '👑 Thống Trị',
      price: '100+ Review',
      features: [
        'Review bảo hành 6 tháng',
        'Chiến lược dài hạn',
        'Support ưu tiên 24/7'
      ],
      cta: '👑 Chiếm Top',
      highlight: false
    }
  ];

  return (
    <div className="pt-24 pb-32">
      <section className="px-6 py-12 md:py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-neon/10 border border-primary-neon/20 mb-6 glass-card">
          <Zap className="text-primary-neon" size={16} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary-neon">Map Optimization v2.0</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter leading-tight mb-6">
          💸 Chọn gói phù hợp – <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-neon to-secondary-neon">Đẩy Map lên level tiếp theo</span>
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
          Nâng tầm uy tín doanh nghiệp trên Google Maps với giải pháp Review tự nhiên, an toàn và hiệu quả nhất thị trường.
        </p>
      </section>

      <section className="px-6 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`group relative flex flex-col p-8 rounded-lg transition-all duration-300 ${
              plan.highlight 
                ? 'bg-surface-container-highest border-2 border-primary-neon scale-105 z-10 shadow-[0_0_40px_rgba(0,245,255,0.15)]' 
                : 'bg-surface-container-low border border-white/5 hover:border-primary-neon/30'
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 bg-primary-neon text-surface text-[10px] font-black px-4 py-1 uppercase tracking-widest rounded-bl-lg">
                Best Seller
              </div>
            )}
            <div className="mb-8">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest block mb-2">{plan.tier}</span>
              <h3 className="text-2xl font-bold font-headline text-on-surface">{plan.name}</h3>
            </div>
            <div className="flex-grow">
              <div className="text-4xl font-black text-primary-neon mb-2">{plan.price}</div>
              {plan.savings && <p className="text-xs text-yellow-400 font-bold mb-6 italic">{plan.savings}</p>}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-on-surface-variant">
                    <CheckCircle className="text-primary-neon" size={16} fill={plan.highlight ? "currentColor" : "none"} />
                    <span className={plan.highlight ? "font-bold text-on-surface" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 ${
              plan.highlight 
                ? 'bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:scale-[1.02]' 
                : 'text-on-surface border border-white/10 hover:bg-white/5'
            }`}>
              {plan.cta}
            </button>
          </div>
        ))}
      </section>

      {/* Comparison Table */}
      <section className="mt-24 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold font-headline text-center mb-12">So sánh chi tiết</h2>
        <div className="bg-surface-container-low rounded-lg overflow-x-auto border border-white/5">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="p-6 text-sm font-bold uppercase tracking-wider text-on-surface-variant">Tính năng</th>
                <th className="p-6 text-sm font-bold uppercase tracking-wider text-on-surface">Khởi nghiệp</th>
                <th className="p-6 text-sm font-bold uppercase tracking-wider text-primary-neon">Phá đảo</th>
                <th className="p-6 text-sm font-bold uppercase tracking-wider text-secondary-neon">Thống trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { label: 'Review count', v1: '20-30', v2: '50-80', v3: '100+', highlight: true },
                { label: 'Speed', v1: 'Tiêu chuẩn', v2: 'Tốc độ cao', v3: 'Dàn trải an toàn', italic: true },
                { label: 'Trust', v1: 'Cơ bản', v2: 'Mạnh mẽ', v3: 'Tuyệt đối', bold: true },
                { label: 'Ranking', v1: 'Cải thiện nhẹ', v2: 'Nhảy Top nhanh', v3: 'Duy trì Top 1', highlight: true }
              ].map((row, i) => (
                <tr key={i}>
                  <td className="p-6 font-semibold">{row.label}</td>
                  <td className="p-6 text-on-surface-variant">{row.v1}</td>
                  <td className={`p-6 ${row.highlight ? 'text-primary-neon' : 'text-on-surface'} ${row.bold ? 'font-bold' : ''} ${row.italic ? 'italic' : ''}`}>{row.v2}</td>
                  <td className="p-6 text-on-surface-variant">{row.v3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Note Section */}
      <section className="mt-24 px-6 max-w-4xl mx-auto">
        <div className="p-8 rounded-lg bg-surface-container-highest/40 border border-red-500/20 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <div>
            <h4 className="text-xl font-bold font-headline text-red-500 mb-2">Lưu ý quan trọng</h4>
            <p className="text-on-surface-variant leading-relaxed italic">
              ⚠️ Không có dịch vụ 100% an toàn. Không có chuyện lên top trong 1 đêm. Chúng tôi tối ưu dựa trên thuật toán mới nhất của Google để giảm thiểu rủi ro tối đa cho doanh nghiệp của bạn.
            </p>
          </div>
        </div>
      </section>

      {/* Bento Proof */}
      <section className="mt-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[200px]">
          <div className="col-span-2 row-span-2 rounded-lg bg-surface-container-low overflow-hidden relative group border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
            <img 
              src="https://picsum.photos/seed/pricing/800/600" 
              alt="Proof of success" 
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
            />
            <div className="absolute bottom-6 left-6 z-20">
              <div className="text-2xl font-bold text-on-surface mb-1">500+ Chiến dịch</div>
              <div className="text-primary-neon text-sm font-bold uppercase tracking-widest">Thành công rực rỡ</div>
            </div>
          </div>
          <div className="col-span-1 row-span-1 rounded-lg bg-primary-neon/10 border border-primary-neon/20 flex flex-col items-center justify-center text-center p-4 glass-card">
            <span className="text-4xl font-black text-primary-neon mb-1">98%</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Tỷ lệ hài lòng</span>
          </div>
          <div className="col-span-1 row-span-2 rounded-lg bg-surface-container-low relative overflow-hidden border border-white/5">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #6001d1 0%, transparent 100%)' }}></div>
            <div className="relative h-full flex flex-col justify-end p-6">
              <ShieldCheck className="text-secondary-neon mb-4" size={40} fill="currentColor" />
              <div className="text-sm font-bold text-on-surface">An toàn & Bảo mật</div>
            </div>
          </div>
          <div className="col-span-1 row-span-1 rounded-lg bg-surface-container-highest border border-white/5 p-6">
            <div className="text-xs text-on-surface-variant/50 mb-2 italic">Latest Feedback:</div>
            <div className="text-sm text-on-surface-variant">&quot;Map lên Top 1 chỉ sau 2 tuần chạy gói Phá Đảo. Quá đỉnh!&quot;</div>
          </div>
        </div>
      </section>
    </div>
  );
}
