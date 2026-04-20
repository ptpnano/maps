# Thuật Toán Phân Bổ Công Việc (Dispatch Algorithm)

## 1. Tổng Quan

Hệ thống có hai chế độ phân bổ công việc (review item) cho worker, cấu hình bởi admin trong `/admin/dispatch-config`:

| Chế độ | Mô tả |
|--------|-------|
| **manual** | Worker tự tìm và nhận việc từ danh sách "Việc có thể làm" |
| **auto** | Hệ thống tự động phân bổ việc cho worker theo thuật toán cấu hình sẵn |

---

## 2. Vòng Đời Của Một Review Item

```
[Campaign active] → ReviewItem.status = 'pending'
                  ↓
     Worker claim (manual) hoặc Auto-assign (auto)
                  ↓
        status = 'in_progress'  ←── expiresAt (timeout)
                  ↓
     Worker submit (link + screenshot)
                  ↓
        status = 'pending_verify'
                  ↓
     Admin review
            ↓               ↓
       Approve           Reject
          ↓                 ↓
   status='completed'  status='rejected'
   workerPayout credited   worker trust -5
```

---

## 3. Điều Kiện Để Worker Thấy Việc (Manual Mode)

Worker chỉ thấy một job trong danh sách "Việc khả dụng" khi **tất cả** điều kiện sau thỏa mãn:

1. **Campaign đang active** — `campaign.status = 'active'`
2. **Đã đến lịch** — `reviewItem.scheduledAt <= now()`
3. **Chưa có người nhận** — `reviewItem.status = 'pending'`
4. **Chưa làm địa điểm này** — Worker không có account nào đã review địa điểm này (`AccountMapUsage`)
5. **Level GG phù hợp** — Worker có ít nhất một tài khoản GG active với `level` nằm trong khoảng `[pricingTier.minAccountLevel, pricingTier.maxAccountLevel]`

### 3.1. Tier–Level Matching

Mỗi `PricingTier` có hai trường mới:

```prisma
minAccountLevel  Int  @default(1)   // Level GG tối thiểu
maxAccountLevel  Int  @default(10)  // Level GG tối đa
```

Ví dụ cấu hình mặc định:
| Gói | Level GG yêu cầu |
|-----|-----------------|
| Basic | 1 – 4 |
| Silver | 3 – 7 |
| VIP | 6 – 10 |

---

## 4. Bốn Thuật Toán Auto-Assign

Khi `dispatchMode = 'auto'`, cron job `/api/cron/auto-assign` chạy theo chu kỳ và phân bổ việc theo thuật toán được cấu hình.

### 4.1. `trust_score` — Uy tín cao nhất (mặc định)
Ưu tiên worker có `trustScore` cao nhất. Tốt cho chất lượng review.

```
sort: workers DESC by user.trustScore
```

### 4.2. `least_jobs` — Ít việc nhất
Ưu tiên worker đang xử lý ít việc nhất (in_progress + pending_verify). Phân phối đều tải.

```
sort: workers ASC by COUNT(assignedJobs WHERE status IN ['in_progress', 'pending_verify'])
```

### 4.3. `highest_level` — Level cao nhất
Ưu tiên worker có tài khoản GG level cao nhất. Tốt cho gói VIP.

```
sort: workers DESC by MAX(workerAccounts.level)
```

### 4.4. `fifo` — Lâu chưa nhận việc
Ưu tiên worker chưa được giao việc lâu nhất (first-in, first-out). Công bằng nhất.

```
sort: workers ASC by lastJobAt (NULL first = chưa bao giờ nhận)
```

---

## 5. Logic Auto-Assign (Chi Tiết)

```typescript
// 1. Fetch pending jobs (scheduledAt <= now, campaign.status = 'active')
// 2. Fetch all eligible workers (role=worker, workerStatus=approved, isActive=true)
// 3. For each job:
//    a. Filter workers: has active account with level in [tier.minAccountLevel, tier.maxAccountLevel]
//    b. Filter workers: no account has mapUsage for this campaign.mapLocationId
//    c. Sort by selected algorithm
//    d. Pick first worker, pick their best-level matching account
//    e. Transaction:
//       - Update reviewItem: status=in_progress, assignedWorkerId, assignedAccountId, expiresAt
//       - Upsert AccountMapUsage
//       - Create notification for worker
```

---

## 6. Timeout & Reclaim

Khi job hết hạn (`expiresAt < now()` và vẫn `in_progress`), cron `/api/cron/timeout` sẽ reset job về `pending` để worker khác có thể nhận.

**Timeout mặc định**: `SystemConfig.jobTimeoutMinutes` (mặc định 30 phút).

---

## 7. Quy Tắc Claim (Manual Mode)

Khi worker claim một job, hệ thống kiểm tra:

1. **Account thuộc worker** — `workerAccount.userId = session.user.id`
2. **Account đang active** — `workerAccount.status = 'active'`
3. **Job còn pending** — `reviewItem.status = 'pending'` (race condition handled by status check in transaction)
4. **Level GG phù hợp** — `account.level >= tier.minAccountLevel && account.level <= tier.maxAccountLevel`
5. **Chưa dùng địa điểm này** — Không có `AccountMapUsage` cho (accountId, mapLocationId)

---

## 8. Cron Jobs

| Endpoint | Mô tả | Tần suất gợi ý |
|----------|-------|----------------|
| `GET /api/cron/auto-assign` | Phân bổ tự động (nếu enabled) | Mỗi N phút (config) |
| `GET /api/cron/timeout` | Reset job hết hạn về pending | Mỗi 5 phút |
| `GET /api/cron/verify` | Kiểm tra review đã live chưa | Mỗi giờ |
| `GET /api/cron/settlement` | Thanh toán cho worker sau holding period | Mỗi ngày |
| `GET /api/cron/refill` | Tạo refill jobs cho campaign | Mỗi ngày |

**Bảo mật**: Tất cả cron endpoint đều yêu cầu header `x-cron-secret` khớp với biến môi trường `CRON_SECRET`.

---

## 9. Admin Config Options

| Cài đặt | Mô tả | Mặc định |
|---------|-------|----------|
| `dispatchMode` | `manual` hoặc `auto` | `manual` |
| `autoAssignAlgorithm` | Thuật toán auto-assign | `trust_score` |
| `autoAssignIntervalMinutes` | Chu kỳ cron (phút) | `5` |
| `jobTimeoutMinutes` | Thời gian timeout job (phút) | `30` |
| `holdingDays` | Số ngày giữ tiền sau khi review live | `7` |

Cấu hình được quản lý tại `/admin/dispatch-config` (dispatch) và `/admin/settings` (chung).

---

## 10. Các Tính Năng Admin Đề Xuất Thêm

| Tính năng | Mô tả | Độ ưu tiên |
|-----------|-------|------------|
| Audit Log | Ghi lại hành động admin (approve/reject/edit) | Cao |
| Bulk Actions | Duyệt/từ chối nhiều job/campaign cùng lúc | Trung bình |
| CSV Export | Xuất danh sách giao dịch cho kế toán | Trung bình |
| System Health | Dashboard theo dõi cron chạy lần cuối, jobs bị timeout | Thấp |
| Worker Leaderboard | Bảng xếp hạng worker theo trust score / số job hoàn thành | Thấp |
