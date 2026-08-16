# Mở quyền truy cập Đối soát Excel cho Admin & Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho role `manager` (cùng với `admin`) truy cập được công cụ Đối soát Excel ở cả 3 lớp bảo vệ (route constants, page, server API) và thấy menu trong sidebar; `staff` vẫn bị chặn.

**Architecture:** Mở quyền bằng cách chuyển path `INVOICE_RECONCILE` từ `ADMIN_ONLY_PATHS` sang `ADMIN_MANAGER_ONLY_PATHS`, và thay các check `profile?.role === USER_ROLE.ADMIN` bằng helper `canViewAllBranches(role)` (đã có sẵn trong `lib/branch.ts`, trả `true` cho admin + manager). Không thêm permission DB.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase. Không có test framework cho tính năng này — cổng kiểm tra tự động là `npx tsc --noEmit` (baseline hiện sạch, exit 0) và `npm run lint`.

## Global Constraints

- Vai trò: `admin`, `manager` truy cập; `staff` bị chặn ở cả 3 lớp + không thấy menu.
- Manager xem toàn bộ chi nhánh (dùng `canViewAllBranches`, không lọc branch riêng).
- `canViewAllBranches(role: UserRole)` — phải guard `null` profile trước khi gọi để truyền đúng kiểu `UserRole` (không truyền `undefined`).
- Xóa import `USER_ROLE` khỏi file nào không còn dùng nó (tránh lỗi lint unused).
- Cổng kiểm tra mỗi task: `npx tsc --noEmit` phải exit 0. Không thêm test framework mới.

---

### Task 1: Mở path ở route constants

**Files:**
- Modify: `lib/constants.ts:630`
- Modify: `lib/constants.ts:634-640`

**Interfaces:**
- Consumes: (không — chỉ sửa hằng số)
- Produces: `ADMIN_MANAGER_ONLY_PATHS` chứa `DASHBOARD_URLS.INVOICE_RECONCILE`; `ADMIN_ONLY_PATHS` rỗng. Được dùng bởi `lib/server-actions.ts:67-85` (`checkRoutePermissionStatus`).

- [ ] **Step 1: Đổi comment của hằng URL**

Trong `lib/constants.ts`, dòng 630:
```ts
  /** Đối soát Excel HĐ checkout — chỉ admin */
```
→
```ts
  /** Đối soát Excel HĐ checkout — chỉ admin & quản lý */
```

- [ ] **Step 2: Chuyển path từ ADMIN_ONLY_PATHS sang ADMIN_MANAGER_ONLY_PATHS**

Trong `lib/constants.ts`, khối dòng 634-640:
```ts
export const ADMIN_MANAGER_ONLY_PATHS = [] as const;

/** Đường dẫn chỉ admin (kiểm tra trước AUTHENTICATED_ONLY_PATHS). */
export const ADMIN_ONLY_PATHS = [
  DASHBOARD_URLS.INVOICE_RECONCILE,
] as const;
```
→
```ts
export const ADMIN_MANAGER_ONLY_PATHS = [
  DASHBOARD_URLS.INVOICE_RECONCILE,
] as const;

/** Đường dẫn chỉ admin (kiểm tra trước AUTHENTICATED_ONLY_PATHS). */
export const ADMIN_ONLY_PATHS = [] as const;
```

- [ ] **Step 3: Chạy type-check**

