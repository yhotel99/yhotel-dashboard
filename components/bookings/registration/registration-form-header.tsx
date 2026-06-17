import type { RegistrationFormData } from "@/lib/booking-registration/types";
import { REGISTRATION_LOGO_SRC } from "@/lib/booking-registration/registration-logo-path";
import { formatRegistrationCompanyLine } from "@/lib/booking-registration/formatters";

export function RegistrationFormHeader({
  data,
}: {
  data: RegistrationFormData;
}) {
  const docDate = data.documentDateParts;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3 text-xs">
      <div>
        <p className="text-[13px] font-bold uppercase leading-tight">
          {formatRegistrationCompanyLine(data.companyName, data.taxId)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={REGISTRATION_LOGO_SRC}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
          />
          <p className="text-[13px]">Số: {data.documentNumber}</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[12px] font-bold uppercase leading-snug">
          Cộng hòa xã hội chủ nghĩa Việt Nam
        </p>
        <p className="mt-0.5 text-[12px] font-bold underline decoration-black underline-offset-[3px]">
          Độc lập – Tự do – Hạnh phúc
        </p>
        <p className="mt-2 font-serif text-[12px] italic">
          Ngày {docDate.day} tháng {docDate.month} năm {docDate.year}
        </p>
      </div>
    </div>
  );
}

export function RegistrationFormTitle() {
  return (
    <>
      <h2 className="mt-4 text-center text-[13px] font-bold uppercase leading-snug">
        Giấy đăng ký khách – đặt phòng &amp; xác nhận thanh toán
      </h2>
      <p className="mt-1 text-center text-[11px] font-bold uppercase leading-tight">
        Guest Registration – Room Reservation &amp; Payment
        <br />
        Confirmation Form
      </p>
    </>
  );
}
