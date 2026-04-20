# MapBoost Neon — PLAN FINAL (Checklist)

---

## WAVE 0 — Pre-conditions (làm trước tất cả, ~10 phút)

- [ ] `npx prisma db push` — sync schema hiện tại với DB
- [ ] `npx prisma db seed` — đảm bảo pricing tiers + SystemConfig + users tồn tại
- [ ] `npm run build` — ghi nhận baseline lỗi TypeScript hiện tại
- [ ] Thêm `.env` vào `.gitignore` nếu chưa có
- [ ] Verify `worker@mapboost.vn` / `worker123` login được (seed đã approved)

---

## WAVE 1A — Data/Display Fixes (không cần DB, không có side effect)

### Admin Dashboard (app/admin/page.tsx)
- [ ] **Stats mapping**: `stats?.totalUsers` → `stats?.users?.total`, `totalClients` → `users.clients`, `totalWorkers` → `users.workers`, `pendingWorkers` → `users.pendingWorkers`, `activeCampaigns` → `campaigns.active`, `totalCampaigns` → `campaigns.total`
- [ ] **Review breakdown**: `stats?.reviewBreakdown` → `stats?.reviews`
- [ ] **Transaction list**: `tx.amount` → `Number(tx.changeAmount)`, `tx.description` → `tx.reason`

### Admin Jobs (app/admin/jobs/page.tsx)
- [ ] `job.submittedUrl` → `job.publishedUrl`
- [ ] `job.proofUrl` → `job.proofScreenshot`

### Admin Users (app/admin/users/page.tsx)
- [ ] `user.balance` → `Number(user.wallet?.availableBalance || 0).toLocaleString()`

### Admin Campaigns (app/admin/campaigns/page.tsx)
- [ ] Click row: `/dashboard/campaigns/${c.id}` → mở modal detail inline (không navigate, tránh tạo thêm page)

### Client Wallet (app/dashboard/wallet/page.tsx)
- [ ] Deposit reference code: `wallet?.userId?.split('-')[0]` → `session?.user?.id?.split('-')[0]`

### Cron Timeout (app/api/cron/timeout/route.ts)
- [ ] Auth header: `req.headers.get('authorization')` → `req.headers.get('x-cron-secret')`, check `=== process.env.CRON_SECRET`

### Worker Account PATCH (app/api/worker/accounts/[id]/route.ts)
- [ ] Thêm check `workerStatus !== 'approved'` cùng với `role !== 'worker'`

### Worker/Admin Accounts API error messages (app/api/worker/accounts/route.ts)
- [ ] 401 generic "Unauthorized" → `"Tài khoản chưa được duyệt bởi admin"` khi `workerStatus !== 'approved'`

---

## WAVE 1B — Logic Fixes (có side effect, cần test kỹ)

### BUG: Logout redirect về localhost
- [ ] Thêm `AUTH_URL=http://<IP_hoặc_domain>:3000` vào `.env` và `.env.example`
- [ ] Tất cả `signOut({ callbackUrl: '/' })` → `signOut({ callbackUrl: '/login' })`
- [ ] Verify NextAuth v5 beta.31 đọc `AUTH_URL` (không phải `NEXTAUTH_URL`)

### BUG: Admin Config — "Connection error"
- [ ] Wrap GET handler trong try/catch → `return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })`
- [ ] Wrap PATCH handler tương tự

### BUG: Approve job — hardcoded 7 ngày + verify cron
- [ ] `app/api/admin/jobs/[id]/approve/route.ts`: Query `SystemConfig` **1 lần trước transaction** → dùng `config.holdingDays` thay `7`
- [ ] `app/api/cron/verify/route.ts`: Tương tự, query SystemConfig 1 lần trước loop

### BUG: Reject job — không hoạt động + side effects thiếu
Tách endpoint: tạo `app/api/admin/jobs/[id]/reject/route.ts` (POST) thay vì dùng chung `/approve` với action field.

