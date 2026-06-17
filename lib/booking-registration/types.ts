export type RegistrationRoomRow = {
  roomType: string;
  quantity: number;
  ratePerNight: number;
  nights: number;
  amount: number;
};

export type RegistrationPaymentOptionRow = {
  id: string;
  label: string;
  checked: boolean;
  /** Phần bổ sung sau "Khác / Other:" */
  otherSuffix: string;
  amountDisplay: string;
  dateDisplay: string;
};

export type RegistrationPaymentRow = {
  method: string;
  methodLabel: string;
  amount: number;
  paidAt: string | null;
};

export type RegistrationPaymentMethods = {
  cash: boolean;
  bankTransfer: boolean;
  creditCard: boolean;
  other: boolean;
  otherLabel: string;
};

export type RegistrationFormData = {
  bookingId: string;
  bookingCode: string;
  documentNumber: string;
  documentDate: string;
  documentDateParts: { day: string; month: string; year: string };
  companyName: string;
  taxId: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  guestFullName: string;
  guestNationality: string;
  guestIdCard: string;
  guestDateOfBirth: string;
  guestPhone: string;
  guestEmail: string;
  guestAddress: string;
  accompanyingGuests: string;
  roomRows: RegistrationRoomRow[];
  checkInDate: string;
  checkOutDate: string;
  checkInParts: { day: string; month: string; year: string };
  checkOutParts: { day: string; month: string; year: string };
  totalAdults: string;
  totalChildren: string;
  specialRequests: string;
  paymentMethods: RegistrationPaymentMethods;
  paymentOptionRows: RegistrationPaymentOptionRow[];
  paymentRows: RegistrationPaymentRow[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  terms: string[];
  agreementItems: string[];
  policyNote: string;
};

export type RegistrationBookingRoomRaw = {
  room_id: string;
  amount: number | null;
  number_of_nights: number;
  rooms: {
    id: string;
    name: string;
  } | null;
};

export type RegistrationBookingRaw = {
  id: string;
  booking_code: string;
  branch_id: string | null;
  check_in: string;
  check_out: string;
  number_of_nights: number;
  total_guests: number;
  notes: string | null;
  total_amount: number;
  final_amount: number | null;
  created_at: string;
  customers: {
    full_name: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    id_card: string | null;
    date_of_birth: string | null;
  } | null;
};
