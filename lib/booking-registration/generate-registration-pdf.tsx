import { renderToBuffer } from "@react-pdf/renderer";
import { RegistrationFormPdfDocument } from "@/components/bookings/registration/registration-form-pdf-document";
import { registerPdfFonts } from "@/lib/booking-registration/register-pdf-fonts";
import type { RegistrationFormData } from "@/lib/booking-registration/types";

export async function generateRegistrationPdfBuffer(
  data: RegistrationFormData
): Promise<Buffer> {
  registerPdfFonts();
  return renderToBuffer(<RegistrationFormPdfDocument data={data} />);
}
