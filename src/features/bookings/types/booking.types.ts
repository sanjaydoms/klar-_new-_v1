export interface CreditCardInfo {
  cardNumber: string;
  cardHolderName: string;
  expiryDate: string; // MM/YY
  cvv: string;
}

export interface ChildInfo {
  type: 'child';
  age: number;
}

export interface BookingPayload {
  BookReservation: any;
}

export interface PrecheckResponse {
  status: string | boolean;
  statusCode: number;
  body?: any;
  message?: string;
  bookingId?: string;
}

export interface CommitResponse {
  status: string | boolean;
  statusCode: number;
  message?: string;
  body?: any;
  dbError?: string;
}
