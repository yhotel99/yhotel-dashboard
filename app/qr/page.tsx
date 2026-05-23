import { redirect } from "next/navigation";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";

/**
 * Legacy /qr → redirect to default branch display.
 * Mỗi chi nhánh dùng URL riêng: /qr/{branchCode} (ví dụ /qr/main).
 */
export default function QRIndexPage() {
  redirect(`/qr/${DEFAULT_BRANCH_CODE}`);
}
