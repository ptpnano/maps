# YouTube Worker API for Maps

Tai lieu nay mo ta API production de cac client Python trong project `ytb` claim quota theo chunk tu Maps. Maps chi quan ly order, quota, lease, worker key va lich su. Worker `ytb` tu quan account Gmail, session, proxy va local history.

## 1. Kien Truc

Huong ket noi production:

```text
ytb worker -> Maps public API
```

Maps khong goi nguoc ve may chay Python. Worker poll Maps khi con capacity.

Luong worker:

1. `POST /api/youtube/worker/heartbeat`
2. `POST /api/youtube/worker/claims`
3. Worker tu chon Gmail/proxy local va chay theo `claimQuantity`.
4. `PATCH /api/youtube/worker/claims/{claimTargetId}` de update progress/result/history.
5. Lap lai moi 3-10 giay khi con capacity.

Endpoint cu `/api/youtube/worker/jobs` da deprecated va tra `410`.

## 2. Auth Va Worker Key

Moi worker production nen co key rieng do admin tao tai:

```text
Admin -> YouTube -> Tao worker key
```

Maps chi hien plaintext key mot lan, sau do chi luu hash.

Worker gui key bang:

```http
x-api-key: <worker-api-key>
```

Hoac:

```http
Authorization: Bearer <worker-api-key>
```

Env worker goi y:

```env
MAPS_BASE_URL=https://maps-domain.com
YOUTUBE_WORKER_API_KEY=ytbw_xxx
YOUTUBE_WORKER_ID=ytb-vps-01
```

Gia dinh van hanh da chot:

- Gmail/account khong trung giua nhieu client `ytb`.
- Worker tu chong Gmail lam trung video bang local history.
- Maps khong validate Gmail khi claim.

## 3. Service Types

| Maps `serviceType` | Nghia | ytb mapping |
| --- | --- | --- |
| `like` | Tang like video | `like` |
| `view` | Tang view video | `view` |
| `comment` | Tang comment video | `cmt` neu runner cu dung `cmt` |
| `sub` | Tang sub channel | `sub` |

## 4. Heartbeat

```http
POST /api/youtube/worker/heartbeat
x-api-key: <worker-api-key>
content-type: application/json
```

Request:

```json
{
  "workerKey": "ytb-vps-01",
  "label": "VPS Ha Noi 01",
  "status": "online",
  "capabilities": ["like", "view", "comment", "sub"],
  "metadata": {
    "version": "2026.06.16",
    "accounts": 120,
    "workers": 4,
    "proxy": "kiot"
  }
}
```

Response:

```json
{
  "ok": true,
  "worker": {
    "workerKey": "ytb-vps-01",
    "status": "online",
    "lastSeenAt": "2026-06-16T10:00:00.000Z"
  }
}
```

Khuyen nghi gui heartbeat moi 15-30 giay. Admin coi worker active neu `lastSeenAt` trong 2 phut gan nhat.

## 5. Claim Chunk

Worker claim quota theo chunk, khong claim nguyen target.

```http
POST /api/youtube/worker/claims
x-api-key: <worker-api-key>
content-type: application/json
```

Request:

```json
{
  "workerKey": "ytb-vps-01",
  "serviceTypes": ["like", "view", "comment", "sub"],
  "limitTargets": 10,
  "maxQuantityPerTarget": 50,
  "totalCapacity": 200,
  "leaseSeconds": 600
}
```

Fields:

| Field | Nghia |
| --- | --- |
| `workerKey` | ID worker, phai khop key da cap |
| `serviceTypes` | Cac dich vu worker muon nhan |
| `limitTargets` | Toi da bao nhieu video/channel trong mot claim |
| `maxQuantityPerTarget` | Toi da bao nhieu quota cho moi target |
| `totalCapacity` | Tong quota worker co the nhan trong lan claim nay |
| `leaseSeconds` | Thoi gian giu reservation; mac dinh nen 600 giay |

Maps tinh:

```text
activeReserved = sum(claimedQuantity - successCount cua claim target dang claimed/running va chua het lease)
available = executionQuantity - ytbQuotaDone - activeReserved
claimQuantity = min(available, maxQuantityPerTarget, remaining totalCapacity)
```

