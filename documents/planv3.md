MapBoost Neon — Full System Review & Fix Plan (Round 3)
Context
Sau 2 vòng phát triển, user đã test thực tế và phát hiện nhiều bug mới + tính năng chưa hoàn thiện. Plan này là kết quả review toàn bộ codebase (~60 files), xác định chính xác root cause từng bug, và đề xuất fix cụ thể.

PHẦN 1: DANH SÁCH BUG (15 bugs, sắp theo độ nghiêm trọng)
CRITICAL (Chặn flow chính, phải fix trước)
BUG-1: Admin Dashboard hiển thị 0 cho tất cả stats + NaN transactions

Root cause: API app/api/admin/stats/route.ts:43-48 trả nested: { users: { total, clients, ... }, campaigns: { ... }, reviews: { ... } } nhưng app/admin/page.tsx:7-16 đọc flat stats.totalUsers, stats.totalClients. Transaction list dùng tx.amount (line 113) → NaN vì field đúng là tx.changeAmount. tx.description (line 110) → undefined vì field đúng là tx.reason. Review breakdown dùng stats.reviewBreakdown (line 48) nhưng API trả stats.reviews.
Fix: Sửa app/admin/page.tsx:
stats?.totalUsers → stats?.users?.total
stats?.totalClients → stats?.users?.clients
stats?.totalWorkers → stats?.users?.workers
stats?.pendingWorkers → stats?.users?.pendingWorkers
stats?.activeCampaigns → stats?.campaigns?.active
stats?.totalCampaigns → stats?.campaigns?.total
stats?.reviewBreakdown → stats?.reviews
tx.amount → Number(tx.changeAmount), tx.description → tx.reason
BUG-2: Admin Jobs — Reject button = Approve (sai hoàn toàn)

Root cause: app/api/admin/jobs/[id]/approve/route.ts KHÔNG parse request body. Luôn set status: 'holding'. Frontend (line 53-56) gửi { action: 'reject' } nhưng API ignore.
Fix: Parse body → nếu action === 'reject': set status = dropped, giảm trust score worker -30, tạo refill review. Nếu approve: giữ logic hiện tại + đọc holdingDays từ SystemConfig.
BUG-3: Admin Jobs — URL & Proof luôn hiển thị "-"

Root cause: app/admin/jobs/page.tsx:138 dùng job.submittedUrl và job.proofUrl (line 145) nhưng schema dùng publishedUrl và proofScreenshot.
Fix: Đổi job.submittedUrl → job.publishedUrl, job.proofUrl → job.proofScreenshot
BUG-4: Admin Config — "Connection error" khi lưu

Root cause: app/api/admin/config/route.ts GET (line 16-23) và PATCH (line 34-53) đều thiếu try/catch. Bất kỳ DB error nào → exception chưa handled → Next.js trả 500 không có JSON body → frontend res.json() fail → catch block hiển thị "Lỗi kết nối".
Fix: Wrap cả GET và PATCH trong try/catch, trả NextResponse.json({ error: ... }, { status: 500 })
BUG-5: Campaign creation — "pricingTierId: Invalid UUID"

Root cause: app/api/campaigns/route.ts:14 validates pricingTierId: z.string().uuid(). Nếu pricing tiers chưa được seed hoặc frontend gửi empty string (trường hợp pricingTiers array rỗng → selectedTierId = '') → Zod reject "Invalid UUID".
Fix: Kiểm tra frontend: nếu pricingTiers.length === 0 → disable submit + hiển thị warning. Thêm error display chi tiết (đã có từ Phase 4 nhưng cần verify hoạt động đúng).
BUG-6: Worker thêm tài khoản → Unauthorized

Root cause: app/api/worker/accounts/route.ts:15 check session.user.workerStatus !== 'approved'. Vấn đề: session.user.workerStatus có thể là null hoặc thiếu trong JWT. Kiểm tra lib/auth.ts:54: JWT callback gán token.workerStatus = user.workerStatus — field này là WorkerStatus? (nullable). Nếu worker chưa approved HOẶC session cũ (trước khi admin approve) → reject.
Fix:
Log session.user trong API để debug giá trị thực
Đảm bảo seed worker có workerStatus: 'approved' (đã có)
Worker cần re-login sau khi admin approve (JWT không auto-refresh)
Thêm thông báo rõ: "Tài khoản chưa được duyệt" thay vì generic "Unauthorized"
BUG-7: Logout redirect về localhost thay vì IP LAN

