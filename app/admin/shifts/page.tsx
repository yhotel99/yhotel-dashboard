import { redirect } from "next/navigation";

/** Alias route — PMS admin dùng /dashboard, giữ /admin/shifts theo spec HR. */
export default function AdminShiftsRedirect() {
  redirect("/dashboard/shifts");
}
