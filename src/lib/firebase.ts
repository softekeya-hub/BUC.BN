import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { MpesaTransactionRecord } from '../types/uniform';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const SHOP_ADMIN_EMAIL = 'softekeya@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  if (user && user.emailVerified) {
    const userPath = `users/${user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: (user.displayName || 'Parent').slice(0, 120),
          email: (user.email || '').slice(0, 160),
          phoneNumber: (user.phoneNumber || '').slice(0, 20),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      // If document already exists, update displayName/updatedAt cleanly
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: (user.displayName || 'Parent').slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.WRITE, userPath);
      }
      if (error instanceof Error && !error.message.includes('permission')) {
        throw error;
      }
    }
  }
  return user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncOrderAndTransactionToFirestore(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  fulfilmentMethod: 'pickup' | 'boda';
  deliveryArea: string;
  paymentMethod: 'mpesa' | 'card' | 'whatsapp';
  subtotalKes: number;
  deliveryFeeKes: number;
  totalKes: number;
  itemsCount: number;
  itemsSummary: string;
  tx: MpesaTransactionRecord;
}): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return false;
  }

  const orderPath = `orders/${params.orderId}`;
  const txPath = `mpesa_transactions/${params.tx.transactionId}`;

  const cleanOrderId = params.orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanTxId = params.tx.transactionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanPhone = params.customerPhone.replace(/[^\d]/g, '').slice(0, 12);

  try {
    await setDoc(doc(db, 'orders', cleanOrderId), {
      orderId: cleanOrderId,
      userId: user.uid,
      customerName: params.customerName.slice(0, 120) || 'Parent',
      customerPhone: /^254[17][0-9]{8}$/.test(cleanPhone) ? cleanPhone : '254703919406',
      fulfilmentMethod: params.fulfilmentMethod,
      deliveryArea: params.deliveryArea.slice(0, 120) || 'Banana Hill Shop',
      paymentMethod: params.paymentMethod,
      subtotalKes: Math.max(0, Math.round(params.subtotalKes)),
      deliveryFeeKes: Math.max(0, Math.round(params.deliveryFeeKes)),
      totalKes: Math.max(0, Math.round(params.totalKes)),
      itemsCount: Math.max(1, Math.round(params.itemsCount)),
      itemsSummary: params.itemsSummary.slice(0, 2000),
      status: params.tx.status === 'COMPLETED' ? 'paid' : 'pending_payment',
      mpesaCheckoutRequestId: params.tx.checkoutRequestId.slice(0, 128),
      mpesaReceiptNumber: (params.tx.mpesaReceiptNumber || '').slice(0, 64),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orderPath);
  }

  try {
    await setDoc(doc(db, 'mpesa_transactions', cleanTxId), {
      transactionId: cleanTxId,
      orderId: cleanOrderId,
      userId: user.uid,
      merchantRequestId: params.tx.merchantRequestId.slice(0, 128),
      checkoutRequestId: params.tx.checkoutRequestId.slice(0, 128),
      phoneNumber: /^254[17][0-9]{8}$/.test(cleanPhone) ? cleanPhone : '254703919406',
      amountKes: Math.max(1, Math.round(params.tx.amountKes)),
      accountReference: params.tx.accountReference.slice(0, 64),
      transactionDesc: params.tx.transactionDesc.slice(0, 160),
      status: params.tx.status,
      resultCode: params.tx.resultCode,
      resultDesc: params.tx.resultDesc.slice(0, 255),
      mpesaReceiptNumber: (params.tx.mpesaReceiptNumber || '').slice(0, 64),
      transactionTimestamp: (params.tx.transactionTimestamp || '').slice(0, 40),
      mode: params.tx.mode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, txPath);
  }

  return true;
}

export async function updateFirestoreTransactionOutcome(params: {
  orderId: string;
  transactionId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber: string;
  transactionTimestamp: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const cleanOrderId = params.orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanTxId = params.transactionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);

  try {
    await updateDoc(doc(db, 'mpesa_transactions', cleanTxId), {
      status: params.status,
      resultCode: params.resultCode,
      resultDesc: params.resultDesc.slice(0, 255),
      mpesaReceiptNumber: params.mpesaReceiptNumber.slice(0, 64),
      transactionTimestamp: params.transactionTimestamp.slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mpesa_transactions/${cleanTxId}`);
  }

  try {
    await updateDoc(doc(db, 'orders', cleanOrderId), {
      status: params.status === 'COMPLETED' ? 'paid' : 'failed',
      mpesaReceiptNumber: params.mpesaReceiptNumber.slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${cleanOrderId}`);
  }
}

export async function fetchUserFirestoreTransactions(): Promise<MpesaTransactionRecord[]> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return [];

  const path = 'mpesa_transactions';
  try {
    const isBootstrapAdmin = user.email === SHOP_ADMIN_EMAIL;
    const q = isBootstrapAdmin
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(
          collection(db, path),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        transactionId: String(data.transactionId || d.id),
        orderId: String(data.orderId || ''),
        userId: String(data.userId || ''),
        customerName: user.displayName || 'Parent',
        merchantRequestId: String(data.merchantRequestId || ''),
        checkoutRequestId: String(data.checkoutRequestId || ''),
        phoneNumber: String(data.phoneNumber || ''),
        amountKes: Number(data.amountKes || 0),
        accountReference: String(data.accountReference || ''),
        transactionDesc: String(data.transactionDesc || ''),
        fulfilmentMethod: 'pickup',
        deliveryArea: 'Banana Hill Shop',
        paymentMethod: 'mpesa',
        itemsSummary: '',
        status: data.status || 'PENDING',
        resultCode: Number(data.resultCode ?? 0),
        resultDesc: String(data.resultDesc || ''),
        mpesaReceiptNumber: String(data.mpesaReceiptNumber || ''),
        transactionTimestamp: String(data.transactionTimestamp || ''),
        mode: data.mode || 'sandbox_daraja',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      } as MpesaTransactionRecord;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
