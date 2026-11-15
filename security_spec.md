# Security Specification — Banana Uniform Centre

## 1. Data Invariants
1. **Strict Ownership**: Every `users/{userId}`, `orders/{orderId}`, and `mpesa_transactions/{transactionId}` document is bound to `userId == request.auth.uid` (unless read/managed by a verified Admin whose email is `softekeya@gmail.com` with `email_verified == true` or whose UID exists in `/admins/{uid}`).
2. **Order-Transaction Relational Integrity**: An `mpesa_transactions/{transactionId}` document can only be created if the referenced `/orders/{orderId}` exists and belongs to the same `request.auth.uid`.
3. **Immutable Identifiers & Timestamps**: `userId`, `orderId`, `transactionId`, and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. **Terminal State Locking**: Once an `Order` reaches `completed` or `failed`, or an `MpesaTransaction` reaches `COMPLETED`, `FAILED`, or `CANCELLED`, non-admin users cannot mutate the record.
5. **PII Isolation & Query Enforcement**: No blanket `isSignedIn()` reads or `allow list`. Queries against `/orders` and `/mpesa_transactions` must match `resource.data.userId == request.auth.uid` or `isAdmin()`.
6. **Strict Schema & Bounds**: All IDs match `^[a-zA-Z0-9_\\-]+$` and max 128 chars. Phone numbers match `^254[17][0-9]{8}$`. Monetary amounts are positive numbers (`>= 0` and `<= 500000`). No shadow fields allowed (`hasOnly`).

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Order Write**: Unauthenticated request creating `/orders/ord_1`.
2. **Identity Spoofing on Order**: Authenticated user `uid_A` creating `/orders/ord_2` with `userId: "uid_B"`.
3. **Shadow Field Injection (Order)**: Authenticated user `uid_A` creating `/orders/ord_3` with extra `"isAdminOverride": true`.
4. **Oversized ID Poisoning**: Creating `/orders/<150-char-id>` exceeding 128-char `isValidId()` guard.
5. **Invalid Kenyan Phone Format**: Creating `/orders/ord_4` with `customerPhone: "0712345678"` instead of `^254[17][0-9]{8}$`.
6. **Client-Forged Timestamp**: Creating `/orders/ord_5` with `createdAt` set to a past string instead of `request.time`.
7. **Cross-User Order Read**: User `uid_B` calling `get` on `/orders/ord_1` owned by `uid_A`.
8. **Blanket List Scraping**: User `uid_B` listing `/mpesa_transactions` without `where('userId', '==', uid_B)`.
9. **Orphaned M-Pesa Transaction**: Creating `/mpesa_transactions/tx_1` referencing a nonexistent `/orders/missing_order`.
10. **Terminal State Tampering**: Non-admin user updating an `mpesa_transactions` document whose existing `status` is `"COMPLETED"` back to `"PENDING"` or changing `amountKes`.
11. **Privilege Escalation**: Non-admin user creating `/admins/uid_A` with `role: "admin"`.
12. **Unverified Email Spoofing**: User with `email: "softekeya@gmail.com"` and `email_verified: false` attempting admin list read.
