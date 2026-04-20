# MapBoost Neon — Kế hoạch Test & Bug Report

> **Ngày**: 18/04/2026  
> **Tổng bugs tìm thấy**: 20  
> **Critical (cần fix ngay)**: 9  
> **Medium**: 7  
> **Minor**: 4

---

## PHẦN 1 — KẾ HOẠCH TEST TỪNG TÍNH NĂNG

### T01 · Auth — Đăng ký & Đăng nhập
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T01-1 | Đăng ký client mới | ✅ PASS | |
| T01-2 | Đăng ký worker mới | ✅ PASS | |
| T01-3 | Đăng ký email trùng lặp | ✅ PASS | Trả cùng message (chống enumeration) |
| T01-4 | Đăng nhập đúng → redirect | ❌ FAIL | **BUG #1** — luôn redirect `/dashboard`, worker/admin bị middleware chặn lại |
| T01-5 | Đăng nhập sai password | ✅ PASS | |
| T01-6 | Rate limit đăng ký (5 req/5min) | ⚠️ PARTIAL | Chỉ hoạt động 1 instance |

### T02 · Client — Tạo chiến dịch
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T02-1 | Validate URL Google Maps | ✅ PASS | |
| T02-2 | Tạo campaign với ví đủ tiền | ✅ PASS | |
| T02-3 | Tạo campaign với ví thiếu tiền | ✅ PASS | Báo lỗi đúng |
| T02-4 | Phân bổ sao không đúng tổng | ✅ PASS | Zod validate |
| T02-5 | ReviewItem được tạo đúng số lượng | ✅ PASS | |
| T02-6 | Freeze balance chính xác | ✅ PASS | Atomic transaction |

### T03 · Client — Quản lý chiến dịch
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T03-1 | Xem danh sách chiến dịch | ✅ PASS | |
| T03-2 | Xem chi tiết chiến dịch | ✅ PASS | |
| T03-3 | Pause chiến dịch active | ✅ PASS | |
| T03-4 | Resume chiến dịch paused | ✅ PASS | |
| T03-5 | Cancel chiến dịch → hoàn tiền | ⚠️ PARTIAL | **BUG #5** — không hoàn tiền item pending_verify/holding |
| T03-6 | Số tiền "Đã giải ngân" | ❌ FAIL | **BUG #4** — filter sai status `completed` thay vì `live` |
| T03-7 | Confirm dialog khi pause/resume | ✅ FIXED | Đã fix trước đó |

### T04 · Client — Ví tiền
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T04-1 | Xem số dư ví | ✅ PASS | |
| T04-2 | Xem lịch sử giao dịch | ✅ PASS | |
| T04-3 | Hiển thị QR nạp tiền | ✅ PASS | |
| T04-4 | Phân trang lịch sử | ❌ FAIL | **BUG #16** — hardcode 50, không có pagination |

### T05 · Worker — Dashboard & Accounts
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T05-1 | Dashboard worker pending | ✅ PASS | Banner hiện đúng |
| T05-2 | Dashboard worker rejected | ✅ PASS | |
| T05-3 | Dashboard worker approved | ❌ FAIL | **BUG #3** — tên địa điểm không hiển thị (sai data path) |
| T05-4 | Thêm tài khoản Google Maps | ⚠️ PARTIAL | **BUG #18** — profileUrl bị drop |
| T05-5 | Edit tài khoản (status, level) | ✅ PASS | |
| T05-6 | Auto detect Local Guide level | ⚠️ RISK | **BUG #9** — SSRF risk |

### T06 · Worker — Jobs
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T06-1 | Xem danh sách job khả dụng | ❌ FAIL | **BUG #3** — tên địa điểm không hiển thị |
| T06-2 | Claim job với account hợp lệ | ✅ PASS | Anti-collision hoạt động |
| T06-3 | Claim job đã có người nhận | ✅ PASS | Báo ALREADY_CLAIMED |
| T06-4 | Submit bằng chứng | ✅ PASS | |
| T06-5 | Chống duplicate account/location | ✅ PASS | AccountMapUsage constraint |

### T07 · Worker — Ví & Rút tiền
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T07-1 | Xem số dư | ✅ PASS | |
| T07-2 | Rút tiền đủ số dư | ✅ PASS | |
| T07-3 | Rút tiền vượt số dư | ✅ PASS | Báo lỗi đúng |
| T07-4 | Rút tiền không có minimum | ❌ FAIL | **BUG #11** — có thể rút 1đ |