Logic trong `$transaction` duy nhất:
- [ ] Update `ReviewItem.status` → `dropped`
- [ ] Worker trust score: `trustScore: { decrement: 30 }` (floor 0: `Math.max(0, current - 30)`)
- [ ] Cleanup `AccountMapUsage`: xóa record `(assignedAccountId, campaign.mapLocationId)` để account có thể nhận job khác
- [ ] Nếu `campaign.warrantyUntil > now()` VÀ `refillCount < pricingTier.maxRefills`: tạo ReviewItem mới `status: pending`, `isRefill: true`, `refillOfId: job.id`, `refillCount: job.refillCount + 1`
- [ ] Nếu đã hết warranty: không tạo refill (client tự chịu)
- [ ] Update frontend `app/admin/jobs/page.tsx`: handleReject gọi `.../reject` (không phải `.../approve`)

### BUG: Campaign progress formula sai
- [ ] `app/api/campaigns/route.ts` GET: thêm `_count: { where: { status: { in: ['live', 'holding'] } } }` vào include reviewItems
- [ ] `app/dashboard/campaigns/page.tsx`: progress = `completedCount / totalReviews`
- [ ] `app/dashboard/page.tsx`: tương tự — không re-query, dùng data đã include

### Settlement cron — batch optimization
- [ ] `app/api/cron/settlement/route.ts`: Query SystemConfig **1 lần** trước khi vào batch loop (không query mỗi item)
- [ ] Ghi `oldBalance` snapshot đúng: trong cùng transaction, đọc balance **sau** khi lock row (`SELECT FOR UPDATE` hoặc dùng `$executeRaw` nếu cần), hoặc chấp nhận approximate và note trong code

---

## WAVE 2 — Core Missing Features

### 2.1 Campaign pause/cancel UI
- [ ] `app/dashboard/campaigns/[id]/page.tsx`: thêm 2 nút "Tạm dừng" / "Hủy chiến dịch"
- [ ] API `PATCH /api/campaigns/[id]/status` đã tồn tại — chỉ cần wire UI
- [ ] Hủy campaign: refund `frozenBalance` về `availableBalance` cho client (kiểm tra API đã handle chưa)

### 2.2 Google Maps URL — Real parsing (không cần Google API)
- [ ] Parse place name từ URL path: `/@([^/]+)` hoặc `/place/([^/@]+)`
- [ ] Resolve short URL (`maps.app.goo.gl/...`): HTTP GET → follow redirect → parse final URL
- [ ] Trả `{ placeId, name, address }` thực từ URL (dù chưa 100% accurate)
- [ ] Nếu parse fail → trả error rõ ràng, không trả mock data

### 2.3 Refill cron — đọc maxRefills từ PricingTier
- [ ] `app/api/cron/refill/route.ts`: thay `refillCount: { lt: 3 }` → include `campaign.pricingTier.maxRefills`, filter `refillCount < pricingTier.maxRefills`

### 2.4 Admin daily stats
- [ ] `app/api/admin/stats/route.ts`: thêm query param `?days=7` (default), trả array `[{ date: 'YYYY-MM-DD', newCampaigns, reviewsLive, revenue }]`
- [ ] `app/admin/page.tsx`: thêm line chart (Recharts, đã installed), data từ endpoint trên

### 2.5 Admin pricing management
- [ ] Thêm section vào `app/admin/settings/page.tsx`: table hiển thị pricing tiers
- [ ] `PATCH /api/admin/pricing/[id]` (route mới): update `pricePerReview`, `workerPayout`, `warrantyDays`, `maxRefills`
- [ ] Validate `workerPayout < pricePerReview` (business rule)

### 2.6 Content/Image per review — Campaign Creation
**Prerequisite**: File upload infra phải có trước (xem 2.7).

- [ ] Step 2 campaign creation: thêm section "Nội dung review"
  - Radio: "AI tự tạo" / "Tự nhập"
  - Nếu "Tự nhập": textarea nhập nhiều content (mỗi dòng = 1 content), hoặc N inputs
  - Nếu số content < totalReviews → hệ thống random + shuffle, không trùng
- [ ] Config ảnh: input "Số ảnh tối đa/review" (0 = không cần ảnh)
- [ ] API `app/api/campaigns/route.ts`: lưu `customContents[]` vào Campaign, assign content ngẫu nhiên vào từng ReviewItem lúc tạo
- [ ] Worker job page: hiển thị `job.content` và `job.images[]` khi làm job

