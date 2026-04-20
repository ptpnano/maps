# MapBoost Neon — Tài liệu Hệ thống

> **Cập nhật lần cuối**: 18/04/2026  
> **Phiên bản**: Next.js 15, Prisma 6, NextAuth v5 beta

---

## 1. Tổng quan Hệ thống

**MapBoost Neon** là nền tảng quản lý chiến dịch đánh giá Google Maps. Kết nối **doanh nghiệp (Client)** cần tăng điểm đánh giá với **người thực hiện (Worker)** viết review.

### Luồng tiền tệ

```
Admin nạp tiền → Client availableBalance ↑
Client tạo chiến dịch → availableBalance ↓ | frozenBalance ↑ | ReviewItem[] tạo ra
Worker nhận job → AccountMapUsage tạo (chống duplicate)
Worker submit bằng chứng → pending_verify
Admin approve → holding, releaseAt = now + holdingDays
Cron settlement → live | frozenBalance client ↓ | availableBalance worker ↑
Worker rút tiền → availableBalance ↓ | totalWithdrawn ↑
```

### Trust Score (Worker)
| Sự kiện | Thay đổi |
|---|---|
| Admin reject job | −30 (tối thiểu 0) |
| Job live (settlement) | +10 |
| Cron/verify tự drop | −30 |

---

## 2. Vai trò Người dùng

| Role | Mô tả | Dashboard |
|---|---|---|
| `client` | Doanh nghiệp mua review | `/dashboard/*` |
| `worker` | Người thực hiện review | `/worker/*` |
| `admin` | Vận hành hệ thống | `/admin/*` |

---

## 3. Database Schema

### Enums

| Enum | Các giá trị |
|---|---|
| `Role` | `client`, `worker`, `admin` |
| `WorkerStatus` | `pending`, `approved`, `rejected`, `banned` |
| `TransactionType` | `deposit`, `freeze`, `unfreeze`, `payout_client`, `payout_worker`, `refund`, `withdrawal`, `adjustment` |
| `PricingLevel` | `basic`, `silver`, `vip` |
| `CampaignContentMode` | `ai`, `custom` |
| `CampaignStatus` | `draft`*, `pending_payment`*, `active`, `paused`, `completed`, `cancelled` |
| `ReviewStatus` | `pending`, `assigned`, `pending_verify`, `verifying`, `holding`, `live`, `dropped`, `expired` |
| `WorkerAccountStatus` | `active`, `cooldown`, `banned` |
| `NotificationType` | `campaign_created`, `campaign_completed`, `review_live`, `review_dropped`, `job_available`, `job_claimed`, `settlement_complete`, `worker_approved`, `worker_rejected`, `deposit_received`, `withdrawal_processed`, `system_alert` |

> *`draft` và `pending_payment` tồn tại trong enum nhưng hiện chưa được sử dụng trong flow tạo campaign.

### Các Model Chính

#### `User`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID | PK |
| `email` | String unique | |
| `passwordHash` | String | bcrypt cost 12 |
| `name` | String | |
| `phone` | String? | |
| `role` | Role | client/worker/admin |
| `workerStatus` | WorkerStatus? | Chỉ dùng với worker |
| `trustScore` | Int | default 100 |
| `isActive` | Boolean | default true |

#### `Wallet`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `availableBalance` | Decimal(15,2) | Số dư có thể dùng |
| `frozenBalance` | Decimal(15,2) | Đang bị giữ cho chiến dịch |
| `totalEarned` | Decimal(15,2) | Tổng đã kiếm (worker) |
| `totalSpent` | Decimal(15,2) | Tổng đã chi (client) |
| `totalWithdrawn` | Decimal(15,2) | Tổng đã rút |

#### `Campaign`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `totalReviews` | Int | Tổng số review cần |
| `target5Star` / `4Star` / `3Star` | Int | Phân bổ sao |
| `contentMode` | ai / custom | Cách tạo nội dung |
| `status` | CampaignStatus | Trạng thái |
| `frozenAmount` | Decimal | Tiền đang giữ |
| `settledAmount` | Decimal | Tiền đã thanh toán |

#### `ReviewItem`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `status` | ReviewStatus | Trạng thái từng review |
| `targetRating` | Int | 3/4/5 sao |
| `clientPrice` | Decimal | Client trả cho review này |
| `workerPayout` | Decimal | Worker nhận cho review này |
| `publishedUrl` | String? | URL review đã đăng |
| `proofScreenshot` | String? | Ảnh chụp màn hình |
| `isRefill` | Boolean | Có phải review bù không |
| `refillCount` | Int | Số lần đã bù |

---

## 4. API Routes

### Auth
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Public | NextAuth handlers |
| POST | `/api/auth/register` | Public | Đăng ký client/worker. Rate-limited 5 req/5min. |

### Campaigns (Client)
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/campaigns` | client | Tạo chiến dịch + escrow tiền |
| GET | `/api/campaigns` | client | Danh sách chiến dịch |
| GET | `/api/campaigns/[id]` | client (owner) | Chi tiết chiến dịch |
| PATCH | `/api/campaigns/[id]/status` | client (owner) | pause / resume / cancel |

### Wallet
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/wallet` | logged in | Số dư ví |
| GET | `/api/wallet/transactions` | logged in | 50 giao dịch gần nhất |
| POST | `/api/wallet/withdraw` | worker | Rút tiền về ngân hàng |

