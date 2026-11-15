export type UniformAngle = 'front' | 'side' | 'back';

export type SchoolLevel = 'Primary & Junior School (CBC)' | 'Senior / High Schools';

export type RegionTag =
  | 'Banana Hill & Ruaka'
  | 'Muchatha & Ndenderu'
  | 'Kiambaa & Limuru Rd';

export type GenderType = 'Mixed' | 'Boys' | 'Girls';

export type StudentGender = 'Boys' | 'Girls';

export type SizeCategory = 'garment' | 'bottom' | 'shoe' | 'onesize';

export interface AngleDetails {
  front: string;
  side: string;
  back: string;
}

export interface UniformItem {
  id: string;
  name: string;
  category: 'Top' | 'Bottom' | 'Knitwear' | 'Blazer' | 'Tie' | 'Socks' | 'Shoes' | 'Games / PE';
  priceKes: number;
  sizeType: SizeCategory;
  defaultInclude: boolean;
  note?: string;
  angleNotes: AngleDetails;
}

export interface SchoolColors {
  primaryHex: string;
  primaryName: string;
  shirtHex: string;
  shirtName: string;
  bottomHex: string;
  bottomName: string;
  knitHex: string;
  knitName: string;
  tieHex: string;
  tieAccentHex: string;
  hasBlazer?: boolean;
}

export interface School {
  id: string;
  number: number;
  name: string;
  location: string;
  regionTag: RegionTag;
  level: SchoolLevel;
  genderType: GenderType;
  colors: SchoolColors;
  boysKit: UniformItem[];
  girlsKit: UniformItem[];
}

export interface CartItem {
  key: string; // schoolId + gender + itemId + size
  schoolId: string;
  schoolName: string;
  gender: StudentGender;
  itemId: string;
  itemName: string;
  category: UniformItem['category'];
  size: string;
  quantity: number;
  unitPriceKes: number;
  angleNotes: AngleDetails;
}

export type FulfilmentMethod = 'pickup' | 'boda';
export type PaymentMethod = 'mpesa' | 'card' | 'whatsapp';

export interface MpesaTransactionRecord {
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
  fulfilmentMethod: FulfilmentMethod;
  deliveryArea: string;
  paymentMethod: PaymentMethod;
  itemsSummary: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  transactionTimestamp?: string;
  mode: 'sandbox_daraja' | 'live_daraja';
  createdAt: string;
  updatedAt: string;
}
