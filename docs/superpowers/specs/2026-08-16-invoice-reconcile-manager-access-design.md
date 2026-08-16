# Design: Mở quyền truy cập Đối soát Excel cho Admin & Manager

Ngày: 2026-08-16

## Mục tiêu

Hiện chỉ `admin` truy cập được công cụ **Đối soát Excel** (`/dashboard/tools/invoice-reconcile`). Yêu cầu: cho cả `manager` vào, `staff` vẫn bị chặn. Manager được xem toàn bộ chi nhánh (như admin).

## Bối cảnh

Tính năng được bảo vệ bởi 3 lớp kiểm tra quyền độc lập:

1. **Path-based check** — `lib/constants.ts` (`ADMIN_ONLY_PATHS`) được dùng bởi `lib/server-actions.ts` → `checkRoutePermissionStatus()` (middleware/client guard).
2. **Page-level check** — `app/dashboard/tools/invoice-reconcile/page.tsx` redirect nếu không phải admin.
3. **Server API check** — `app/api/reports/invoice-reconcile/route.ts` → `requireAdminUser()` trả 403 nếu không phải admin.

Ngoài ra còn lớp **hiển thị menu** trong `components/app-sidebar.tsx` — chỉ render mục "Đối soát Excel" khi role là admin.

Codebase đã có pattern dùng sẵn cho các trang admin+manager: hằng `ADMIN_MANAGER_ONLY_PATHS` (hiện rỗng) và hàm `canViewAllBranches(role)` trong `lib/branch.ts` (trả `true` cho `admin` và `manager`).

## Thiết kế

Dùng lại pattern `ADMIN_MANAGER_ONLY_PATHS` + `canViewAllBranches()` — nhất quán với các trang admin+manager khác. Không thêm permission DB riêng (over-engineering cho công cụ này).

### 1. `lib/constants.ts`

- Chuyển `DASHBOARD_URLS.INVOICE_RECONCILE` từ `ADMIN_ONLY_PATHS` sang `ADMIN_MANAGER_ONLY_PATHS`.
- Cập nhật comment `/** Đối soát Excel HĐ checkout — chỉ admin */` → `/** Đối soát Excel HĐ checkout — chỉ admin & quản lý */`.

### 2. `app/dashboard/tools/invoice-reconcile/page.tsx` (dòng 20)

```ts
// trước: if (profile?.role !== USER_ROLE.ADMIN) {
if (!profile || !canViewAllBranches(profile.role)) {
  redirect(DASHBOARD_URLS.DASHBOARD);
}
```

Import `canViewAllBranches` từ `@/lib/branch`. Bỏ import `USER_ROLE` nếu không còn dùng. Guard `!profile` bắt buộc để truyền `UserRole` (không phải `undefined`) vào `canViewAllBranches(role: UserRole)`.

### 3. `components/app-sidebar.tsx` (dòng 46)

```ts
// trước: if (profile?.role === USER_ROLE.ADMIN) {
if (profile && canViewAllBranches(profile.role)) {
  items.push({ title: "Đối soát Excel", url: DASHBOARD_URLS.INVOICE_RECONCILE, icon: FileSpreadsheet });
}
```

Import `canViewAllBranches` từ `@/lib/branch`. `lib/branch.ts` là module thuần (chỉ import type + constants) nên an toàn dùng trong client component. Guard `profile &&` để pass được kiểu `UserRole`.

### 4. `app/api/reports/invoice-reconcile/route.ts` — `requireAdminUser()` (dòng 20-41)

- Đổi điều kiện sang `if (!profile || !canViewAllBranches(profile.role))` (guard null profile tương tự — tránh lỗi TS khi truyền `undefined`).
- Đổi thông báo: `"Chỉ admin mới được đối soát Excel"` → `"Chỉ admin và quản lý mới được đối soát Excel"`.
- Bắt buộc: nếu chỉ sửa page mà không sửa API, manager vào được trang nhưng upload đều nhận 403.

## Kết quả mong muốn

- `admin` + `manager`: vào trang, thấy menu, upload/đối soát thành công, xem toàn bộ chi nhánh.
- `staff`: bị chặn ở cả 3 lớp (redirect ở page, chặn ở middleware, 403 ở API) và không thấy menu.

## Kiểm thử

- Không có test tự động hiện hữu cho tính năng này. Kiểm thử thủ công:
  1. Đăng nhập `admin` → vào `/dashboard/tools/invoice-reconcile` thành công, thấy menu, đối soát 1 file excel OK.
  2. Đăng nhập `manager` → tương tự admin.
  3. Đăng nhập `staff` → redirect về dashboard, không thấy menu, gọi thẳng API nhận 403.