Response:

```json
{
  "claimId": "claim-uuid",
  "targets": [
    {
      "claimTargetId": "claim-target-uuid",
      "targetId": "target-uuid",
      "orderId": "order-uuid",
      "serviceType": "like",
      "targetKey": "hU05BYnHUJA",
      "targetUrl": "https://www.youtube.com/watch?v=hU05BYnHUJA",
      "claimQuantity": 50,
      "quotaDone": 120,
      "quotaTotal": 260,
      "comments": [],
      "allowDuplicateComments": true,
      "config": {},
      "leaseUntil": "2026-06-16T10:10:00.000Z"
    }
  ]
}
```

Neu het viec:

```json
{
  "claimId": null,
  "targets": []
}
```

Worker nhan `claimQuantity=50` thi tu chon Gmail local de chay toi da 50 action cho target do. Maps khong can biet Gmail truoc khi chay.

## 6. Update Claim Target

Worker update theo `claimTargetId`.

```http
PATCH /api/youtube/worker/claims/{claimTargetId}
x-api-key: <worker-api-key>
content-type: application/json
```

Maps dem quota thanh cong dua tren history Gmail/video unique, khong tin mu `successCount`.

Quy tac:

- Moi history row `status="success"` phai co `gmail` thi moi duoc tinh quota.
- Maps unique theo `serviceType + targetKey + gmail` voi status success.
- Neu worker gui trung cung Gmail cho cung video/channel, Maps van khong tang quota lan hai.
- `successCount` chi la so tich luy worker report de tham khao/log; so duoc cong that la so success history moi duoc accept.
- Neu PATCH retry cung history, DB unique se bo qua duplicate va khong double count.

Dang chay:

```json
{
  "workerKey": "ytb-vps-01",
  "status": "running",
  "successCount": 20,
  "failedCount": 3,
  "history": [
    {
      "gmail": "acc1@gmail.com",
      "ip": "1.2.3.4",
      "actedAt": "2026-06-16T10:15:00.000Z",
      "status": "success"
    }
  ]
}
```

Hoan thanh chunk:

```json
{
  "workerKey": "ytb-vps-01",
  "status": "done",
  "successCount": 50,
  "failedCount": 5,
  "history": [
    {
      "gmail": "acc50@gmail.com",
      "ip": "1.2.3.5",
      "actedAt": "2026-06-16T10:25:00.000Z",
      "status": "success",
      "metadata": {
        "remoteHost": "1.2.3.5"
      }
    }
  ]
}
```

Loi chunk:

```json
{
  "workerKey": "ytb-vps-01",
  "status": "failed",
  "successCount": 12,
  "failedCount": 20,
  "error": "No available local account",
  "detail": {
    "reason": "local_accounts_exhausted"
  }
}
```

Maps se:

- Tinh `acceptedSuccessDelta` bang so history `success` co Gmail moi, chua tung thanh cong tren target do.
- Tang `ytbQuotaDone` cua target theo `acceptedSuccessDelta`.
- Luu history Gmail/IP/time de admin thong ke.
- Cap nhat `deliveredQuantity = min(ytbQuotaDone, quantity)` cho client.
- Set target `done` khi `ytbQuotaDone >= executionQuantity`.
- Recalculate order va settle xu khi tat ca target done.

## 7. Trang Thai Va Lease

Claim target status:

| Status | Nghia |
| --- | --- |
| `claimed` | Maps da reserve quota cho worker |
| `running` | Worker dang chay |
| `partial` | Worker chay mot phan |
| `done` | Chunk da xong |
| `failed` | Chunk loi, phan quota chua success se duoc release |
| `expired` | Lease het han, Maps co the cap lai quota |

Worker nen PATCH `running` moi 30-60 giay cho chunk dai. Khi PATCH `running` hoac `claimed`, Maps gia han lease them 10 phut.

## 8. Vi Du Van Hanh

Target A can 260 like, da done 120, dang co 40 quota reserved active:

```text
available = 260 - 120 - 40 = 100
```

Worker claim:

```json
{
  "maxQuantityPerTarget": 50,
  "totalCapacity": 200
}
```

Maps cap:

