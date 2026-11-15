import { useEffect, useState } from 'react';
import { Database, LogIn, LogOut, RefreshCw, ShieldCheck, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { formatKes } from '../data/schools';
import {
  fetchUserFirestoreTransactions,
  SHOP_ADMIN_EMAIL,
  signInWithGooglePopup,
  signOutUser,
} from '../lib/firebase';
import type { MpesaTransactionRecord } from '../types/uniform';

interface TransactionsModalProps {
  open: boolean;
  currentUser: User | null;
  onClose: () => void;
}

export function TransactionsModal({
  open,
  currentUser,
  onClose,
}: TransactionsModalProps) {
  const [serverRows, setServerRows] = useState<MpesaTransactionRecord[]>([]);
  const [cloudRows, setCloudRows] = useState<MpesaTransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'server' | 'firestore'>('server');

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mpesa/transactions');
      if (res.ok) {
        const json = (await res.json()) as { transactions: MpesaTransactionRecord[] };
        setServerRows(json.transactions || []);
      }
      if (currentUser?.emailVerified) {
        const cloud = await fetchUserFirestoreTransactions();
        setCloudRows(cloud);
      }
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLedger();
    }
  }, [open, currentUser]);

  if (!open) return null;

  const activeRows = tab === 'firestore' ? cloudRows : serverRows;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="M-Pesa Transaction Ledger and Order Database"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1B42] text-amber-400">
              <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                M-Pesa Transaction Ledger &amp; Orders
              </h2>
              <p className="text-xs text-slate-500">
                Every STK Push request, callback result, and receipt securely logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                <span className="max-w-[160px] truncate font-medium text-slate-800">
                  {currentUser.email === SHOP_ADMIN_EMAIL ? 'Admin · ' : ''}
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="inline-flex cursor-pointer items-center gap-1 font-semibold text-slate-600 hover:text-rose-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGooglePopup()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign in with Google (Cloud Sync)</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadLedger}
              aria-label="Refresh transaction ledger"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close transaction ledger"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Source Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTab('server')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                tab === 'server' ? 'bg-[#0B1B42] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Shop M-Pesa Database ({serverRows.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('firestore')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
                tab === 'firestore'
                  ? 'bg-[#0B1B42] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cloud Firestore ({cloudRows.length})
            </button>
          </div>

          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Daraja STK Callback &amp; Audit Logging Active</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'firestore' && !currentUser ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="font-display text-sm font-bold text-slate-900">
                Sign in with Google to view Cloud Firestore records
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Parents see their own orders and M-Pesa receipts; shop administrator (
                {SHOP_ADMIN_EMAIL}) sees all synced orders.
              </p>
              <button
                type="button"
                onClick={() => signInWithGooglePopup()}
                className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Continue with Google</span>
              </button>
            </div>
          ) : activeRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="font-display text-sm font-bold text-slate-900">
                No transactions logged yet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Add a uniform bundle to your cart and submit an M-Pesa Express STK Push to see live
                transaction audit records here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Receipt / Ref</th>
                    <th className="px-3.5 py-2.5 font-semibold">Parent &amp; Phone</th>
                    <th className="px-3.5 py-2.5 font-semibold">Amount</th>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                    <th className="px-3.5 py-2.5 font-semibold">CheckoutRequestID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeRows.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3">
                        <span className="block font-mono font-bold text-slate-900">
                          {tx.mpesaReceiptNumber || tx.orderId}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(tx.createdAt).toLocaleString('en-KE')}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="block font-medium text-slate-900">
                          {tx.customerName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600">
                          {tx.phoneNumber}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-slate-900 tabular-nums">
                        {formatKes(tx.amountKes)}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-block font-semibold ${
                            tx.status === 'COMPLETED'
                              ? 'text-emerald-700'
                              : tx.status === 'PENDING'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                        <span className="block max-w-[200px] truncate text-[11px] text-slate-500">
                          {tx.resultDesc}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                        {tx.checkoutRequestId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
