import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { formatKes } from '../data/schools';
import {
  signInWithGooglePopup,
  syncOrderAndTransactionToFirestore,
  updateFirestoreTransactionOutcome,
} from '../lib/firebase';
import type {
  CartItem,
  FulfilmentMethod,
  MpesaTransactionRecord,
  PaymentMethod,
} from '../types/uniform';

interface CartCheckoutDrawerProps {
  open: boolean;
  items: CartItem[];
  currentUser: User | null;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onTransactionRecorded: () => void;
}

const DELIVERY_AREAS = [
  'Ruaka Town / Two Rivers',
  'Muchatha / Guango Rd',
  'Ndenderu / Gitaru Rd',
  'Kiambu Rd / Runda Border',
  'Limuru Rd / Banana–Raini',
  'Gachie / Kihara',
  'Kiambaa / Cianda',
];

export function CartCheckoutDrawer({
  open,
  items,
  currentUser,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onTransactionRecorded,
}: CartCheckoutDrawerProps) {
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>('pickup');
  const [deliveryArea, setDeliveryArea] = useState<string>(DELIVERY_AREAS[0]);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [customerName, setCustomerName] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTx, setActiveTx] = useState<MpesaTransactionRecord | null>(null);
  const [cloudSynced, setCloudSynced] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName && !customerName) {
      setCustomerName(currentUser.displayName);
    }
  }, [currentUser, customerName]);

  // Group items by School & Student Gender
  const groupedCart = useMemo(() => {
    const groups = new Map<
      string,
      { groupLabel: string; schoolName: string; gender: string; items: CartItem[]; subtotal: number }
    >();
    for (const it of items) {
      const id = `${it.schoolId}::${it.gender}`;
      const existing = groups.get(id);
      if (existing) {
        existing.items.push(it);
        existing.subtotal += it.unitPriceKes * it.quantity;
      } else {
        groups.set(id, {
          groupLabel: `${it.schoolName} – ${it.gender} Kit`,
          schoolName: it.schoolName,
          gender: it.gender,
          items: [it],
          subtotal: it.unitPriceKes * it.quantity,
        });
      }
    }
    return Array.from(groups.entries());
  }, [items]);

  const subtotalKes = items.reduce((s, it) => s + it.unitPriceKes * it.quantity, 0);
  const deliveryFeeKes = fulfilment === 'boda' && items.length > 0 ? 250 : 0;
  const totalKes = subtotalKes + deliveryFeeKes;

  const itemsSummaryText = useMemo(() => {
    return groupedCart
      .map(
        ([, g]) =>
          `${g.groupLabel}: ${g.items
            .map((i) => `${i.itemName} (${i.size}) x${i.quantity}`)
            .join(', ')}`
      )
      .join(' | ');
  }, [groupedCart]);

  // Poll Daraja query endpoint while M-Pesa STK Push is pending
  useEffect(() => {
    if (!activeTx || activeTx.paymentMethod !== 'mpesa' || activeTx.status !== 'PENDING') {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/query/${activeTx.checkoutRequestId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { transaction: MpesaTransactionRecord };
        if (data.transaction.status !== 'PENDING') {
          setActiveTx(data.transaction);
          onTransactionRecorded();
          if (currentUser?.emailVerified) {
            await updateFirestoreTransactionOutcome({
              orderId: data.transaction.orderId,
              transactionId: data.transaction.transactionId,
              status: data.transaction.status,
              resultCode: data.transaction.resultCode,
              resultDesc: data.transaction.resultDesc,
              mpesaReceiptNumber: data.transaction.mpesaReceiptNumber || '',
              transactionTimestamp: data.transaction.transactionTimestamp || '',
            });
          }
          if (data.transaction.status === 'COMPLETED') {
            onClearCart();
          }
        }
      } catch {
        // Silent retry
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [activeTx, currentUser, onClearCart, onTransactionRecorded]);

  const buildWhatsAppText = () => {
    const lines: string[] = [
      '*BANANA UNIFORM CENTRE — NEW ORDER*',
      `Parent/Guardian: ${customerName || 'Parent'}`,
      `Phone: ${mpesaPhone || 'Not provided'}`,
      `Fulfilment: ${
        fulfilment === 'pickup'
          ? 'In-Store Pickup (Banana Hill Shop – Free, Ready in 2 Hrs)'
          : `Same-Day Boda Rider (${deliveryArea}${deliveryNotes ? ` - ${deliveryNotes}` : ''}) – KES 250`
      }`,
      '',
      '*Uniform Kits:*',
    ];
    for (const [, g] of groupedCart) {
      lines.push(`• *${g.groupLabel}* (${formatKes(g.subtotal)})`);
      for (const it of g.items) {
        lines.push(
          `  - ${it.itemName} | ${it.size} | Qty: ${it.quantity} | ${formatKes(
            it.unitPriceKes * it.quantity
          )}`
        );
      }
    }
    lines.push('');
    lines.push(`Subtotal: ${formatKes(subtotalKes)}`);
    lines.push(`Delivery: ${formatKes(deliveryFeeKes)}`);
    lines.push(`*Total: ${formatKes(totalKes)}*`);
    lines.push('Note: Confirm final garment shade & fit at Banana Hill store.');
    return lines.join('\n');
  };

  const handleCheckout = async () => {
    setErrorMsg(null);
    if (items.length === 0) return;

    const cleanName = customerName.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter the parent or guardian full name.');
      return;
    }

    const orderId = `BUC_${Date.now()}`;
    const areaLabel =
      fulfilment === 'pickup'
        ? 'Banana Hill Shop Pickup'
        : `${deliveryArea}${deliveryNotes ? ` (${deliveryNotes})` : ''}`;

    if (paymentMethod === 'whatsapp') {
      setSubmitting(true);
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            userId: currentUser?.uid || 'guest_parent',
            customerName: cleanName,
            phone: mpesaPhone || '0703919406',
            amountKes: totalKes,
            fulfilmentMethod: fulfilment,
            deliveryArea: areaLabel,
            paymentMethod: 'whatsapp',
            itemsSummary: itemsSummaryText,
          }),
        });
        const json = (await res.json()) as { transaction?: MpesaTransactionRecord };
        if (json.transaction) {
          setActiveTx(json.transaction);
          onTransactionRecorded();
          if (currentUser?.emailVerified) {
            const synced = await syncOrderAndTransactionToFirestore({
              orderId,
              customerName: cleanName,
              customerPhone: json.transaction.phoneNumber,
              fulfilmentMethod: fulfilment,
              deliveryArea: areaLabel,
              paymentMethod: 'whatsapp',
              subtotalKes,
              deliveryFeeKes,
              totalKes,
              itemsCount: items.reduce((s, i) => s + i.quantity, 0),
              itemsSummary: itemsSummaryText,
              tx: json.transaction,
            });
            setCloudSynced(synced);
          }
        }
        const encoded = encodeURIComponent(buildWhatsAppText());
        window.location.assign(`https://wa.me/254703919406?text=${encoded}`);
      } catch {
        setErrorMsg('Could not prepare WhatsApp order. Please call +254 703 919406.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (paymentMethod === 'card') {
      setSubmitting(true);
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            userId: currentUser?.uid || 'guest_parent',
            customerName: cleanName,
            phone: mpesaPhone || '0703919406',
            amountKes: totalKes,
            fulfilmentMethod: fulfilment,
            deliveryArea: areaLabel,
            paymentMethod: 'card',
            itemsSummary: itemsSummaryText,
          }),
        });
        const json = (await res.json()) as { transaction?: MpesaTransactionRecord; error?: string };
        if (!res.ok || !json.transaction) {
          setErrorMsg(json.error || 'Card checkout failed.');
          return;
        }
        setActiveTx(json.transaction);
        onTransactionRecorded();
        if (currentUser?.emailVerified) {
          const synced = await syncOrderAndTransactionToFirestore({
            orderId,
            customerName: cleanName,
            customerPhone: json.transaction.phoneNumber,
            fulfilmentMethod: fulfilment,
            deliveryArea: areaLabel,
            paymentMethod: 'card',
            subtotalKes,
            deliveryFeeKes,
            totalKes,
            itemsCount: items.reduce((s, i) => s + i.quantity, 0),
            itemsSummary: itemsSummaryText,
            tx: json.transaction,
          });
          setCloudSynced(synced);
        }
        onClearCart();
      } catch {
        setErrorMsg('Unable to process card checkout.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // M-Pesa Express (STK Push)
    if (!mpesaPhone.trim()) {
      setErrorMsg('Enter your Safaricom M-Pesa phone number (e.g. 0712 345 678).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: mpesaPhone,
          amountKes: totalKes,
          orderId,
          userId: currentUser?.uid || 'guest_parent',
          customerName: cleanName,
          fulfilmentMethod: fulfilment,
          deliveryArea: areaLabel,
          itemsSummary: itemsSummaryText,
          accountReference: groupedCart[0]?.[1].schoolName.slice(0, 18) || orderId,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        transaction?: MpesaTransactionRecord;
      };
      if (!res.ok || !json.transaction) {
        setErrorMsg(json.error || 'Failed to initiate M-Pesa STK Push.');
        return;
      }

      setActiveTx(json.transaction);
      onTransactionRecorded();

      if (currentUser?.emailVerified) {
        const synced = await syncOrderAndTransactionToFirestore({
          orderId,
          customerName: cleanName,
          customerPhone: json.transaction.phoneNumber,
          fulfilmentMethod: fulfilment,
          deliveryArea: areaLabel,
          paymentMethod: 'mpesa',
          subtotalKes,
          deliveryFeeKes,
          totalKes,
          itemsCount: items.reduce((s, i) => s + i.quantity, 0),
          itemsSummary: itemsSummaryText,
          tx: json.transaction,
        });
        setCloudSynced(synced);
      }
    } catch {
      setErrorMsg('Network error reaching M-Pesa gateway. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxPhoneAction = async (action: 'confirm' | 'cancel') => {
    if (!activeTx) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/mpesa/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId: activeTx.checkoutRequestId,
          action,
        }),
      });
      const json = (await res.json()) as { transaction?: MpesaTransactionRecord };
      if (json.transaction) {
        setActiveTx(json.transaction);
        onTransactionRecorded();
        if (currentUser?.emailVerified && json.transaction.status !== 'PENDING') {
          await updateFirestoreTransactionOutcome({
            orderId: json.transaction.orderId,
            transactionId: json.transaction.transactionId,
            status: json.transaction.status,
            resultCode: json.transaction.resultCode,
            resultDesc: json.transaction.resultDesc,
            mpesaReceiptNumber: json.transaction.mpesaReceiptNumber || '',
            transactionTimestamp: json.transaction.transactionTimestamp || '',
          });
        }
        if (json.transaction.status === 'COMPLETED') {
          onClearCart();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncToGoogleAccount = async () => {
    if (!activeTx) return;
    try {
      const user = await signInWithGooglePopup();
      if (user?.emailVerified) {
        const synced = await syncOrderAndTransactionToFirestore({
          orderId: activeTx.orderId,
          customerName: activeTx.customerName,
          customerPhone: activeTx.phoneNumber,
          fulfilmentMethod: activeTx.fulfilmentMethod,
          deliveryArea: activeTx.deliveryArea,
          paymentMethod: activeTx.paymentMethod,
          subtotalKes: Math.max(0, activeTx.amountKes - (activeTx.fulfilmentMethod === 'boda' ? 250 : 0)),
          deliveryFeeKes: activeTx.fulfilmentMethod === 'boda' ? 250 : 0,
          totalKes: activeTx.amountKes,
          itemsCount: 1,
          itemsSummary: activeTx.itemsSummary || 'Uniform Kit',
          tx: activeTx,
        });
        setCloudSynced(synced);
      }
    } catch {
      setErrorMsg('Google sign-in cancelled. Receipt remains saved in shop database.');
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart and M-Pesa Checkout"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {activeTx ? 'M-Pesa & Order Confirmation' : 'Uniform Bag & Local Checkout'}
            </h2>
            <p className="text-xs text-slate-500">
              Banana Uniform Centre · Banana Hill, Ruaka–Limuru Rd
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTx(null);
              onClose();
            }}
            aria-label="Close cart drawer"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTx ? (
            /* Active M-Pesa / Order Receipt & STK Push Status */
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-5 ${
                  activeTx.status === 'COMPLETED'
                    ? 'border-emerald-200 bg-emerald-50'
                    : activeTx.status === 'PENDING'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {activeTx.status === 'COMPLETED' ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                  ) : activeTx.status === 'PENDING' ? (
                    <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-amber-700" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" />
                  )}
                  <div>
                    <p className="font-display text-base font-bold text-slate-900">
                      {activeTx.status === 'COMPLETED'
                        ? 'Payment Verified & Logged in Database'
                        : activeTx.status === 'PENDING'
                          ? 'M-Pesa STK Push Sent to Your Phone'
                          : 'Transaction Cancelled / Failed'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700">
                      {activeTx.resultDesc}
                    </p>
                  </div>
                </div>

                {activeTx.status === 'PENDING' && activeTx.paymentMethod === 'mpesa' && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3.5">
                    <p className="text-xs font-semibold text-slate-900">
                      Check handset <span className="font-mono">{activeTx.phoneNumber}</span> for the
                      Safaricom M-Pesa PIN prompt for{' '}
                      <span className="font-mono">{formatKes(activeTx.amountKes)}</span>.
                    </p>
                    {activeTx.mode === 'sandbox_daraja' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSandboxPhoneAction('confirm')}
                          className="cursor-pointer rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Confirm M-Pesa PIN on Phone
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSandboxPhoneAction('cancel')}
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel Prompt
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Logged Transaction Details Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-display font-bold text-slate-900">
                    Database Transaction Record
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {activeTx.mode === 'live_daraja' ? 'Daraja Live' : 'Daraja Sandbox'}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <dt className="text-slate-500">Order Reference</dt>
                    <dd className="font-mono font-semibold text-slate-900">{activeTx.orderId}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Amount Paid</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatKes(activeTx.amountKes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">M-Pesa Receipt No.</dt>
                    <dd className="font-mono font-semibold text-emerald-700">
                      {activeTx.mpesaReceiptNumber || 'Awaiting PIN'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Phone Number</dt>
                    <dd className="font-mono text-slate-900">{activeTx.phoneNumber}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">CheckoutRequestID</dt>
                    <dd className="break-all font-mono text-[11px] text-slate-700">
                      {activeTx.checkoutRequestId}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Fulfilment</dt>
                    <dd className="font-medium text-slate-900">{activeTx.deliveryArea}</dd>
                  </div>
                </dl>
              </div>

              {!currentUser && !cloudSynced && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs">
                  <span className="text-blue-950">
                    Want this M-Pesa receipt synced to your personal Google cloud history?
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncToGoogleAccount}
                    className="cursor-pointer rounded-lg bg-blue-900 px-3 py-1.5 font-semibold text-white hover:bg-blue-800"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}

              {(currentUser || cloudSynced) && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Synced securely to Firebase Firestore &amp; Shop Ledger.</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => setActiveTx(null)}
                className="w-full cursor-pointer rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Shopping Bag
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Smartphone className="h-6 w-6" />
              </div>
              <p className="font-display text-base font-bold text-slate-900">
                Your uniform bag is empty
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Select any school from our 30-school directory to build a Boys or Girls uniform kit.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped Cart Items by School & Student Gender */}
              <div className="space-y-4">
                {groupedCart.map(([groupId, group]) => (
                  <div
                    key={groupId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <h3 className="font-display text-xs font-bold text-blue-950 sm:text-sm">
                        {group.groupLabel}
                      </h3>
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatKes(group.subtotal)}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {group.items.map((it) => (
                        <li
                          key={it.key}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">{it.itemName}</p>
                            <p className="text-slate-500">
                              {it.size} <span aria-hidden="true">·</span>{' '}
                              <span className="font-mono tabular-nums">
                                {formatKes(it.unitPriceKes)}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex items-center rounded-md border border-slate-200">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(it.key, -1)}
                                aria-label="Decrease quantity"
                                className="flex h-7 w-7 cursor-pointer items-center justify-center text-slate-600 hover:bg-slate-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center font-mono text-xs font-semibold tabular-nums">
                                {it.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(it.key, 1)}
                                aria-label="Increase quantity"
                                className="flex h-7 w-7 cursor-pointer items-center justify-center text-slate-600 hover:bg-slate-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(it.key)}
                              aria-label={`Remove ${it.itemName}`}
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Fulfilment Toggle */}
              <div className="space-y-2.5">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  1. Fulfilment Method
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFulfilment('pickup')}
                    className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${
                      fulfilment === 'pickup'
                        ? 'border-blue-900 bg-blue-50/70'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <MapPin className="h-3.5 w-3.5 text-blue-900" />
                        In-Store Pickup
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-700">FREE</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Banana Hill Shop · Ready in 2 Hrs
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfilment('boda')}
                    className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${
                      fulfilment === 'boda'
                        ? 'border-blue-900 bg-blue-50/70'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Truck className="h-3.5 w-3.5 text-amber-600" />
                        Same-Day Boda Rider
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        KES 250
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Ruaka, Muchatha, Ndenderu, Kiambu &amp; Limuru Rd
                    </p>
                  </button>
                </div>

                {fulfilment === 'boda' && (
                  <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-slate-700">Delivery Zone</span>
                      <select
                        value={deliveryArea}
                        onChange={(e) => setDeliveryArea(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-900"
                      >
                        {DELIVERY_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-slate-700">
                        Estate / Stage Landmark
                      </span>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Near Quickmart Ruaka"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Payment Method & Parent Info */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  2. Parent Details &amp; Payment Method
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                      paymentMethod === 'mpesa'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 text-emerald-700" />
                    <span>M-Pesa STK</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-blue-900 bg-blue-50 text-blue-950'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-blue-900" />
                    <span>Card Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('whatsapp')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                      paymentMethod === 'whatsapp'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-slate-700">
                      Parent / Guardian Name
                    </span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Mary Wanjiku"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-900 focus:outline-none"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-slate-700">
                      {paymentMethod === 'mpesa' ? 'M-Pesa Safaricom Number' : 'Contact Phone'}
                    </span>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-900 focus:outline-none"
                    />
                  </label>
                </div>

                {errorMsg && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Checkout Footer */}
        {!activeTx && items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            <div className="mb-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Uniforms Subtotal</span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">
                  {formatKes(subtotalKes)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{fulfilment === 'pickup' ? 'Banana Hill Pickup' : 'Boda Rider Delivery'}</span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">
                  {deliveryFeeKes === 0 ? 'Free' : formatKes(deliveryFeeKes)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                <span>Total Payable</span>
                <span className="font-mono text-blue-900 tabular-nums">{formatKes(totalKes)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0B1B42] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#162C63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : paymentMethod === 'mpesa' ? (
                <>
                  <Smartphone className="h-4 w-4 text-amber-400" />
                  <span>Send M-Pesa Express STK Push ({formatKes(totalKes)})</span>
                </>
              ) : paymentMethod === 'card' ? (
                <>
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  <span>Pay with Card ({formatKes(totalKes)})</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 text-amber-400" />
                  <span>Send Order via WhatsApp ({formatKes(totalKes)})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
