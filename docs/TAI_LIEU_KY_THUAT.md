# Tài Liệu Kỹ Thuật - YHotel Dashboard

## Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
4. [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
5. [Database Schema](#database-schema)
6. [Authentication & Authorization](#authentication--authorization)
7. [API & Server Actions](#api--server-actions)
8. [State Management](#state-management)
9. [UI Components](#ui-components)
10. [Environment Variables](#environment-variables)
11. [Development Setup](#development-setup)
12. [Deployment](#deployment)
13. [Best Practices](#best-practices)

---

## Tổng Quan Hệ Thống

**YHotel Dashboard** là hệ thống quản lý khách sạn được xây dựng trên nền tảng Next.js 16 với App Router, sử dụng Supabase làm backend và database. Hệ thống hỗ trợ quản lý toàn diện các hoạt động của khách sạn bao gồm:

- Quản lý phòng khách sạn
- Quản lý đặt phòng và đơn đặt phòng
- Quản lý khách hàng
- Quản lý thanh toán và hoàn tiền
- Báo cáo và thống kê
- Quản lý nội dung blog
- Quản lý người dùng và phân quyền

---

## Kiến Trúc Hệ Thống

### Kiến Trúc Tổng Thể

Hệ thống được xây dựng theo kiến trúc **Full-Stack Next.js** với các thành phần chính:

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   React UI   │  │   SWR Cache  │  │   Contexts   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│              Next.js Server (App Router)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Server Actions│  │ API Routes  │  │   Middleware │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Services   │  │   Actions    │  │  Permissions │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ Supabase Client
┌─────────────────────────────────────────────────────────┐
│                    Supabase Backend                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │   Storage    │  │   Auth       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   RPC Funcs  │  │   Triggers   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Luồng Xử Lý Request

1. **Client Request**: Người dùng tương tác với UI
2. **Server Action/API Route**: Request được xử lý bởi Server Action hoặc API Route
3. **Service Layer**: Business logic được xử lý trong Service layer
4. **Supabase Client**: Kết nối đến Supabase để thực hiện database operations
5. **Response**: Kết quả được trả về client và cập nhật UI

---

## Công Nghệ Sử Dụng

### Frontend

- **Next.js 16.0.7**: React framework với App Router
- **React 19.2.0**: UI library
- **TypeScript 5**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **SWR 2.3.6**: Data fetching và caching
- **React Hook Form 7.66.0**: Form management
- **Zod 4.1.12**: Schema validation
- **TanStack Table 8.21.3**: Table component
- **Recharts 2.15.4**: Chart library
- **TipTap 3.12.1**: Rich text editor
- **Radix UI**: Accessible component primitives
- **Sonner 2.0.7**: Toast notifications

### Backend & Database

- **Supabase**: Backend-as-a-Service
  - PostgreSQL: Relational database
  - Supabase Auth: Authentication
  - Supabase Storage: File storage
  - RPC Functions: Server-side functions
- **@supabase/ssr 0.7.0**: Server-side Supabase client
- **@supabase/supabase-js 2.79.0**: Supabase JavaScript client

### Development Tools

- **ESLint 9**: Code linting
- **TypeScript**: Type checking
- **tsx 4.21.0**: TypeScript execution
- **Tailwind CSS**: Styling

---

## Cấu Trúc Dự Án

```
yhotel-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── blogs/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── gallery/
│   │   ├── payment-logs/
│   │   ├── payments/
│   │   ├── profiles/
│   │   ├── refund-requests/
│   │   ├── reports/             # Báo cáo endpoints
│   │   ├── reservations/
│   │   ├── rooms/
│   │   ├── settings/
│   │   └── users/
│   ├── dashboard/                # Dashboard pages
│   │   ├── blogs/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── gallery/
│   │   ├── payment-logs/
│   │   ├── payments/
│   │   ├── refund-requests/
│   │   ├── reservation/
│   │   ├── rooms/
│   │   ├── settings/
│   │   ├── users/
│   │   ├── layout.tsx           # Dashboard layout
│   │   └── page.tsx             # Dashboard home
│   ├── login/                   # Login page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── actions/                     # Server Actions
│   ├── auth.ts
│   ├── blogs.ts
│   ├── bookings.ts
│   ├── customers.ts
│   ├── gallery.ts
│   ├── payments.ts
│   ├── profiles.ts
│   ├── refund-requests.ts
│   ├── reservations.ts
│   ├── rooms.ts
│   ├── settings.ts
│   └── storage.ts
├── components/                  # React Components
│   ├── ui/                      # Base UI components
│   ├── blogs/
│   ├── bookings/
│   ├── customers/
│   ├── gallery/
│   ├── payment-logs/
│   ├── payments/
│   ├── refund-requests/
│   ├── rooms/
│   ├── users/
│   └── ...                     # Other components
├── contexts/                    # React Contexts
│   ├── auth-context.tsx
│   ├── permissions-context.tsx
│   └── swr-context.tsx
├── hooks/                       # Custom React Hooks
│   ├── use-blogs.ts
│   ├── use-bookings.ts
│   ├── use-customers.ts
│   ├── use-debounce.ts
│   ├── use-gallery.ts
│   ├── use-mobile.ts
│   ├── use-payment-logs.ts
│   ├── use-payments.ts
│   ├── use-profiles.ts
│   ├── use-refund-requests.ts
│   ├── use-reservation.ts
│   └── use-rooms.ts
├── lib/                         # Utility libraries
│   ├── constants.ts             # Application constants
│   ├── fetcher.ts               # SWR fetcher
│   ├── functions.ts             # Utility functions
│   ├── permissions.ts           # Permission utilities
│   ├── permissions.server.ts   # Server-side permissions
│   ├── server-actions.ts        # Server action utilities
│   ├── supabase/                # Supabase clients
│   │   ├── server.ts            # Server client
│   │   └── client.ts            # Client-side client
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # General utilities
├── services/                     # Business logic layer
│   ├── blogs.ts
│   ├── bookings.ts
│   ├── customers.ts
│   ├── gallery.ts
│   ├── payment-logs.ts
│   ├── payments.ts
│   ├── permissions.ts
│   ├── profiles.ts
│   ├── refund-requests.ts
│   ├── reservation.ts
│   ├── rooms.ts
│   ├── settings.ts
│   └── storage.ts
├── supabase/                    # Supabase configuration
│   ├── migrations/              # Database migrations
│   ├── functions/               # Edge functions
│   └── config.toml             # Supabase config
├── docs/                        # Documentation
│   ├── HUONG_DAN_SU_DUNG.md
│   ├── PERMISSIONS_MIGRATION.md
│   └── TAI_LIEU_KY_THUAT.md
├── public/                      # Static assets
├── scripts/                     # Utility scripts
│   └── seed-auth.ts
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies
└── README.md                   # Project README
```

### Quy Ước Đặt Tên

- **Components**: PascalCase (ví dụ: `BookingForm.tsx`)
- **Hooks**: camelCase với prefix `use` (ví dụ: `useBookings.ts`)
- **Services**: camelCase (ví dụ: `bookings.ts`)
- **Actions**: camelCase (ví dụ: `bookings.ts`)
- **Types**: PascalCase (ví dụ: `BookingRecord`)
- **Constants**: UPPER_SNAKE_CASE (ví dụ: `BOOKING_STATUS`)

---

## Database Schema

### Các Bảng Chính

#### 1. `profiles` - Người Dùng Hệ Thống

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Roles**: `admin`, `manager`, `staff`  
**Status**: `active`, `inactive`, `suspended`

#### 2. `rooms` - Phòng Khách Sạn

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  room_type room_type NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  max_guests INTEGER NOT NULL,
  amenities TEXT[] DEFAULT '{}',
  status room_status NOT NULL DEFAULT 'available',
  thumbnail_id UUID REFERENCES gallery(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Room Types**: `standard`, `deluxe`, `superior`, `family`  
**Room Status**: `available`, `maintenance`, `not_clean`, `clean`

#### 3. `customers` - Khách Hàng

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  id_card TEXT,
  customer_type customer_type NOT NULL DEFAULT 'regular',
  date_of_birth DATE,
  source TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Customer Types**: `regular`, `vip`, `blacklist`

#### 4. `bookings` - Đơn Đặt Phòng

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  room_id UUID REFERENCES rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  number_of_nights INTEGER NOT NULL,
  total_guests INTEGER NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  advance_payment DECIMAL(10,2) DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Booking Status**: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`

#### 5. `payments` - Thanh Toán

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type payment_type NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Payment Types**: `advance_payment`, `room_charge`  
**Payment Methods**: `pay_at_hotel`, `bank_transfer`, `credit_card`, `cash`  
**Payment Status**: `pending`, `completed`, `failed`, `refunded`

#### 6. `refund_requests` - Yêu Cầu Hoàn Tiền

```sql
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status refund_request_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Refund Status**: `pending`, `approved`, `rejected`, `completed`

#### 7. `blogs` - Blog Posts

```sql
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  thumbnail_id UUID REFERENCES gallery(id),
  author_id UUID REFERENCES profiles(id) NOT NULL,
  status blog_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Blog Status**: `draft`, `published`, `archived`

#### 8. `gallery` - Bộ Sưu Tập Ảnh

```sql
CREATE TABLE gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. `settings` - Cài Đặt Hệ Thống

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title TEXT NOT NULL,
  site_description TEXT NOT NULL,
  hero_images JSONB,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  working_hours TEXT,
  social_media_links JSONB,
  bank_account_number TEXT,
  bank_name TEXT,
  bank_bin TEXT,
  bank_account_owner TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 10. `permissions` - Quyền Hệ Thống

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 11. `role_permissions` - Phân Quyền Theo Vai Trò

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);
```

#### 12. `payment_logs` - Lịch Sử Webhook

```sql
CREATE TABLE payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

Hệ thống sử dụng các indexes để tối ưu hiệu suất:

- `bookings(booking_code)` - Tìm kiếm booking code
- `bookings(customer_id, created_at)` - Lịch sử booking của khách hàng
- `bookings(room_id, check_in, check_out)` - Kiểm tra phòng trống
- `payments(booking_id)` - Thanh toán theo booking
- `refund_requests(booking_id)` - Yêu cầu hoàn tiền theo booking

### RPC Functions

#### `create_booking_secure`

Tạo booking an toàn với validation và transaction:

```sql
CREATE OR REPLACE FUNCTION create_booking_secure(
  p_customer_id UUID,
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_number_of_nights INTEGER,
  p_total_amount DECIMAL,
  p_payment_method payment_method,
  p_total_guests INTEGER,
  p_notes TEXT,
  p_advance_payment DECIMAL
) RETURNS JSON
```

#### `get_customers_with_stats`

Lấy danh sách khách hàng kèm thống kê:

```sql
CREATE OR REPLACE FUNCTION get_customers_with_stats(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE(...)
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**: Người dùng đăng nhập qua Supabase Auth
2. **Session**: Supabase tạo session và lưu trong cookies
3. **Profile**: Lấy thông tin profile từ bảng `profiles`
4. **Context**: Lưu user và profile vào `AuthContext`

### Authorization - Hệ Thống Phân Quyền

Hệ thống sử dụng **database-driven permissions**:

#### Cấu Trúc Phân Quyền

```
permissions (bảng quyền)
  ├── view:dashboard
  ├── view:rooms
  ├── create:rooms
  ├── update:rooms
  ├── delete:rooms
  └── ...

role_permissions (gán quyền cho vai trò)
  ├── admin → tất cả quyền
  ├── manager → một số quyền
  └── staff → quyền hạn chế
```

#### Permission Format

Quyền được đặt tên theo format: `{action}:{resource}`

- **Actions**: `view`, `create`, `update`, `delete`
- **Resources**: `dashboard`, `rooms`, `bookings`, `customers`, `payments`, `refund-requests`, `gallery`, `blogs`, `users`, `settings`

#### Kiểm Tra Quyền

**Server-side** (`lib/permissions.server.ts`):

```typescript
// Kiểm tra quyền cụ thể
await checkPermission(role, 'create:rooms')

// Kiểm tra quyền view cho resource
await hasViewPermission(role, 'rooms')

// Lấy trang đầu tiên được phép truy cập
await getFirstAllowedPage(role)
```

**Client-side** (`contexts/permissions-context.tsx`):

```typescript
const { hasViewPermission } = usePermissions()
if (hasViewPermission('rooms')) {
  // Hiển thị menu Rooms
}
```

#### Route Protection

Middleware và Server Actions kiểm tra quyền trước khi cho phép truy cập:

```typescript
// lib/server-actions.ts
export async function checkRoutePermissionStatus(
  pathname: string,
  user: User | null,
  profile: Profile | null
): Promise<{ hasPermission: boolean; fallbackUrl: string }>
```

---

## API & Server Actions

### API Routes

API Routes được đặt trong `app/api/` và sử dụng cho:

- **Data Fetching**: Cung cấp dữ liệu cho SWR
- **External Integration**: Webhook endpoints
- **Reports**: Báo cáo và thống kê

**Ví dụ**: `app/api/bookings/route.ts`

```typescript
export async function GET(req: NextRequest) {
  // Parse query params
  // Fetch data from service
  // Return JSON response
}
```

### Server Actions

Server Actions được đặt trong `actions/` và sử dụng cho:

- **Mutations**: Create, Update, Delete operations
- **Form Submissions**: Xử lý form data
- **Server-side Logic**: Business logic phức tạp

**Pattern**:

```typescript
"use server"

export async function createBooking(input: BookingInput): Promise<Result<{ bookingId: string }>> {
  // Validation
  // Call service
  // Return result
}
```

### Service Layer

Services (`services/`) chứa business logic và database operations:

```typescript
// services/bookings.ts
export async function createBookingSecure(input: BookingInput): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_booking_secure', {...})
  // Handle error
  return data.booking_id
}
```

### Error Handling

Hệ thống sử dụng **Result Pattern** để xử lý lỗi:

```typescript
type Result<T> = 
  | { ok: true; data: T }
  | { ok: false; message: string }

// Usage
const result = await createBooking(input)
if (!result.ok) {
  toast.error(result.message)
  return
}
// Use result.data
```

---

## State Management

### Client-Side State

#### 1. **SWR** - Data Fetching & Caching

SWR được sử dụng cho server state:

```typescript
// hooks/use-bookings.ts
const { bookings, isLoading, mutate } = useSWR(
  `/api/bookings?page=${page}&limit=${limit}`,
  fetcher
)
```

**Features**:
- Automatic revalidation
- Cache management
- Optimistic updates
- Error handling

#### 2. **React Context** - Global State

**AuthContext**: Quản lý authentication state

```typescript
const { currentUser, profile } = useAuth()
```

**PermissionsContext**: Quản lý permissions

```typescript
const { hasViewPermission } = usePermissions()
```

#### 3. **React Hook Form** - Form State

Quản lý form state và validation:

```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {...}
})
```

#### 4. **Local State** - Component State

Sử dụng `useState` cho UI state:

```typescript
const [isOpen, setIsOpen] = useState(false)
```

---

## UI Components

### Component Architecture

```
components/
├── ui/                    # Base components (Radix UI)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── {feature}/            # Feature-specific components
│   ├── {feature}-content.tsx
│   ├── columns.tsx
│   ├── {feature}-form.tsx
│   └── ...
└── shared/               # Shared components
    ├── data-table.tsx
    ├── image-selector.tsx
    └── ...
```

### Component Patterns

#### 1. **Content Components**

Quản lý data fetching và state:

```typescript
export function BookingsContent({ initialData }: Props) {
  const { bookings, isLoading } = useBookings({...})
  // Render UI
}
```

#### 2. **Form Components**

Xử lý form với React Hook Form:

```typescript
export function BookingForm({ onSubmit }: Props) {
  const form = useForm<FormValues>({...})
  // Form fields
}
```

#### 3. **Table Components**

Sử dụng TanStack Table:

```typescript
const columns = createColumns(handlers)
<DataTable data={bookings} columns={columns} />
```

---

## Environment Variables

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Storage
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=your-bucket-name
NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER=your-folder-name
```

### Environment Files

- `.env.local`: Local development (gitignored)
- `.env.production`: Production environment
- `.env.example`: Example file (committed)

---

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd yhotel-dashboard

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npx supabase migration up

# Start development server
npm run dev
```

### Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Seed auth data
npm run seed:auth
```

### Database Migrations

```bash
# Create new migration
npx supabase migration new migration_name

# Apply migrations
npx supabase migration up

# Reset database
npx supabase db reset
```

---

## Deployment

### Vercel Deployment

1. **Connect Repository**: Kết nối GitHub repository với Vercel
2. **Configure Environment Variables**: Thêm các biến môi trường trong Vercel dashboard
3. **Deploy**: Vercel tự động deploy khi push code

### Environment Variables trong Vercel

Thêm các biến sau trong Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_STORAGE_FOLDER`

### Build Configuration

Next.js tự động detect và build project. Không cần cấu hình thêm.

---

## Best Practices

### Code Organization

1. **Separation of Concerns**:
   - `actions/`: Server Actions
   - `services/`: Business logic
   - `components/`: UI components
   - `hooks/`: Custom hooks
   - `lib/`: Utilities

2. **Type Safety**:
   - Sử dụng TypeScript cho tất cả files
   - Định nghĩa types trong `lib/types.ts`
   - Sử dụng Zod cho runtime validation

3. **Error Handling**:
   - Sử dụng Result Pattern
   - Hiển thị error messages rõ ràng
   - Log errors cho debugging

### Performance Optimization

1. **Data Fetching**:
   - Sử dụng SWR cho caching
   - Implement pagination
   - Debounce search inputs

2. **Rendering**:
   - Sử dụng Server Components khi có thể
   - Lazy load components
   - Optimize images với Next.js Image

3. **Database**:
   - Sử dụng indexes
   - Optimize queries
   - Sử dụng RPC functions cho complex operations

### Security

1. **Authentication**:
   - Luôn kiểm tra authentication trên server
   - Sử dụng Supabase RLS (Row Level Security)

2. **Authorization**:
   - Kiểm tra permissions trên server
   - Không expose sensitive data trên client

3. **Input Validation**:
   - Validate input trên server
   - Sử dụng Zod schemas
   - Sanitize user input

### Testing

1. **Unit Tests**: Test utilities và functions
2. **Integration Tests**: Test API routes và Server Actions
3. **E2E Tests**: Test user flows

---

## Troubleshooting

### Common Issues

#### 1. **Supabase Connection Error**

- Kiểm tra environment variables
- Verify Supabase project URL và keys
- Check network connectivity

#### 2. **Permission Denied**

- Kiểm tra user role và permissions
- Verify RLS policies
- Check permission mappings

#### 3. **Build Errors**

- Clear `.next` folder
- Reinstall dependencies
- Check TypeScript errors

---

## Tài Liệu Tham Khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [SWR Documentation](https://swr.vercel.app)

---

**Phiên bản tài liệu**: 1.0  
**Cập nhật lần cuối**: 2024