Run: `npx tsc --noEmit`
Expected: exit 0 (không lỗi).

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts
git commit -m "refactor: open invoice reconcile path to admin and manager roles"
```

---

### Task 2: Mở quyền ở page và server API

**Files:**
- Modify: `app/dashboard/tools/invoice-reconcile/page.tsx:4,20`
- Modify: `app/api/reports/invoice-reconcile/route.ts:4,20-41`

**Interfaces:**
- Consumes: `canViewAllBranches(role: UserRole): boolean` từ `@/lib/branch`; `profile.role: UserRole` (types.ts:94,103). `ADMIN_MANAGER_ONLY_PATHS` từ Task 1 (đã bao gồm path này, giờ middleware không chặn manager nữa).
- Produces: Page cho phép admin+manager truy cập (redirect nếu không); API `POST /api/reports/invoice-reconcile` trả 403 với thông báo "Chỉ admin và quản lý mới được đối soát Excel" cho role còn lại.

- [ ] **Step 1: Sửa import và check trong page**

Trong `app/dashboard/tools/invoice-reconcile/page.tsx`:

Import (dòng 4):
```ts
import { DASHBOARD_URLS, USER_ROLE } from "@/lib/constants";
```
→
```ts
import { DASHBOARD_URLS } from "@/lib/constants";
```

Thêm import mới ngay sau import constants:
```ts
import { canViewAllBranches } from "@/lib/branch";
```

Check quyền (dòng 20):
```ts
  if (profile?.role !== USER_ROLE.ADMIN) {
```
→
```ts
  if (!profile || !canViewAllBranches(profile.role)) {
```

- [ ] **Step 2: Sửa import và check trong server API**

Trong `app/api/reports/invoice-reconcile/route.ts`:

Xóa import (dòng 4) — `USER_ROLE` không còn dùng:
```ts
import { USER_ROLE } from "@/lib/constants";
```

Thêm import mới:
```ts
import { canViewAllBranches } from "@/lib/branch";
```

Trong hàm `requireAdminUser` (dòng 33):
```ts
  if (profile?.role !== USER_ROLE.ADMIN) {
```
→
```ts
  if (!profile || !canViewAllBranches(profile.role)) {
```

Cập nhật thông báo lỗi (dòng 37):
```ts
      message: "Chỉ admin mới được đối soát Excel",
```
→
```ts
      message: "Chỉ admin và quản lý mới được đối soát Excel",
```

- [ ] **Step 3: Chạy type-check và lint**

Run: `npx tsc --noEmit` rồi `npm run lint`
Expected: cả hai exit 0. Nếu lint báo unused `USER_ROLE`, đã xóa đúng ở bước 2.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/tools/invoice-reconcile/page.tsx app/api/reports/invoice-reconcile/route.ts
git commit -m "feat: allow manager role on invoice reconcile page and API"
```

---

### Task 3: Hiển thị menu sidebar cho manager

**Files:**
- Modify: `components/app-sidebar.tsx:19-24,46`

**Interfaces:**
- Consumes: `canViewAllBranches(role: UserRole)` từ `@/lib/branch`; `DASHBOARD_URLS.INVOICE_RECONCILE` từ Task 1.
- Produces: Mục menu "Đối soát Excel" (icon `FileSpreadsheet`) render khi `profile.role` là `admin` hoặc `manager`.

- [ ] **Step 1: Sửa import**

Trong `components/app-sidebar.tsx`, import constants (dòng 19-24):
```ts
import {
  allNavItems,
  DASHBOARD_URLS,
  SIDEBAR_URLS,
  USER_ROLE,
} from "@/lib/constants";
```
→
```ts
import {
  allNavItems,
  DASHBOARD_URLS,
  SIDEBAR_URLS,
} from "@/lib/constants";
```

Thêm import mới ngay sau khối import constants:
```ts
import { canViewAllBranches } from "@/lib/branch";
```

- [ ] **Step 2: Sửa điều kiện hiển thị menu**

Trong `components/app-sidebar.tsx`, dòng 46:
```ts
    if (profile?.role === USER_ROLE.ADMIN) {
```
→
```ts
    if (profile && canViewAllBranches(profile.role)) {
```

- [ ] **Step 3: Chạy type-check và lint**

Run: `npx tsc --noEmit` rồi `npm run lint`
Expected: cả hai exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: show invoice reconcile menu to manager role"
```

---

## Kiểm tra thủ công cuối (cho human/executor)

Sau khi cả 3 task xong:

1. Đăng nhập `admin` → sidebar có "Đối soát Excel"; vào `/dashboard/tools/invoice-reconcile`; upload 1 file `.xlsx` → kết quả đối soát trả về OK.
2. Đăng nhập `manager` → sidebar có "Đối soát Excel"; vào trang; upload file → OK (không nhận 403).
3. Đăng nhập `staff` → sidebar không có "Đối soát Excel"; vào thẳng `/dashboard/tools/invoice-reconcile` → redirect về dashboard; gọi thẳng `POST /api/reports/invoice-reconcile` → nhận 403 "Chỉ admin và quản lý mới được đối soát Excel".
