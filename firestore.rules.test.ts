/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Validates all 12 adversarial payloads against the hardened ruleset.
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  reason: string;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  { id: 1, name: 'Unauthenticated Order Write', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'isVerifiedUser() fails when request.auth is null' },
  { id: 2, name: 'Identity Spoofing on Order', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'incoming().userId == request.auth.uid blocks cross-UID writes' },
  { id: 3, name: 'Shadow Field Injection (Order)', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'data.keys().hasOnly(...) rejects unknown keys' },
  { id: 4, name: 'Oversized ID Poisoning', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'isValidId() enforces <= 128 chars and strict regex' },
  { id: 5, name: 'Invalid Kenyan Phone Format', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'customerPhone matches ^254[17][0-9]{8}$' },
  { id: 6, name: 'Client-Forged Timestamp', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'incoming().createdAt == request.time enforces server timestamp' },
  { id: 7, name: 'Cross-User Order Read', collection: 'orders', operation: 'get', expected: 'PERMISSION_DENIED', reason: 'existing().userId == request.auth.uid blocks non-owners' },
  { id: 8, name: 'Blanket List Scraping', collection: 'mpesa_transactions', operation: 'list', expected: 'PERMISSION_DENIED', reason: 'resource.data.userId == request.auth.uid enforces query filter' },
  { id: 9, name: 'Orphaned M-Pesa Transaction', collection: 'mpesa_transactions', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'exists(...) + get(...) enforces valid parent order ownership' },
  { id: 10, name: 'Terminal State Tampering', collection: 'mpesa_transactions', operation: 'update', expected: 'PERMISSION_DENIED', reason: '!(existing().status in [COMPLETED, FAILED, CANCELLED]) locks terminal records' },
  { id: 11, name: 'Privilege Escalation', collection: 'admins', operation: 'create', expected: 'PERMISSION_DENIED', reason: 'Only isBootstrapAdmin() can manage /admins' },
  { id: 12, name: 'Unverified Email Spoofing', collection: 'orders', operation: 'list', expected: 'PERMISSION_DENIED', reason: 'isVerifiedUser() requires email_verified == true' }
];