```json
{
  "claimQuantity": 50,
  "quotaDone": 120,
  "quotaTotal": 260
}
```

Worker chay thanh cong 30 Gmail moi, PATCH:

```json
{
  "status": "running",
  "successCount": 30,
  "failedCount": 2
}
```

Maps cap nhat:

```text
ytbQuotaDone = 150
reserved con lai cua chunk = 50 - 30 = 20
```

Neu worker gui lai cung 30 Gmail do lan nua:

```text
acceptedSuccessDelta = 0
ytbQuotaDone khong tang
```

Neu worker chet va lease het, 20 quota con lai duoc claim lai.

## 9. Loi Va Auth

| HTTP | Nghia |
| --- | --- |
| 200 | Thanh cong |
| 400 | Payload sai |
| 401 | Sai/thieu API key |
| 403 | Worker khong so huu claim target hoac bi disable |
| 404 | Claim target khong ton tai |
| 410 | Endpoint cu `/jobs` da deprecated |
| 500 | Loi Maps, worker nen retry backoff |

## 10. Python Reference

```python
import os
import time
import requests

BASE_URL = os.environ["MAPS_BASE_URL"].rstrip("/")
API_KEY = os.environ["YOUTUBE_WORKER_API_KEY"]
WORKER_KEY = os.environ.get("YOUTUBE_WORKER_ID", "ytb-worker-01")

HEADERS = {
    "x-api-key": API_KEY,
}


def heartbeat():
    return requests.post(
        f"{BASE_URL}/api/youtube/worker/heartbeat",
        json={
            "workerKey": WORKER_KEY,
            "label": WORKER_KEY,
            "status": "online",
            "capabilities": ["like", "view", "comment", "sub"],
        },
        headers=HEADERS,
        timeout=20,
    ).json()


def claim():
    resp = requests.post(
        f"{BASE_URL}/api/youtube/worker/claims",
        json={
            "workerKey": WORKER_KEY,
            "serviceTypes": ["like", "view", "comment", "sub"],
            "limitTargets": 10,
            "maxQuantityPerTarget": 50,
            "totalCapacity": 200,
            "leaseSeconds": 600,
        },
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("targets", [])


def update_claim_target(claim_target_id, status, success_count, failed_count=0, history=None, error=None, detail=None):
    payload = {
        "workerKey": WORKER_KEY,
        "status": status,
        "successCount": success_count,
        "failedCount": failed_count,
        "history": history or [],
        "detail": detail or {},
    }
    if error:
        payload["error"] = error
    resp = requests.patch(
        f"{BASE_URL}/api/youtube/worker/claims/{claim_target_id}",
        json=payload,
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def run_target(target):
    # TODO: ytb tu chon Gmail local chua lam video nay.
    # target["claimQuantity"] la quota can chay trong chunk nay.
    # Report successCount tich luy, khong phai delta.
    update_claim_target(target["claimTargetId"], "running", 0)
    success = 0
    failed = 0
    history = []
    for i in range(target["claimQuantity"]):
        # TODO: goi runner thuc te cua ytb
        success += 1
        history.append({
            "gmail": f"acc{i}@gmail.com",
            "ip": "127.0.0.1",
            "status": "success",
        })
        if success % 10 == 0:
            update_claim_target(target["claimTargetId"], "running", success, failed, history)
            history = []
    update_claim_target(target["claimTargetId"], "done", success, failed, history)


def main():
    while True:
        try:
            heartbeat()
            targets = claim()
            if not targets:
                time.sleep(5)
                continue
            for target in targets:
                run_target(target)
        except Exception as exc:
            print(f"worker loop error: {exc}")
            time.sleep(10)


if __name__ == "__main__":
    main()
```

## 11. Checklist Cho Team ytb

- Dung `/api/youtube/worker/claims`, khong dung `/jobs`.
- Worker tu quan Gmail/proxy/session/local history.
- Worker chay theo `claimQuantity`.
- Report history Gmail/IP/time cho moi success; Maps chi count Gmail success unique.
- `successCount` chi de tham khao, khong thay the history Gmail.
- Poll moi 3-10 giay khi con capacity.
- PATCH `running` dinh ky cho chunk dai de gia han lease.