### T08 · Admin — Quản lý Users
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T08-1 | Xem danh sách users | ✅ PASS | |
| T08-2 | Filter theo role/status | ✅ PASS | |
| T08-3 | Approve worker + notification | ✅ PASS | Route PATCH users/[id] |
| T08-4 | Reject worker + notification | ✅ PASS | |
| T08-5 | Lock/unlock tài khoản | ✅ PASS | |
| T08-6 | Worker thấy ngay sau khi approve | ❌ FAIL | **BUG #7** — JWT stale, cần re-login |

### T09 · Admin — Duyệt Jobs
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T09-1 | Tab "Chờ xác minh" | ✅ PASS | |
| T09-2 | Tab "Đã hoàn thành" | ❌ FAIL | **BUG #2** — dùng status `completed` (không tồn tại) |
| T09-3 | Tab "Từ chối" | ❌ FAIL | **BUG #2** — dùng status `rejected` (không tồn tại) |
| T09-4 | Approve job → holding | ✅ PASS | |
| T09-5 | Reject job → dropped + refill | ✅ PASS | |
| T09-6 | Trust score thay đổi | ✅ PASS | |

### T10 · Admin — Finance
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T10-1 | Nạp tiền bằng email | ✅ PASS | |
| T10-2 | Nạp tiền bằng userId | ✅ PASS | |
| T10-3 | Nạp tiền cho worker | ❌ FAIL | **BUG #14** — chỉ hỗ trợ client |
| T10-4 | Xem lịch sử giao dịch | ✅ PASS | |

### T11 · Admin — Pricing & Config
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T11-1 | CRUD pricing tiers | ✅ PASS | |
| T11-2 | Xóa tier đang dùng bởi campaign | ❌ FAIL | **BUG #15** — 500 không có user-friendly message |
| T11-3 | Cập nhật holdingDays | ✅ PASS | |
| T11-4 | Cập nhật thông tin ngân hàng | ✅ PASS | |

### T12 · Cron Jobs
| # | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| T12-1 | Settlement: holding → live | ✅ PASS | |
| T12-2 | Settlement: tính tiền đúng | ⚠️ PARTIAL | **BUG #12** — log sai sign |
| T12-3 | Timeout: reset assigned → pending | ✅ PASS | |
| T12-4 | Verify: auto approve có URL | ⚠️ RISK | **BUG #19** — approve URL fake |
| T12-5 | Refill: tạo review bù | ⚠️ PARTIAL | **BUG #13** — double-refill risk |

---

## PHẦN 2 — BUG REPORT & FIX PLAN

### 🔴 CRITICAL — Fix ngay

---

#### BUG #1 · Login redirect sai role
**File**: `app/login/LoginContent.tsx`  
**Triệu chứng**: Sau khi đăng nhập, mọi user đều được redirect đến `/dashboard`. Worker và Admin bị middleware chặn, tự redirect về `/login` → UX tệ.  
**Fix**: Đọc role từ session sau signIn, redirect đúng theo role.  
**Status**: 🔧 Cần fix

---

#### BUG #2 · Admin jobs tab dùng sai ReviewStatus values
**File**: `app/admin/jobs/page.tsx`  
**Triệu chứng**: Tab "Hoàn thành" filter `status=completed`, tab "Từ chối" filter `status=rejected` — cả hai đều không có trong `ReviewStatus` enum → luôn trả về 0 kết quả.  
**Đúng**: `live` (hoàn thành), `dropped` (từ chối)  
**Status**: 🔧 Cần fix

---

#### BUG #3 · Worker job list không hiển thị tên địa điểm
**File**: `app/worker/jobs/page.tsx`, `app/worker/dashboard/page.tsx`  
**Triệu chứng**: Tên địa điểm Google Maps không hiển thị ở danh sách job khả dụng và dashboard.  
**Nguyên nhân**: Code dùng `job.campaignJob?.campaign?.mapLocation?.name` trong khi API trả về `job.campaign.mapLocation.name`.  
**Status**: 🔧 Cần fix

---

#### BUG #4 · Campaign detail "Đã giải ngân" luôn = 0
**File**: `app/dashboard/campaigns/[id]/page.tsx`  
**Triệu chứng**: Số tiền đã giải ngân luôn hiển thị 0đ dù đã có review live.  
**Nguyên nhân**: Filter `r.status === 'completed'` — `completed` là `CampaignStatus`, không phải `ReviewStatus`. Đúng ra phải là `r.status === 'live'`.  
**Status**: 🔧 Cần fix