### Worker Jobs
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/worker/jobs?status=` | worker (approved) | Danh sách job theo trạng thái |
| POST | `/api/worker/jobs/[id]/claim` | worker (approved) | Nhận job |
| POST | `/api/worker/jobs/[id]/submit` | worker (approved) | Nộp bằng chứng |

### Worker Accounts
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/worker/accounts` | worker (approved) | Danh sách tài khoản |
| POST | `/api/worker/accounts` | worker (approved) | Thêm tài khoản |
| PATCH | `/api/worker/accounts/[id]` | worker (approved, owner) | Cập nhật tài khoản |
| POST | `/api/worker/accounts/[id]/check-level` | worker (approved, owner) | Tự động detect cấp độ Local Guide |

### Notifications
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/notifications` | logged in | 50 thông báo + số chưa đọc |
| PATCH | `/api/notifications` | logged in | Đánh dấu đã đọc |

### Admin — Users
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/admin/users` | admin | Danh sách phân trang, filter theo role/status |
| PATCH | `/api/admin/users/[id]` | admin | Cập nhật workerStatus, isActive, trustScore |

### Admin — Campaigns & Jobs
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/admin/campaigns` | admin | Danh sách chiến dịch phân trang |
| GET | `/api/admin/jobs` | admin | Danh sách review items phân trang |
| POST | `/api/admin/jobs/[id]/approve` | admin | Approve → holding |
| POST | `/api/admin/jobs/[id]/reject` | admin | Reject → dropped, -30 trust, tạo refill |

### Admin — Finance
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/admin/deposit` | admin | Nạp tiền cho client |
| GET | `/api/admin/transactions` | admin | Lịch sử giao dịch phân trang |

### Admin — Pricing & Config
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET/POST | `/api/admin/pricing` | admin | Danh sách / tạo gói giá |
| PATCH/DELETE | `/api/admin/pricing/[id]` | admin | Sửa / xóa gói giá |
| GET/PATCH | `/api/admin/config` | admin | Cấu hình hệ thống |
| GET | `/api/admin/stats` | admin | Thống kê tổng quan |

### Cron Jobs
| Endpoint | Mô tả | Batch |
|---|---|---|
| `/api/cron/settlement` | Chuyển holding→live, trả tiền worker, trừ tiền client | 100/run |
| `/api/cron/timeout` | Reset assigned job quá hạn về pending | Tất cả |
| `/api/cron/verify` | Auto-approve/reject pending_verify | 50/run |
| `/api/cron/refill` | Tạo review bù cho item bị dropped trong warranty | 50/run |

---

## 5. Pages

### Public
| URL | Mô tả |
|---|---|
| `/` | Landing page marketing |
| `/pricing` | Bảng giá dịch vụ |
| `/case-studies` | Case studies |
| `/audit` | Form kiểm toán |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |

### Client Dashboard
| URL | Mô tả |
|---|---|
| `/dashboard` | Tổng quan: stats, biểu đồ review, chiến dịch gần đây |
| `/dashboard/campaigns` | Danh sách chiến dịch + search/filter |
| `/dashboard/campaigns/new` | Wizard 3 bước tạo chiến dịch |
| `/dashboard/campaigns/[id]` | Chi tiết + bảng review items + điều khiển |
| `/dashboard/wallet` | Số dư, QR nạp tiền, lịch sử giao dịch |
| `/dashboard/settings` | Cập nhật profile và mật khẩu |

### Worker Dashboard
| URL | Mô tả |
|---|---|
| `/worker/dashboard` | Tổng quan: banner trạng thái duyệt, job đang nhận |
| `/worker/jobs` | Tab job khả dụng + tab job của mình + form nộp bằng chứng |
| `/worker/accounts` | Quản lý tài khoản Google Maps |
| `/worker/wallet` | Số dư, tổng kiếm được, form rút tiền |
| `/worker/settings` | Cập nhật profile, bio, mật khẩu |

### Admin Panel
| URL | Mô tả |
|---|---|
| `/admin` | Dashboard thống kê tổng quan |
| `/admin/users` | Quản lý người dùng + duyệt worker |
| `/admin/campaigns` | Xem tất cả chiến dịch |
| `/admin/jobs` | Duyệt / từ chối bằng chứng review |
| `/admin/finance` | Nạp tiền + lịch sử giao dịch |
| `/admin/pricing` | CRUD bảng giá |
| `/admin/settings` | Cấu hình holdingDays, timeout, ngân hàng |

---

## 6. Authentication & Authorization

- **Provider**: NextAuth.js v5 beta, JWT strategy, TTL 1 giờ
- **Credentials only**: email + password (không có OAuth thực sự)
- **Session shape**: `{ id, name, email, role, workerStatus }`
- **Middleware** (Edge runtime): kiểm tra JWT, route guards theo role
- **Worker restriction**: worker cần `workerStatus === 'approved'` mới dùng được `/api/worker/*`

---

## 7. Cấu hình môi trường (.env)

| Variable | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth secret key |
| `NEXTAUTH_URL` | ✅ | Base URL của app |
| `CRON_SECRET` | ✅ | Header secret cho cron endpoints |

---

## 8. Seed Data (Development)

| Tài khoản | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | `admin@mapboost.vn` | `admin123` | |
| Client | `client@mapboost.vn` | `client123` | Ví: 5,000,000 VND |

**Gói giá mặc định**:
| Gói | Giá/review | Worker nhận | Platform fee | Warranty |
|---|---|---|---|---|
| Basic | 30,000đ | 20,000đ | 10,000đ | 30 ngày |
| Silver | 50,000đ | 35,000đ | 15,000đ | 30 ngày |
| VIP | 80,000đ | 55,000đ | 25,000đ | 30 ngày |
