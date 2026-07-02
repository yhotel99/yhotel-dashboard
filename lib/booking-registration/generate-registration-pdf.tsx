import { registerPdfFonts } from "@/lib/booking-registration/register-pdf-fonts";
import type { RegistrationFormData } from "@/lib/booking-registration/types";

export async function generateRegistrationPdfBuffer(
  data: RegistrationFormData
): Promise<Buffer> {
  const [{ renderToBuffer }, { RegistrationFormPdfDocument }] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/bookings/registration/registration-form-pdf-document"),
    ]);

  registerPdfFonts();
  return renderToBuffer(<RegistrationFormPdfDocument data={data} />);
}