---

#### BUG #5 · Cancel campaign không hoàn tiền item pending_verify/holding
**File**: `app/api/campaigns/[id]/status/route.ts`  
**Triệu chứng**: Khi client cancel chiến dịch, chỉ hoàn tiền cho `pending` và `assigned` items. Items đang ở `pending_verify`, `verifying`, `holding` bị bỏ qua → tiền bị treo vĩnh viễn.  
**Fix**: Thêm `pending_verify`, `verifying`, `holding` vào danh sách items được hoàn tiền khi cancel.  
**Status**: 🔧 Cần fix

---

#### BUG #7 · JWT workerStatus stale sau khi admin approve
**File**: `lib/auth.ts`  
**Triệu chứng**: Admin approve worker nhưng worker không thể claim job ngay — phải đăng xuất/đăng nhập lại vì JWT cũ còn `workerStatus: 'pending'`.  
**Fix**: Thêm database lookup trong JWT callback để refresh workerStatus từ DB mỗi request (hoặc tăng trigger re-fetch).  
**Status**: 🔧 Cần fix

---

#### BUG #9 · SSRF trong check-level endpoint
**File**: `app/api/worker/accounts/[id]/check-level/route.ts`  
**Triệu chứng**: Worker-controlled `profileUrl` được fetch server-side không có validation. Có thể dùng để SSRF tấn công internal services.  
**Fix**: Validate URL chỉ cho phép `google.com/maps` và `maps.google.com` trước khi fetch.  
**Status**: 🔧 Cần fix

---

#### BUG #15 · Xóa PricingTier đang dùng → 500 không có message
**File**: `app/api/admin/pricing/[id]/route.ts`  
**Triệu chứng**: Nếu tier đang được campaign tham chiếu, Prisma throw foreign key error → trả 500 thô.  
**Fix**: Kiểm tra trước xem tier có campaign nào không, nếu có thì trả 400 với message rõ ràng.  
**Status**: 🔧 Cần fix

---

### 🟡 MEDIUM — Fix sớm

---

#### BUG #6 · Duplicate approve endpoint không nhất quán
**File**: `app/api/admin/workers/[id]/approve/route.ts`  
**Triệu chứng**: Endpoint này approve worker nhưng **không gửi notification**. Route `/api/admin/users/[id]` thì có gửi. Admin UI dùng route có notification, nên endpoint này là dead code không nhất quán.  
**Fix**: Xóa hoặc merge endpoint trùng lặp.  
**Status**: 🔧 Cần fix

---

#### BUG #11 · Không có minimum withdrawal amount
**File**: `app/api/wallet/withdraw/route.ts`  
**Triệu chứng**: Worker có thể rút 1đ, tạo transaction overhead vô ích.  
**Fix**: Thêm minimum withdrawal (ví dụ 50,000đ).  
**Status**: 🔧 Cần fix

---

#### BUG #12 · Settlement log sai changeAmount sign cho client
**File**: `app/api/cron/settlement/route.ts`  
**Triệu chứng**: Log `payout_client` ghi `changeAmount` dương trong khi frozenBalance của client đang giảm → lịch sử giao dịch hiển thị sai chiều.  
**Fix**: Đổi `changeAmount` thành âm cho `payout_client`.  
**Status**: 🔧 Cần fix

---

#### BUG #13 · Refill cron double-refill risk
**File**: `app/api/cron/refill/route.ts`  
**Triệu chứng**: Cron tìm item `dropped+settled`, tạo refill và tăng `refillCount`. Nhưng item gốc vẫn là `dropped+settled` → mỗi lần cron chạy lại tạo refill mới.  
**Fix**: Thêm field `refillCreated: Boolean` vào ReviewItem hoặc filter thêm `refillCount < maxRefills AND NOT EXISTS (refill item pending)`.  
**Status**: 🔧 Cần fix

---

#### BUG #14 · Admin chỉ deposit được cho client
**File**: `app/api/admin/deposit/route.ts`  
**Triệu chứng**: Kiểm tra `targetUser.role !== 'client'` → không nạp được cho worker hoặc admin (nếu cần debug).  
**Fix**: Bỏ role check hoặc document rõ ràng đây là intentional.  
**Status**: 📋 Cần xem xét

---