### 2.7 File upload infrastructure (prerequisite cho 2.6)
- [ ] Chọn 1: Local disk (`/public/uploads/`) cho dev, S3 cho production
- [ ] Tạo `app/api/upload/route.ts`: nhận multipart, lưu file, trả URL
- [ ] Validate: chỉ accept image/*, max 5MB
- [ ] Worker submit proof: đổi input text URL → file upload input

---

## WAVE 3 — Security & Hardening

- [ ] **Secrets**: Rotate `AUTH_SECRET` và `CRON_SECRET` (vì đã commit vào git)
- [ ] **JWT staleness**: Set `session: { strategy: 'jwt', maxAge: 3600 }` — force re-login 1h
- [ ] **Critical APIs**: Thêm DB check `user.isActive` trên deposit, campaign create, approve
- [ ] **Trust score bounds**: Mọi nơi modify trustScore wrap bằng `Math.max(0, Math.min(200, newScore))`
- [ ] **Withdrawal limits**: Thêm max withdrawal/ngày (ví dụ 5,000,000đ), lưu vào SystemConfig
- [ ] **Idempotency deposit**: Frontend generate UUID khi mở form deposit, gửi kèm `idempotencyKey`, backend check unique trước khi insert
- [ ] **Prisma**: Move `prisma` package → devDependencies, thêm `"postinstall": "prisma generate"` vào package.json scripts
- [ ] **Transaction atomicity verify cron**: Wrap `updateStatus + trustScore update` trong `$transaction` (hiện tại sequential, có thể inconsistent)
- [ ] **Claim TOCTOU**: Sau `updateMany` thành công, tạo `AccountMapUsage` trong cùng `$transaction` (hiện code tạo sau transaction — race condition nếu 2 workers cùng claim)

---

## DEFINITION OF DONE — mỗi Wave

### Wave 0 ✅
- `npm run build` chạy được (0 errors)
- 3 accounts login thành công

### Wave 1A ✅
- Admin dashboard: stats hiện số thực (không phải 0)
- Admin jobs: URL và proof link hiển thị (không phải "-")
- Admin users: balance hiển thị đúng

### Wave 1B ✅
- Logout từ admin/worker/client → về `/login`, không về localhost
- Admin reject job → DB status = `dropped` (không phải `holding`)
- Admin config save → không có "connection error"
- Campaign progress % = (live + holding reviews) / total
- Worker claim job → `AccountMapUsage` tạo trong cùng transaction

### Wave 2 ✅
- Tạo campaign với Google Maps URL thật → thấy tên địa điểm thật (không phải "Mock")
- Pause/cancel campaign → nút hoạt động, frozenBalance refund đúng
- Admin settings: CRUD pricing tiers hoạt động
- Worker submit proof: upload ảnh thay vì nhập URL

### Wave 3 ✅
- `npm run build` 0 errors
- Deposit với cùng idempotencyKey 2 lần → chỉ cộng tiền 1 lần
- Ban user → user không thể dùng app dù session còn valid (do maxAge 1h + isActive check)

---

## TEST MATRIX (happy path + critical edge cases)

| Scenario | Expected |
|----------|----------|
| Admin approve job | status → holding, releaseAt = now + holdingDays từ config |
| Admin reject job | status → dropped, AccountMapUsage xóa, refill tạo nếu trong warranty |
| Worker claim job với account đã dùng cho địa điểm này | 400 "Tài khoản đã review địa điểm này" |
| Worker claim job, timeout hết hạn | job reset → pending, AccountMapUsage xóa |
| Client tạo campaign khi balance không đủ | 402, redirect tới wallet |
| Campaign progress | (live + holding) / total, không dùng target5Star |
| Deposit với cùng idempotencyKey | 2 lần → tiền chỉ cộng 1 lần |
| Cron settlement chạy 2 lần | Review đã settled không bị settle lại (idempotency) |
| Logout → navigate tới app | Redirect về /login |
| Worker bị ban → cố claim job | 401 |
