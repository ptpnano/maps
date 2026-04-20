'use client';

import React from 'react';
import { Utensils, Sparkles, Search } from 'lucide-react';

const cases = [
  {
    id: '01',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7vymu-5t5AqrA6UWvpR8maJUsILhxQatDlZAZWbUsyjlyP71WX_hp7YFUIXSihQto9vkSj-a4jF6KCA8FZu-jZsdY9hi9v68SPhUTb6TXwEzMcztulerbsJk83c27xq6Pa1ph5iogeGUwvPo0R7ThC4EJJuD1BcAlUE1UHs-hAdWuOhM4VIL4jXHNZ2RA4azSPvFSaj-qZcTY4Wep0WFg_trK0JS7wvGTn19nbY_ZQSuPSi83pg3J_7ZXH2Usi7uR2SLMQQVhrY4',
  },
  {
    id: '03',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL6GlfMJceahr8cEDrM9m5eaB-eXC8I1SW_ymBRftG2CotiPrz7AWG2uI135NCYSfBQpYn-iDNbVFeIIUeM30WSNqpzesDtYn3S-PqGgCYoWHf0F86LaaeQ-uxKjMp70mxbrdxpQMiZFZRqF6cEJSavtvymxxiYbFvzZ8qo9prZik5FAU8Wftf7LYVbUpTuSBn0vNNdLyyHThuWEL6HRvig_zGHK7RHrozVWsqEYAmy5B2RMPpp2QiitMyZPYeAPpkrVt2CaRB-B4',
  },
];

export default function CaseStudiesContent() {
  return (
    <div className="pt-32 pb-24">
      <section className="max-w-7xl mx-auto px-8 mb-20 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-white/10 bg-surface-container-low text-primary-neon text-xs font-medium tracking-widest uppercase mb-6">
          Success Stories
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-on-surface">
          📊 Case Study Thực Tế – <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-neon to-secondary-neon">Không Nói Mồm</span>
        </h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
          Real world results from our clients. Chúng tôi không chỉ làm SEO, chúng tôi xây dựng vị thế dẫn đầu trên Google Maps.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Case 1 */}
          <div className="md:col-span-8 group bg-surface-container-low rounded-lg p-8 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-neon/10 blur-[100px] rounded-full"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <span className="text-primary-neon font-mono text-sm tracking-widest">CASE STUDY #01</span>
                  <h3 className="text-3xl font-bold mt-2 text-on-surface">Nhà Hàng Ẩm Thực Phố</h3>
                </div>
                <Utensils className="text-primary-neon" size={40} />
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Vấn đề</p>
                  <p className="text-2xl font-bold text-red-400">2.5⭐ – bị dìm</p>
                  <p className="text-sm text-on-surface-variant">Đối thủ spam review xấu, đánh mất 60% lượng khách vãng lai.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Giải pháp</p>
                  <p className="text-2xl font-bold text-primary-neon">50 review thật</p>
                  <p className="text-sm text-on-surface-variant">Quy trình xác thực người dùng thật, nội dung review chất lượng cao kèm ảnh.</p>
                </div>
                <div className="space-y-2 p-4 bg-surface-container-highest rounded-lg border border-primary-neon/20">
                  <p className="text-xs uppercase tracking-widest text-primary-neon">Kết quả</p>
                  <p className="text-3xl font-black text-primary-neon neon-text-glow">4.8⭐ – Top 1</p>
                  <p className="text-sm font-medium text-on-surface">Chiếm lĩnh khu vực Quận 1</p>
                </div>
              </div>
            </div>
            <div className="mt-8 h-48 w-full rounded-lg overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
              <img 
                src={cases[0].image} 
                alt="Nhà Hàng Ẩm Thực Phố - Google Maps Case Study" 
                referrerPolicy="no-referrer" 
                className="w-full h-full object-cover" 
                loading="lazy"
              />
            </div>
          </div>

          {/* Case 2 */}
          <div className="md:col-span-4 group bg-surface-container-low rounded-lg p-8 transition-all duration-300 hover:scale-[1.02] border border-white/5">
            <span className="text-secondary-neon font-mono text-sm tracking-widest">CASE STUDY #02</span>
            <h3 className="text-2xl font-bold mt-2 mb-8 text-on-surface">Spa & Wellness Center</h3>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <Search className="text-on-surface-variant" />
                <div>
                  <p className="text-sm text-on-surface-variant">Trước đây</p>
                  <p className="text-xl font-bold">0 review – vô hình</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Sparkles className="text-secondary-neon" />
                <div>
                  <p className="text-sm text-on-surface-variant">Chiến dịch</p>
                  <p className="text-xl font-bold">Build 30 review + ảnh</p>
                </div>
              </div>
              <div className="p-6 bg-secondary-neon/20 rounded-lg border border-secondary-neon/30">
                <p className="text-sm text-secondary-neon uppercase font-bold mb-1">Impact</p>
                <p className="text-4xl font-black text-secondary-neon neon-text-glow">Tăng 40%</p>
                <p className="text-sm text-on-surface">Lượng khách đặt lịch mới</p>
              </div>
            </div>
          </div>

          {/* Case 3 */}
          <div className="md:col-span-12 group bg-surface-container-low rounded-lg p-8 transition-all duration-300 hover:scale-[1.01] flex flex-col md:flex-row gap-8 items-center border border-white/5">
            <div className="w-full md:w-1/3 rounded-lg overflow-hidden h-64">
              <img 
                src={cases[1].image} 
                alt="Chuỗi Cửa Hàng Local Brand - SEO Google Maps" 
                referrerPolicy="no-referrer" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                loading="lazy"
              />
            </div>
            <div className="w-full md:w-2/3">
              <span className="text-yellow-400 font-mono text-sm tracking-widest uppercase">Case Study #03 • SEO Optimization</span>
              <h3 className="text-3xl font-bold mt-2 mb-6 text-on-surface">Chuỗi Cửa Hàng Local Brand</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-l-2 border-white/10 pl-4">
                  <p className="text-sm text-on-surface-variant mb-1">Hiện trạng</p>
                  <p className="text-lg font-semibold text-on-surface">Có review nhưng không SEO</p>
                </div>
                <div className="border-l-2 border-primary-neon pl-4">
                  <p className="text-sm text-on-surface-variant mb-1">Thực hiện</p>
                  <p className="text-lg font-semibold text-primary-neon">Tối ưu keyword</p>
                </div>
                <div className="border-l-2 border-secondary-neon pl-4">
                  <p className="text-sm text-on-surface-variant mb-1">Thành tựu</p>
                  <p className="text-lg font-semibold text-secondary-neon neon-text-glow">Top 3 Google Maps</p>
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-highest"></div>
                  ))}
                </div>
                <p className="text-sm text-on-surface-variant flex items-center">Join 200+ local brands đã tin dùng</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
