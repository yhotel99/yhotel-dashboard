"use client";

import type { RegistrationFormData } from "@/lib/booking-registration/types";
import { formatAmountPlain } from "@/lib/booking-registration/build-registration-form-data";
import { REGISTRATION_BLANK } from "@/lib/booking-registration/constants";
import { formatPaymentCheckboxMark } from "@/lib/booking-registration/formatters";
import {
  RegistrationFormHeader,
  RegistrationFormTitle,
} from "@/components/bookings/registration/registration-form-header";

function FieldLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p className="registration-field text-[13px] leading-relaxed">
      <span className="font-medium">{label}</span> {value}
    </p>
  );
}

function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span className="mr-1.5 shrink-0 whitespace-nowrap font-mono text-[12px] leading-none">
      {formatPaymentCheckboxMark(checked)}
    </span>
  );
}

function PaymentDetailsTable({
  rows,
}: {
  rows: RegistrationFormData["paymentOptionRows"];
}) {
  return (
    <table className="mt-2 w-full table-fixed border-collapse text-[12px]">
      <thead>
        <tr className="bg-neutral-100">
          <th className="w-[50%] border border-neutral-400 p-1.5 text-left align-top">
            Hình thức thanh toán / Payment Method
          </th>
          <th className="w-[25%] border border-neutral-400 p-1.5 text-right align-top">
            Số tiền / Amount (VND)
          </th>
          <th className="w-[25%] border border-neutral-400 p-1.5 text-left align-top">
            Ngày thanh toán / Date
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="border border-neutral-400 p-1.5 align-top">
              <div className="flex items-start gap-0.5">
                <CheckboxMark checked={row.checked} />
                <span>
                  {row.label}
                  {row.otherSuffix}
                </span>
              </div>
            </td>
            <td className="border border-neutral-400 p-1.5 text-right align-top">
              {row.amountDisplay || "\u00A0"}
            </td>
            <td className="border border-neutral-400 p-1.5 align-top">
              {row.dateDisplay || "\u00A0"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RegistrationFormPreview({
  data,
}: {
  data: RegistrationFormData;
}) {
  const checkInParts = data.checkInParts;
  const checkOutParts = data.checkOutParts;

  return (
    <div className="registration-print-area mx-auto w-full min-w-0 bg-white px-6 py-6 text-neutral-900 shadow-sm sm:px-10 print:max-w-none print:shadow-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .registration-print-area, .registration-print-area * { visibility: visible; }
          .registration-print-area {
            position: absolute; left: 0; top: 0; width: 100%; max-width: none;
            box-shadow: none; padding: 12mm 15mm;
          }
          .no-print { display: none !important; }
        }
        @page { size: A4; margin: 10mm; }
      `,
        }}
      />

      <RegistrationFormHeader data={data} />
      <RegistrationFormTitle />

      <div className="mt-4 space-y-1 text-[13px]">
        <FieldLine label="Khách sạn / Hotel:" value={data.hotelName} />
        <FieldLine label="Địa chỉ / Address:" value={data.hotelAddress} />
        <FieldLine label="Điện thoại / Tel:" value={data.hotelPhone} />
        <FieldLine label="Email:" value={data.hotelEmail} />
      </div>

      <SectionTitle
        vi="1. Thông tin khách hàng / Guest Information"
      />
      <div className="space-y-1">
        <FieldLine label="Họ và tên / Full Name:" value={data.guestFullName} />
        <FieldLine label="Quốc tịch / Nationality:" value={data.guestNationality} />
        <FieldLine label="Số hộ chiếu / Passport No.:" value={data.guestIdCard} />
        <FieldLine label="Ngày sinh / Date of Birth:" value={data.guestDateOfBirth} />
        <FieldLine label="Điện thoại / Phone:" value={data.guestPhone} />
        <FieldLine label="Email:" value={data.guestEmail} />
        <FieldLine label="Địa chỉ / Address:" value={data.guestAddress} />
        <FieldLine
          label="Người đi cùng / Accompanying Guests:"
          value={data.accompanyingGuests}
        />
      </div>

      <SectionTitle vi="2. Thông tin đặt phòng / Room Reservation Details" />
      <table className="mt-2 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-neutral-400 p-1 text-left">
              Hạng phòng / Room Type
            </th>
            <th className="border border-neutral-400 p-1 text-center">
              SL / Qty
            </th>
            <th className="border border-neutral-400 p-1 text-right">
              Giá / Rate (VND/đêm)
            </th>
            <th className="border border-neutral-400 p-1 text-center">
              Số đêm / Nights
            </th>
            <th className="border border-neutral-400 p-1 text-right">
              Thành tiền / Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {data.roomRows.length > 0 ? (
            data.roomRows.map((row) => (
              <tr key={row.roomType}>
                <td className="border border-neutral-400 p-1">{row.roomType}</td>
                <td className="border border-neutral-400 p-1 text-center">
                  {row.quantity}
                </td>
                <td className="border border-neutral-400 p-1 text-right">
                  {formatAmountPlain(row.ratePerNight)}
                </td>
                <td className="border border-neutral-400 p-1 text-center">
                  {row.nights}
                </td>
                <td className="border border-neutral-400 p-1 text-right">
                  {formatAmountPlain(row.amount)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="border border-neutral-400 p-2 text-center text-neutral-500"
                colSpan={5}
              >
                {REGISTRATION_BLANK}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-3 space-y-1 text-[13px]">
        <p>
          Ngày nhận phòng / Check-in Date: {checkInParts.day} / {checkInParts.month}{" "}
          / {checkInParts.year} (sau 14:00)
        </p>
        <p>
          Ngày trả phòng / Check-out Date: {checkOutParts.day} /{" "}
          {checkOutParts.month} / {checkOutParts.year} (trước 12:00)
        </p>
        <p>
          Tổng số khách / Total Guests: Người lớn {data.totalAdults} / Trẻ em{" "}
          {data.totalChildren}
        </p>
        <FieldLine
          label="Yêu cầu đặc biệt / Special Requests:"
          value={data.specialRequests}
        />
      </div>

      <SectionTitle vi="3. Thông tin thanh toán / Payment Details" />
      <PaymentDetailsTable rows={data.paymentOptionRows} />

      <div className="mt-3 space-y-1 text-[13px]">
        <FieldLine
          label="Tổng giá trị đặt phòng / Total Amount:"
          value={`${formatAmountPlain(data.totalAmount)} VND`}
        />
        <FieldLine
          label="Đã thanh toán / Paid:"
          value={`${formatAmountPlain(data.paidAmount)} VND`}
        />
        <FieldLine
          label="Còn lại / Balance:"
          value={`${formatAmountPlain(data.balanceAmount)} VND`}
        />
      </div>

      <div className="mt-3 space-y-1 text-[13px]">
        <p className="font-medium">
          Thông tin tài khoản ngân hàng / Bank Account Information:
        </p>
        <FieldLine
          label="Tên tài khoản / Account Name:"
          value={data.bankAccountName}
        />
        <FieldLine
          label="Số tài khoản / Account Number:"
          value={data.bankAccountNumber}
        />
        <FieldLine label="Ngân hàng / Bank Name:" value={data.bankName} />
      </div>

      <SectionTitle vi="4. Chính sách & điều khoản / Terms & Conditions" />
      <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed">
        {data.terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>

      <SectionTitle vi="5. Cam kết / Agreement" />
      <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed">
        {data.agreementItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-2 text-[12px]">{data.policyNote}</p>

      <SectionTitle vi="6. Xác nhận / Confirmation" />
      <div className="mt-4 grid grid-cols-2 gap-8 text-[13px]">
        <div className="space-y-6">
          <FieldLine
            label="Khách hàng / Guest Signature:"
            value="................................................"
          />
          <p>
            Ngày / Date: …… / …… / ……
          </p>
        </div>
        <div className="space-y-6">
          <FieldLine
            label="Đại diện khách sạn / Hotel Representative:"
            value="................................................"
          />
          <FieldLine label="Chức vụ / Position:" value="................................................" />
          <p>
            Ngày / Date: …… / …… / ……
          </p>
          <p className="text-center text-xs italic">(Dấu khách sạn / Hotel Seal)</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ vi }: { vi: string }) {
  return (
    <h3 className="mt-4 text-[13px] font-bold uppercase tracking-wide">{vi}</h3>
  );
}