Root cause: .env có NEXT_PUBLIC_APP_URL="http://localhost:3000" nhưng KHÔNG có AUTH_URL. NextAuth v5 dùng AUTH_URL env var. Thiếu → NextAuth infer URL từ request Host header, nhưng signOut({ callbackUrl: '/' }) là relative URL → NextAuth resolve against inferred base URL → có thể resolve sai nếu proxy không forward Host đúng.
Fix:
Thêm AUTH_URL=http://192.168.10.31:3000 (hoặc domain thực) vào .env
Đổi tất cả signOut({ callbackUrl: '/' }) → signOut({ callbackUrl: '/login' }) để nhất quán
Thêm AUTH_URL vào .env.example
MODERATE (Hiển thị sai, UX kém)
BUG-8: Approve job hardcoded 7 ngày

File: app/api/admin/jobs/[id]/approve/route.ts:47
Fix: Query SystemConfig.holdingDays, dùng thay + 7
BUG-9: Cron timeout auth header inconsistent

File: app/api/cron/timeout/route.ts:6-7 dùng Authorization: Bearer trong khi 3 cron khác dùng x-cron-secret
Fix: Đổi sang req.headers.get('x-cron-secret')
BUG-10: Admin users page — Balance hiển thị "-"

File: app/admin/users/page.tsx:141 dùng user.balance nhưng API trả user.wallet.availableBalance
Fix: Number(user.wallet?.availableBalance || 0).toLocaleString()
BUG-11: Admin campaigns — Click row navigate sai route

File: app/admin/campaigns/page.tsx:103 → /dashboard/campaigns/${c.id} (client route, admin bị redirect)
Fix: Navigate tới /admin/campaigns/${c.id} hoặc mở modal detail
BUG-12: Wallet deposit reference code trống

File: app/dashboard/wallet/page.tsx:134 dùng wallet?.userId?.split('-')[0] nhưng wallet API không trả userId
Fix: Dùng session session?.user?.id?.split('-')[0] hoặc trả userId từ API
BUG-13: Worker account PATCH thiếu workerStatus check

File: app/api/worker/accounts/[id]/route.ts:18 — chỉ check role === 'worker'
Fix: Thêm (session.user as any).workerStatus !== 'approved'
BUG-14: Campaign progress formula sai

Files: app/dashboard/page.tsx:141, campaigns/page.tsx:109
Formula hiện tại: (totalReviews - target5Star) / totalReviews → vô nghĩa
Fix: Fetch review items count by status live+holding / totalReviews
BUG-15: Verify cron hardcoded holdingDays