#### BUG #18 · profileUrl bị drop khi tạo WorkerAccount
**File**: `app/api/worker/accounts/route.ts`  
**Triệu chứng**: Form tạo account có trường `profileUrl` nhưng Zod schema POST không include field này → silent drop.  
**Fix**: Thêm `profileUrl` optional vào Zod schema và Prisma create.  
**Status**: 🔧 Cần fix

---

#### BUG #20 · Synthetic place ID không ổn định
**File**: `app/api/maps/validate/route.ts`  
**Triệu chứng**: Khi không extract được `place_id` từ URL, dùng base64 của URL làm ID. URL có thể khác nhau (redirect, format) cho cùng 1 địa điểm → tạo duplicate MapLocation.  
**Fix**: Cải thiện extraction hoặc dùng Google Places API thực sự.  
**Status**: 📋 Cần xem xét

---

### 🟢 MINOR — Fix khi có thời gian

---

#### BUG #8 · Rate limiter in-memory không hoạt động multi-instance
**File**: `lib/rate-limit.ts`  
**Triệu chứng**: Mỗi serverless function instance có Map riêng → rate limit không hiệu quả.  
**Fix**: Dùng Redis (ioredis đã cài sẵn) để lưu rate limit state.  
**Status**: 📋 Xem xét khi scale

---

#### BUG #10 · SSRF tiềm năng trong maps/validate
**File**: `app/api/maps/validate/route.ts`  
**Triệu chứng**: Follow redirects cho `maps.app.goo.gl` URLs. Check string `includes('maps.app.goo.gl')` có thể bị bypass.  
**Fix**: Validate URL destination sau redirect trước khi xử lý.  
**Status**: 📋 Low risk (Google short URLs)

---

#### BUG #16 · Wallet transactions không có pagination
**File**: `app/api/wallet/transactions/route.ts`  
**Triệu chứng**: Hardcode `take: 50`. Worker active sẽ không thấy transaction cũ.  
**Fix**: Thêm `?page=&limit=` parameter.  
**Status**: 📋 Enhancement

---

#### BUG #17 · `draft` và `pending_payment` enum values không dùng
**File**: `prisma/schema.prisma`, `app/api/campaigns/route.ts`  
**Triệu chứng**: Campaign tạo ra ngay là `active`, bỏ qua 2 trạng thái.  
**Fix**: Implement flow đúng hoặc xóa enum values thừa (breaking change).  
**Status**: 📋 Technical debt

---

#### BUG #19 · cron/verify auto-approve mọi URL không verify thực
**File**: `app/api/cron/verify/route.ts`  
**Triệu chứng**: Chỉ check `!!item.publishedUrl` — URL fake cũng được approve.  
**Fix**: Implement web crawl thực sự để verify review đã được đăng.  
**Status**: 📋 Feature incomplete

---

## PHẦN 3 — THỨ TỰ FIX

| Priority | Bug | File | Impact | Status |
|---|---|---|---|---|
| 1 | #1 Login redirect | LoginContent.tsx | UX broken | ✅ FIXED |
| 2 | #2 Admin jobs tabs | admin/jobs/page.tsx | Feature broken | ✅ FIXED |
| 3 | #3 Worker job display | worker/jobs, worker/dashboard | Feature broken | ✅ FIXED |
| 4 | #4 Giải ngân = 0 | dashboard/campaigns/[id] | Data wrong | ✅ FIXED |
| 5 | #5 Cancel không hoàn đủ tiền | api/campaigns/[id]/status | Money stuck | ✅ FIXED |
| 6 | #7 JWT stale | lib/auth.ts | UX broken | ✅ FIXED |
| 7 | #9 SSRF check-level | api/worker/accounts/[id]/check-level | Security | ✅ FIXED |
| 8 | #15 Delete pricing 500 | api/admin/pricing/[id] | UX broken | ✅ FIXED |
| 9 | #11 No min withdrawal | api/wallet/withdraw | Business logic | ✅ FIXED |
| 10 | #18 profileUrl drop | api/worker/accounts | Silent bug | ✅ FIXED |
| 11 | #13 Double refill | api/cron/refill | Data integrity | ✅ FIXED |
| 12 | #12 Settlement log sign | api/cron/settlement | Reporting wrong | ✅ FIXED |
| 13 | #6 Duplicate approve | api/admin/workers/[id]/approve | Dead code | ✅ FIXED |
| — | react-is missing | package.json | Runtime crash | ✅ FIXED |
| — | AUTH_SECRET missing | .env | Auth broken | ✅ FIXED |
| — | @tailwindcss/postcss placement | package.json | Dev-only lib in prod | ✅ FIXED |
