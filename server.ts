import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'mpesa_ledger.json');

export interface ServerTransactionRecord {
  transactionId: string;
  orderId: string;
  userId: string;
  customerName: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  phoneNumber: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
  fulfilmentMethod: 'pickup' | 'boda';
  deliveryArea: string;
  paymentMethod: 'mpesa' | 'card' | 'whatsapp';
  itemsSummary: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber: string;
  transactionTimestamp: string;
  mode: 'sandbox_daraja' | 'live_daraja';
  createdAt: string;
  updatedAt: string;
}

interface LedgerStore {
  transactions: ServerTransactionRecord[];
}

function ensureStore(): LedgerStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEDGER_FILE)) {
    const initial: LedgerStore = { transactions: [] };
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
    const parsed = JSON.parse(raw) as LedgerStore;
    if (!Array.isArray(parsed.transactions)) {
      return { transactions: [] };
    }
    return parsed;
  } catch {
    return { transactions: [] };
  }
}

function writeStore(store: LedgerStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${LEDGER_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpFile, LEDGER_FILE);
}

function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function formatDarajaTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function generateMpesaReceipt(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `UB${suffix}`;
}

function hasLiveDarajaConfig(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
}

async function getDarajaAccessToken(): Promise<string> {
  const baseUrl =
    process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    }
  );
  if (!response.ok) {
    throw new Error(`Daraja OAuth failed with status ${response.status}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'Banana Uniform Centre API',
      darajaMode: hasLiveDarajaConfig() ? 'live_daraja' : 'sandbox_daraja',
    });
  });

  // Initiate M-Pesa Express (STK Push)
  app.post('/api/mpesa/stkpush', async (req, res) => {
    try {
      const {
        phone,
        amountKes,
        orderId,
        userId,
        customerName,
        fulfilmentMethod,
        deliveryArea,
        itemsSummary,
        accountReference,
      } = req.body as {
        phone?: string;
        amountKes?: number;
        orderId?: string;
        userId?: string;
        customerName?: string;
        fulfilmentMethod?: 'pickup' | 'boda';
        deliveryArea?: string;
        itemsSummary?: string;
        accountReference?: string;
      };

      const normalizedPhone = normalizeKenyanPhone(String(phone || ''));
      if (!normalizedPhone) {
        res.status(400).json({
          error: 'Enter a valid Kenyan mobile number (e.g. 0712 345 678 or 254712345678).',
        });
        return;
      }

      const amount = Math.round(Number(amountKes || 0));
      if (!Number.isFinite(amount) || amount < 1) {
        res.status(400).json({ error: 'Order amount must be at least KES 1.' });
        return;
      }

      const cleanOrderId = String(orderId || `BUC_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanRef = String(accountReference || cleanOrderId).slice(0, 24);
      const timestamp = formatDarajaTimestamp();
      const nowIso = new Date().toISOString();

      let merchantRequestId = `BUC-MR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      let checkoutRequestId = `ws_CO_${timestamp}${crypto.randomInt(100000, 999999)}`;
      let mode: 'sandbox_daraja' | 'live_daraja' = 'sandbox_daraja';
      let customerMessage = 'Success. Request accepted for processing';

      if (hasLiveDarajaConfig()) {
        mode = 'live_daraja';
        const baseUrl =
          process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
        const shortcode = process.env.MPESA_SHORTCODE!;
        const passkey = process.env.MPESA_PASSKEY!;
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
        const callbackBase = process.env.MPESA_CALLBACK_URL || process.env.APP_URL || `http://localhost:${PORT}`;
        const callbackUrl = callbackBase.endsWith('/api/mpesa/callback')
          ? callbackBase
          : `${callbackBase.replace(/\/$/, '')}/api/mpesa/callback`;

        const token = await getDarajaAccessToken();
        const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: normalizedPhone,
            PartyB: shortcode,
            PhoneNumber: normalizedPhone,
            CallBackURL: callbackUrl,
            AccountReference: cleanRef,
            TransactionDesc: 'Banana Uniform Centre Order',
          }),
        });

        const stkJson = (await stkRes.json()) as {
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          ResponseCode?: string;
          CustomerMessage?: string;
          errorMessage?: string;
        };

        if (!stkRes.ok || stkJson.ResponseCode !== '0') {
          res.status(502).json({
            error: stkJson.errorMessage || 'Safaricom Daraja STK Push request failed.',
          });
          return;
        }

        merchantRequestId = stkJson.MerchantRequestID || merchantRequestId;
        checkoutRequestId = stkJson.CheckoutRequestID || checkoutRequestId;
        customerMessage = stkJson.CustomerMessage || customerMessage;
      }

      const transactionId = `tx_${crypto.randomBytes(6).toString('hex')}`;
      const record: ServerTransactionRecord = {
        transactionId,
        orderId: cleanOrderId,
        userId: String(userId || 'guest_parent').replace(/[^a-zA-Z0-9_-]/g, ''),
        customerName: String(customerName || 'Parent / Guardian').slice(0, 120),
        merchantRequestId,
        checkoutRequestId,
        phoneNumber: normalizedPhone,
        amountKes: amount,
        accountReference: cleanRef,
        transactionDesc: 'Banana Uniform Centre Uniform Kit',
        fulfilmentMethod: fulfilmentMethod === 'boda' ? 'boda' : 'pickup',
        deliveryArea: String(deliveryArea || 'Banana Hill Shop').slice(0, 120),
        paymentMethod: 'mpesa',
        itemsSummary: String(itemsSummary || 'School Uniform Bundle').slice(0, 1800),
        status: 'PENDING',
        resultCode: 1037,
        resultDesc: 'STK Push sent to customer handset. Awaiting M-Pesa PIN.',
        mpesaReceiptNumber: '',
        transactionTimestamp: timestamp,
        mode,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const store = ensureStore();
      store.transactions.unshift(record);
      writeStore(store);

      res.json({
        success: true,
        CustomerMessage: customerMessage,
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
        transaction: record,
      });
    } catch (err) {
      console.error('STK Push Error:', err);
      res.status(500).json({ error: 'Unable to initiate M-Pesa STK Push right now.' });
    }
  });

  // Safaricom Daraja STK Callback Webhook
  app.post('/api/mpesa/callback', (req, res) => {
    try {
      const stkCallback = req.body?.Body?.stkCallback as
        | {
            MerchantRequestID?: string;
            CheckoutRequestID?: string;
            ResultCode?: number;
            ResultDesc?: string;
            CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
          }
        | undefined;

      if (!stkCallback?.CheckoutRequestID) {
        res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });
        return;
      }

      const store = ensureStore();
      const idx = store.transactions.findIndex(
        (t) => t.checkoutRequestId === stkCallback.CheckoutRequestID
      );

      if (idx !== -1) {
        const current = store.transactions[idx];
        const code = Number(stkCallback.ResultCode ?? 1);
        const items = stkCallback.CallbackMetadata?.Item || [];
        const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
        const dateItem = items.find((i) => i.Name === 'TransactionDate');

        store.transactions[idx] = {
          ...current,
          status: code === 0 ? 'COMPLETED' : code === 1032 ? 'CANCELLED' : 'FAILED',
          resultCode: code,
          resultDesc: String(stkCallback.ResultDesc || (code === 0 ? 'The service request is processed successfully.' : 'Transaction failed')),
          mpesaReceiptNumber: receiptItem?.Value ? String(receiptItem.Value) : current.mpesaReceiptNumber,
          transactionTimestamp: dateItem?.Value ? String(dateItem.Value) : current.transactionTimestamp,
          updatedAt: new Date().toISOString(),
        };
        writeStore(store);
      }

      res.json({ ResultCode: 0, ResultDesc: 'Callback received successfully' });
    } catch (err) {
      console.error('Daraja Callback Error:', err);
      res.status(500).json({ ResultCode: 1, ResultDesc: 'Server error' });
    }
  });

  // Sandbox confirmation / cancellation endpoint (simulates handset PIN response via callback format)
  app.post('/api/mpesa/simulate-confirm', (req, res) => {
    const { checkoutRequestId, action } = req.body as {
      checkoutRequestId?: string;
      action?: 'confirm' | 'cancel';
    };

    if (!checkoutRequestId) {
      res.status(400).json({ error: 'checkoutRequestId is required.' });
      return;
    }

    const store = ensureStore();
    const idx = store.transactions.findIndex((t) => t.checkoutRequestId === checkoutRequestId);
    if (idx === -1) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    const tx = store.transactions[idx];
    if (tx.mode === 'live_daraja') {
      res.status(400).json({ error: 'Cannot simulate confirmation for live Daraja transactions.' });
      return;
    }

    const isConfirm = action !== 'cancel';
    const receipt = isConfirm ? generateMpesaReceipt() : '';
    const updated: ServerTransactionRecord = {
      ...tx,
      status: isConfirm ? 'COMPLETED' : 'CANCELLED',
      resultCode: isConfirm ? 0 : 1032,
      resultDesc: isConfirm
        ? 'The service request is processed successfully.'
        : 'Request cancelled by user on M-Pesa handset prompt.',
      mpesaReceiptNumber: receipt,
      transactionTimestamp: formatDarajaTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    store.transactions[idx] = updated;
    writeStore(store);

    res.json({ ok: true, transaction: updated });
  });

  // Query transaction status by CheckoutRequestID
  app.get('/api/mpesa/query/:checkoutRequestId', (req, res) => {
    const store = ensureStore();
    const tx = store.transactions.find(
      (t) => t.checkoutRequestId === req.params.checkoutRequestId
    );
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }
    res.json({ transaction: tx });
  });

  // Log Card or WhatsApp orders to the server transaction ledger
  app.post('/api/orders', (req, res) => {
    try {
      const {
        orderId,
        userId,
        customerName,
        phone,
        amountKes,
        fulfilmentMethod,
        deliveryArea,
        paymentMethod,
        itemsSummary,
      } = req.body as {
        orderId?: string;
        userId?: string;
        customerName?: string;
        phone?: string;
        amountKes?: number;
        fulfilmentMethod?: 'pickup' | 'boda';
        deliveryArea?: string;
        paymentMethod?: 'card' | 'whatsapp';
        itemsSummary?: string;
      };

      const normalizedPhone = normalizeKenyanPhone(String(phone || '0703919406')) || '254703919406';
      const nowIso = new Date().toISOString();
      const timestamp = formatDarajaTimestamp();
      const cleanOrderId = String(orderId || `BUC_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const method = paymentMethod === 'card' ? 'card' : 'whatsapp';

      const record: ServerTransactionRecord = {
        transactionId: `tx_${crypto.randomBytes(6).toString('hex')}`,
        orderId: cleanOrderId,
        userId: String(userId || 'guest_parent').replace(/[^a-zA-Z0-9_-]/g, ''),
        customerName: String(customerName || 'Parent / Guardian').slice(0, 120),
        merchantRequestId: `ORD-${method.toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        checkoutRequestId: `ORD_${timestamp}_${crypto.randomInt(1000, 9999)}`,
        phoneNumber: normalizedPhone,
        amountKes: Math.round(Number(amountKes || 0)),
        accountReference: cleanOrderId.slice(0, 24),
        transactionDesc:
          method === 'card'
            ? 'Banana Uniform Centre Card Checkout'
            : 'Banana Uniform Centre WhatsApp Order',
        fulfilmentMethod: fulfilmentMethod === 'boda' ? 'boda' : 'pickup',
        deliveryArea: String(deliveryArea || 'Banana Hill Shop').slice(0, 120),
        paymentMethod: method,
        itemsSummary: String(itemsSummary || 'School Uniform Bundle').slice(0, 1800),
        status: method === 'card' ? 'COMPLETED' : 'PENDING',
        resultCode: method === 'card' ? 0 : 1001,
        resultDesc:
          method === 'card'
            ? 'Card payment authorized & order queued for fulfilment.'
            : 'Order dispatched to Banana Uniform Centre WhatsApp (+254 703 919406).',
        mpesaReceiptNumber: method === 'card' ? `CARD-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : '',
        transactionTimestamp: timestamp,
        mode: 'sandbox_daraja',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const store = ensureStore();
      store.transactions.unshift(record);
      writeStore(store);
      res.json({ ok: true, transaction: record });
    } catch (err) {
      console.error('Order log error:', err);
      res.status(500).json({ error: 'Unable to log order.' });
    }
  });

  // Fetch all logged transactions from the database ledger
  app.get('/api/mpesa/transactions', (_req, res) => {
    const store = ensureStore();
    res.json({ transactions: store.transactions });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Banana Uniform Centre running on http://localhost:${PORT}`);
  });
}

startServer();
