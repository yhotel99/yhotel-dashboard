/** Placeholder for empty form fields (matches Word template dotted lines). */
export const REGISTRATION_BLANK =
  "........................................................................";

/** Short placeholder for date parts (day / month / year). */
export const REGISTRATION_BLANK_SHORT = "......";

export const REGISTRATION_COMPANY = {
  name: "CÔNG TY CỔ PHẦN KHÁCH SẠN YQ",
  taxId: "22656323686",
} as const;

export const REGISTRATION_TERMS: string[] = [
  "Đặt phòng được xác nhận khi khách sạn nhận đủ tiền đặt cọc hoặc thanh toán trước. / The booking is confirmed upon receipt of full deposit or prepayment.",
  "Nhận phòng sau 14:00, trả phòng trước 12:00. / Check-in after 14:00, check-out before 12:00.",
  "Hủy phòng trong vòng 72 giờ trước ngày đến sẽ bị tính phí 1 đêm. / Cancellation within 72 hours prior to arrival will incur one-night charge.",
  "Early check-in / Late check-out tùy thuộc vào tình trạng phòng và có thể phụ thu. / Subject to room availability and surcharge.",
];

export const REGISTRATION_AGREEMENT_ITEMS: string[] = [
  "Tôi xác nhận thông tin là đúng sự thật / I confirm the information provided is true and correct.",
  "Không vi phạm pháp luật, không sử dụng ma túy, mại dâm, cờ bạc / No illegal activities, drugs, prostitution or gambling.",
  "Không gây ồn sau 22:00 / No noise after 22:00.",
  "Bồi thường hư hỏng tài sản / Guest is responsible for any damages or loss.",
  "Khách sạn không chịu trách nhiệm tài sản không gửi lễ tân / Hotel is not liable for valuables not deposited at reception.",
  "Đồng ý cung cấp thông tin cho cơ quan chức năng theo quy định / Agree hotel may provide information to authorities as required.",
];

export const REGISTRATION_POLICY_NOTE =
  "Quy định / Policy: Nhận phòng 14:00 – Trả phòng 12:00. Quá giờ tính phụ thu theo quy định khách sạn.";

export const REGISTRATION_DEFAULT_HOTEL = {
  name: "Y Hotel",
  address: "60 – 62 – 64 Lý Hồng Thanh, Cái Khế, Cần Thơ",
  phone: "078 791 3388",
  email: "hello@yhotel.vn",
} as const;