File: app/api/cron/verify/route.ts:34 — hardcoded + 7
Fix: Query SystemConfig.holdingDays
PHẦN 2: TÍNH NĂNG ĐÃ HOÀN THÀNH (DONE)
Tính năng	Files	Status
Auth (login/register/JWT/middleware)	lib/auth.ts, middleware.ts, login/register pages	✅ Done
Role-based routing (client/worker/admin)	middleware.ts, 3 layout files	✅ Done
Client dashboard (stats, campaign list)	app/dashboard/	✅ Done (mock progress)
Campaign creation wizard (3 steps)	app/dashboard/campaigns/new/	✅ Done (single tier)
Campaign detail page	app/dashboard/campaigns/[id]/	✅ Done
Wallet display + QR deposit section	app/dashboard/wallet/	✅ Done
Settings (profile + password change)	app/dashboard/settings/	✅ Done
Worker job list (available/mine tabs)	app/worker/jobs/	✅ Done
Worker account management (CRUD + toggle)	app/worker/accounts/	✅ Done
Worker wallet + withdrawal	app/worker/wallet/	✅ Done
Worker claim w/ account selection	app/api/worker/jobs/[id]/claim/	✅ Done
Worker submit proof	app/api/worker/jobs/[id]/submit/	✅ Done
Admin dashboard (stats + transactions)	app/admin/page.tsx	✅ Done (bug: data mapping)
Admin user management (approve/reject/ban)	app/admin/users/	✅ Done
Admin campaign list	app/admin/campaigns/	✅ Done
Admin job review (approve)	app/admin/jobs/	✅ Done (bug: no reject)
Admin finance (deposit + transactions)	app/admin/finance/	✅ Done
Admin system config	app/admin/settings/	✅ Done (bug: no try/catch)
Escrow system (freeze/holding/settlement)	Campaign API + settlement cron	✅ Done
Cron: settlement, verify, refill, timeout	app/api/cron/*	✅ Done (bugs noted)
Navbar/Footer hidden on app routes	components/Layout.tsx	✅ Done
Logout buttons on all layouts	All 3 layouts	✅ Done
Registration with role selector	app/register/RegisterContent.tsx	✅ Done
SystemConfig model + API	Schema + app/api/admin/config/	✅ Done
AccountMapUsage (anti-reuse)	Schema + claim API	✅ Done
Prisma schema (11 models, 8 enums)	prisma/schema.prisma	✅ Done
PHẦN 3: TÍNH NĂNG CHƯA LÀM (NOT DONE)
Tính năng	Độ ưu tiên	Mô tả
AI Content Generation	HIGH	contentMode: 'ai' tồn tại trong schema nhưng không có Gemini API integration. Cần GEMINI_API_KEY + API route
Media Upload	HIGH	app/dashboard/media/page.tsx hoàn toàn placeholder. Không có upload handler, không có storage backend
Google Maps URL validation thực	HIGH	app/api/maps/validate/route.ts trả data MOCK (hardcoded name/address). Không có Google Places API
Multi-tier campaign (mix basic+silver+vip)	MEDIUM	Hiện tại chỉ chọn 1 tier. User yêu cầu mix nhiều level
Content/Image per review	MEDIUM	Schema có ReviewItem.content + images[] nhưng chưa có UI cấu hình
Auto-check Local Guide level	MEDIUM	Worker add account nhưng verify level thủ công
Campaign pause/cancel/edit UI	MEDIUM	API campaigns/[id]/status tồn tại nhưng không có UI
Daily stats chart (Admin)	MEDIUM	Dashboard chỉ có tổng, không có time-series chart
Admin pricing management	MEDIUM	Không có UI chỉnh giá per tier
Forgot password	LOW	Login page có link href="#", không hoạt động
Google OAuth	LOW	Button "Continue with Google" có nhưng không có provider
Real-time notifications	LOW	Bell icon trang trí, không có WebSocket/polling
Reports (thực)	LOW	app/dashboard/reports/ chart data fabricated, không phản ánh thực tế
Worker job history per account	LOW	Chưa có filter/view theo account cụ thể
File upload infrastructure	LOW	Không có S3/Cloudinary integration
PHẦN 4: KẾ HOẠCH FIX (4 WAVES)
WAVE 1: Critical Bug Fixes (11 items)
Tất cả bug hiện tại đang chặn flow hoạt động.

#	Task	File(s)	Effort
1.1	Fix admin dashboard data mapping (stats + transactions + breakdown)	app/admin/page.tsx	Small
1.2	Fix admin jobs: field names + implement reject logic	app/admin/jobs/page.tsx, app/api/admin/jobs/[id]/approve/route.ts	Medium
1.3	Fix admin config: add try/catch	app/api/admin/config/route.ts	Small
1.4	Fix cron timeout: auth header → x-cron-secret	app/api/cron/timeout/route.ts	Small
1.5	Fix logout redirect: add AUTH_URL + callbackUrl	.env, .env.example, all layouts	Small
1.6	Fix wallet deposit reference code	app/dashboard/wallet/page.tsx	Small
1.7	Fix campaign progress formula (count live+holding items)	app/dashboard/page.tsx, campaigns/page.tsx, APIs	Medium
1.8	Fix admin users balance display	app/admin/users/page.tsx	Small
1.9	Fix admin campaigns click navigation	app/admin/campaigns/page.tsx	Small
1.10	Fix approve job: read holdingDays from SystemConfig + verify cron	app/api/admin/jobs/[id]/approve/route.ts, app/api/cron/verify/route.ts	Small
1.11	Fix worker account PATCH auth + better error messages	app/api/worker/accounts/[id]/route.ts, app/api/worker/accounts/route.ts	Small
WAVE 2: Core Missing Features
Tính năng cần thiết để hệ thống hoạt động end-to-end.

#	Task	File(s)	Effort
2.1	Google Maps URL parsing (extract place name/address from real URL)	app/api/maps/validate/route.ts	Medium
2.2	Campaign pause/cancel UI buttons	app/dashboard/campaigns/[id]/page.tsx	Small
2.3	Content/image configuration per review (campaign creation step)	app/dashboard/campaigns/new/page.tsx, app/api/campaigns/route.ts	Large
2.4	Admin daily stats chart	app/api/admin/stats/route.ts, app/admin/page.tsx	Medium
2.5	Refill cron: read maxRefills from PricingTier	app/api/cron/refill/route.ts	Small
2.6	Admin pricing management (CRUD pricing tiers)	app/api/admin/pricing/route.ts (new), app/admin/settings/page.tsx	Medium
WAVE 3: Security & Production Hardening
#	Task	Effort
3.1	Remove .env from git history, ensure .gitignore blocks it	Small
3.2	JWT staleness: add DB check for ban/role on critical API routes (or use short-lived tokens)	Medium
3.3	Move prisma to devDependencies, add postinstall: prisma generate script	Small
3.4	Transaction atomicity in verify cron (wrap verify+trust update in $transaction)	Small
3.5	Trust score bounds (floor 0, cap 200) in all places that modify it	Small
3.6	Real idempotency keys (use deterministic key like deposit_{userId}_{timestamp})	Small
WAVE 4: Nice-to-Have (post-MVP)
#	Task
4.1	AI content generation via Gemini API
4.2	Media upload (S3/Cloudinary)
4.3	Forgot password flow
4.4	Google OAuth provider
4.5	Real-time notifications (SSE/polling)
4.6	Reports with real data
4.7	Redis rate limiting
PHẦN 5: ĐỀ XUẤT KIẾN TRÚC & CẢI TIẾN
Authentication & Authorization
Hiện tại: NextAuth v5 beta + JWT. Role/workerStatus chỉ set lúc login, không refresh.
Đề xuất: Thêm DB check trên critical mutations (deposit, approve, campaign create). Hoặc set JWT maxAge: 3600 (1h) để force re-login thường xuyên hơn.
Error Handling
Hiện tại: Nhiều API route thiếu try/catch (admin config, wallet). Frontend chỉ hiện toast generic.
Đề xuất: Mỗi API route PHẢI có try/catch outer wrap. Frontend parse data.details (Zod) hoặc data.error (string).
Validation
Hiện tại: Zod ở hầu hết API, nhưng thiếu frontend validation trước submit.
Đề xuất: Validate client-side trước khi gọi API (review count > 0, tier selected, star split = total).
Job Queue & Retry
Hiện tại: Cron-based (polling). Adequate cho MVP, nhưng cron interval ảnh hưởng latency.
Đề xuất tương lai: BullMQ + Redis cho job scheduling, retry logic, dead letter queue.
Logging & Monitoring
Hiện tại: console.error only. Không có structured logging.
Đề xuất tương lai: Pino logger + Sentry cho error tracking.
VERIFICATION
Sau mỗi wave:

npx prisma generate — validate schema
npm run build — zero TypeScript/build errors
Test matrix:
Admin: Login → dashboard stats hiện đúng → approve/reject job → config save → deposit → users balance
Client: Login → tạo campaign (kiểm validation errors) → xem progress → wallet QR → logout
Worker: Login → add account → claim job (chọn account) → submit proof → toggle account → logout
Check browser console cho unhandled errors
Verify logout redirect đúng (không về localhost)