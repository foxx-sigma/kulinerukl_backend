# GEMINI.md — Website Rekomendasi Kuliner Lokal

> Blueprint implementasi backend REST API berbasis **NestJS + Prisma ORM + PostgreSQL + Midtrans Payment Gateway**
> Dokumen ini dirancang sebagai **instruksi eksekusi langsung untuk AI agent** — baca seluruh dokumen terlebih dahulu, lalu implementasikan semua bagian secara berurutan tanpa henti.

---

## 1. SYSTEM OVERVIEW

### Tujuan Project

Membangun backend REST API untuk sistem rekomendasi kuliner lokal yang memudahkan pengguna menemukan tempat makan terbaik di sekitar mereka, melihat menu dan harga, memberikan ulasan, serta melakukan pemesanan dan pembayaran secara digital.

### Masalah yang Diselesaikan

| Masalah | Solusi Sistem |
|---|---|
| Susah mencari info kuliner lokal yang terpercaya | Search & filter kuliner real-time |
| Tidak tahu rating tempat makan | Review & rating dari user nyata |
| Susah menyimpan favorit kuliner | Fitur bookmark/favorit |
| Tidak bisa pesan secara digital | Sistem order sederhana |
| Pembayaran masih manual/cash | Integrasi payment gateway Midtrans |

### Target User

- **User Biasa** — Pencari kuliner yang ingin browse, review, bookmark, dan order makanan
- **Admin** — Pengelola platform yang mengatur data kuliner, menu, kategori, dan transaksi

### Value Proposition

> _"Satu platform untuk temukan, review, simpan, dan pesan kuliner lokal favoritmu — dengan pembayaran digital yang aman."_

### Cara Kerja Sistem (General)

```
User → Register/Login → JWT Token → Browse Kuliner → Filter/Search
     → Lihat Detail & Menu → Tambah ke Order → Checkout
     → Midtrans Payment → Webhook Callback → Order Confirmed
```

---

## 2. END-TO-END SYSTEM FLOW

### A. User Registration & Login Flow

```
[Client]                          [NestJS Backend]                    [Database]
   |                                     |                                |
   |-- POST /auth/register ------------->|                                |
   |   { name, email, password }         |-- bcrypt.hash(password) ----->|
   |                                     |-- prisma.user.create() ------->|
   |<-- 201 Created -------------------- |   { id, name, email, role }   |
   |   { message: "Registered" }         |                                |
   |                                     |                                |
   |-- POST /auth/login ---------------->|                                |
   |   { email, password }               |-- prisma.user.findUnique() --->|
   |                                     |-- bcrypt.compare() ----------->|
   |                                     |-- jwt.sign(payload) ---------->|
   |<-- 200 OK ------------------------- |                                |
   |   { access_token: "eyJ..." }        |                                |
```

### B. Browse & Order Flow (Lengkap)

```
[Client dengan JWT]               [NestJS Backend]                    [Database/Midtrans]
   |                                     |                                |
   |-- GET /culinary?category=&price= -->|                                |
   |   Header: Bearer <token>            |-- JwtGuard verify ------------>|
   |                                     |-- prisma.culinaryPlace.findMany()|
   |<-- 200 OK { data: [...] } --------- |   (dengan filter + pagination) |
   |                                     |                                |
   |-- GET /culinary/:id --------------->|                                |
   |<-- 200 OK { place, menus, reviews } |                                |
   |                                     |                                |
   |-- POST /orders -------------------->|                                |
   |   { culinaryPlaceId, items: [       |-- Validasi stok menu --------->|
   |     { menuId, quantity }] }         |-- Hitung total harga          |
   |                                     |-- prisma.order.create() ------>|
   |<-- 201 Created { orderId, total }   |                                |
   |                                     |                                |
   |-- POST /payments/checkout --------->|                                |
   |   { orderId }                       |-- Get order data ------------->|
   |                                     |-- Midtrans createTransaction() |-->  [Midtrans API]
   |                                     |                                |<--  { token, redirect_url }
   |<-- 200 OK { payment_url, token }    |-- prisma.payment.create() ---->|
   |                                     |                                |
   |   [User membayar di halaman Midtrans]                                |
   |                                     |                                |
   |                            [Midtrans Webhook]                        |
   |                        POST /payments/webhook                        |
   |                                     |-- Verify signature ----------->|
   |                                     |-- Update payment status ------>|
   |                                     |-- Update order status -------->|
   |                                     |                                |
   |-- GET /orders/me ----------------->|                                |
   |<-- 200 OK { orders: [...] } ------- |-- prisma.order.findMany() ---->|
```

### C. Review Flow

```
[Client]                          [NestJS Backend]
   |                                     |
   |-- POST /reviews ------------------->|
   |   { culinaryPlaceId, rating, comment}|-- JwtGuard (harus login)
   |                                     |-- Cek apakah user sudah order di tempat ini (opsional)
   |                                     |-- prisma.review.create()
   |                                     |-- Recalculate average rating kuliner
   |<-- 201 Created { review } --------- |
```

---

## 3. ADMIN FLOW

### Login Admin

```
POST /auth/login
{ email: "admin@kuliner.com", password: "..." }
→ Response: { access_token }  ← sama seperti user biasa
→ Perbedaan: role = ADMIN di dalam JWT payload
→ RolesGuard akan cek role sebelum masuk endpoint admin
```

### Alur Kerja Admin

```
Admin Login
    │
    ├── CRUD Kuliner (/admin/culinary)
    │     ├── POST   /admin/culinary        → Tambah tempat kuliner baru
    │     ├── GET    /admin/culinary        → Lihat semua kuliner
    │     ├── PATCH  /admin/culinary/:id    → Edit kuliner
    │     └── DELETE /admin/culinary/:id    → Hapus kuliner
    │
    ├── CRUD Kategori (/admin/categories)
    │     ├── POST   /admin/categories      → Tambah kategori (Mie, Nasi, dll)
    │     ├── GET    /admin/categories      → Lihat semua kategori
    │     ├── PATCH  /admin/categories/:id  → Edit kategori
    │     └── DELETE /admin/categories/:id  → Hapus kategori
    │
    ├── CRUD Menu (/admin/menus)
    │     ├── POST   /admin/menus           → Tambah menu ke kuliner
    │     ├── GET    /admin/menus           → Lihat semua menu
    │     ├── PATCH  /admin/menus/:id       → Edit harga/stok menu
    │     └── DELETE /admin/menus/:id       → Hapus menu
    │
    ├── Manajemen Order (/admin/orders)
    │     ├── GET    /admin/orders          → Lihat semua transaksi
    │     ├── GET    /admin/orders/:id      → Detail transaksi
    │     └── PATCH  /admin/orders/:id/status → Update status order
    │
    └── Moderasi Review (OPSIONAL)
          └── DELETE /admin/reviews/:id     → Hapus review yang tidak pantas
```

---

## 4. DATABASE DESIGN

### Diagram Relasi Tabel

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    users    │       │  culinary_places  │       │  categories │
│─────────────│       │──────────────────│       │─────────────│
│ id (PK)     │       │ id (PK)          │       │ id (PK)     │
│ name        │       │ name             │       │ name        │
│ email       │       │ description      │       │ slug        │
│ password    │       │ address          │       │ createdAt   │
│ role        │       │ imageUrl         │       └──────┬──────┘
│ createdAt   │       │ rating           │              │
│ updatedAt   │       │ categoryId (FK)──┼──────────────┘
└──────┬──────┘       │ createdAt        │
       │              └────────┬─────────┘
       │                       │
       │              ┌────────┴─────────┐
       │              │                  │
       │         ┌────▼─────┐    ┌───────▼──────┐
       │         │  menus   │    │   reviews    │
       │         │──────────│    │──────────────│
       │         │ id (PK)  │    │ id (PK)      │
       │         │ name     │    │ rating       │
       │         │ price    │    │ comment      │
       │         │ stock    │    │ userId (FK)──┼──┐
       │         │ imageUrl │    │ culinaryId(FK)  │
       │         │ culinaryId(FK)│ createdAt    │  │
       │         └────┬─────┘    └──────────────┘  │
       │              │                             │
       │   ┌──────────┴──────┐                     │
       │   │  order_items    │                     │
       └───┼─────────────────┤        ┌────────────┘
           │ id (PK)         │        │
           │ quantity        │   ┌────▼──────┐
           │ price           │   │  orders   │
           │ menuId (FK)─────┘   │───────────│
           │ orderId (FK)────────│ id (PK)   │
           └─────────────────┘   │ totalPrice│
                                 │ status    │
                                 │ userId(FK)─────┐
                                 │ createdAt │    │
                                 └─────┬─────┘    │
                                       │          │
                                 ┌─────▼─────┐    │
                                 │ payments  │    │
                                 │───────────│    │
                                 │ id (PK)   │    │
                                 │ transactionId  │
                                 │ paymentMethod  │
                                 │ paymentStatus  │
                                 │ amount    │    │
                                 │ orderId(FK)    │
                                 │ createdAt │    │
                                 └───────────┘    │
                                                  │
       ┌──────────────────────────────────────────┘
       │
  ┌────▼──────┐
  │ bookmarks │
  │───────────│
  │ id (PK)   │
  │ userId(FK)│
  │ culinaryId(FK)
  │ createdAt │
  └───────────┘
```

### Relasi Tabel

| Relasi | Tabel A | Tabel B | Tipe |
|---|---|---|---|
| User memiliki banyak Order | users | orders | One-to-Many |
| User memiliki banyak Review | users | reviews | One-to-Many |
| User memiliki banyak Bookmark | users | bookmarks | One-to-Many |
| CulinaryPlace punya banyak Menu | culinary_places | menus | One-to-Many |
| CulinaryPlace punya banyak Review | culinary_places | reviews | One-to-Many |
| CulinaryPlace punya satu Kategori | culinary_places | categories | Many-to-One |
| Order punya banyak OrderItem | orders | order_items | One-to-Many |
| Order punya satu Payment | orders | payments | One-to-One |
| OrderItem merujuk ke satu Menu | order_items | menus | Many-to-One |

---

## 5. PRISMA SCHEMA DESIGN

### Penjelasan Struktur `schema.prisma`

```
schema.prisma terdiri dari 3 bagian utama:
┌──────────────────────────────────────┐
│ 1. datasource db                     │  ← Koneksi ke database PostgreSQL
│ 2. generator client                  │  ← Generate Prisma Client (ORM)
│ 3. model / enum                      │  ← Definisi tabel & tipe data
└──────────────────────────────────────┘
```

**`datasource`** — Memberitahu Prisma database apa yang dipakai dan koneksi string-nya (dari `.env`)

**`generator`** — Perintah untuk generate `@prisma/client` yang dipakai di kode NestJS

**`enum`** — Tipe data dengan nilai terbatas yang sudah ditentukan (misal: ADMIN/USER, PENDING/SUCCESS)

**`model`** — Definisi tabel database: nama field, tipe data, relasi, constraint

### File `schema.prisma` Lengkap

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  USER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  EXPIRED
}

// ============================================================
// AUTHENTICATION
// ============================================================

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relasi
  reviews   Review[]
  bookmarks Bookmark[]
  orders    Order[]

  @@map("users")
}

// ============================================================
// CULINARY
// ============================================================

model Category {
  id             String          @id @default(cuid())
  name           String          @unique
  slug           String          @unique
  createdAt      DateTime        @default(now())

  // Relasi
  culinaryPlaces CulinaryPlace[]

  @@map("categories")
}

model CulinaryPlace {
  id          String   @id @default(cuid())
  name        String
  description String?
  address     String
  imageUrl    String?
  rating      Float    @default(0)
  priceMin    Int?     // harga minimum menu (untuk filter)
  priceMax    Int?     // harga maximum menu (untuk filter)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign Key
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])

  // Relasi
  menus       Menu[]
  reviews     Review[]
  bookmarks   Bookmark[]
  orders      Order[]

  @@map("culinary_places")
}

model Menu {
  id              String        @id @default(cuid())
  name            String
  description     String?
  price           Int           // dalam Rupiah
  stock           Int           @default(0)
  imageUrl        String?
  isAvailable     Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Foreign Key
  culinaryPlaceId String
  culinaryPlace   CulinaryPlace @relation(fields: [culinaryPlaceId], references: [id])

  // Relasi
  orderItems      OrderItem[]

  @@map("menus")
}

model Review {
  id        String   @id @default(cuid())
  rating    Int      // 1-5
  comment   String?
  createdAt DateTime @default(now())

  // Foreign Key
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  culinaryPlaceId String
  culinaryPlace   CulinaryPlace @relation(fields: [culinaryPlaceId], references: [id])

  @@map("reviews")
}

model Bookmark {
  id        String   @id @default(now().toString())
  createdAt DateTime @default(now())

  // Foreign Key
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  culinaryPlaceId String
  culinaryPlace   CulinaryPlace @relation(fields: [culinaryPlaceId], references: [id])

  @@unique([userId, culinaryPlaceId]) // satu user hanya bisa bookmark 1x per kuliner
  @@map("bookmarks")
}

// ============================================================
// ORDER & PAYMENT
// ============================================================

model Order {
  id          String      @id @default(cuid())
  totalPrice  Int         // total dalam Rupiah
  status      OrderStatus @default(PENDING)
  note        String?     // catatan dari user
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Foreign Key
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  culinaryPlaceId String
  culinaryPlace   CulinaryPlace @relation(fields: [culinaryPlaceId], references: [id])

  // Relasi
  orderItems  OrderItem[]
  payment     Payment?

  @@map("orders")
}

model OrderItem {
  id       String @id @default(cuid())
  quantity Int
  price    Int    // harga saat order dibuat (snapshot harga)

  // Foreign Key
  orderId  String
  order    Order  @relation(fields: [orderId], references: [id])
  menuId   String
  menu     Menu   @relation(fields: [menuId], references: [id])

  @@map("order_items")
}

model Payment {
  id            String        @id @default(cuid())
  transactionId String        @unique // dari Midtrans
  amount        Int
  paymentMethod String?       // QRIS, bank_transfer,
  paymentStatus PaymentStatus @default(PENDING)
  snapToken     String?       // Midtrans Snap token
  paymentUrl    String?       // URL redirect ke halaman bayar
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Foreign Key (One-to-One dengan Order)
  orderId       String        @unique
  order         Order         @relation(fields: [orderId], references: [id])

  @@map("payments")
}
```

---

## 6. STRUKTUR MODULE NESTJS

### Daftar Module & Tanggung Jawabnya

| Module | File Utama | Tanggung Jawab |
|---|---|---|
| `PrismaModule` | `prisma.service.ts` | Koneksi database, inject PrismaClient ke semua module |
| `AuthModule` | `auth.service.ts` | Register, Login, hash password, generate JWT |
| `UsersModule` | `users.service.ts` | CRUD user, profile management |
| `CulinaryModule` | `culinary.service.ts` | Daftar kuliner, detail, search, filter |
| `CategoryModule` | `category.service.ts` | CRUD kategori kuliner |
| `MenuModule` | `menu.service.ts` | CRUD menu per kuliner |
| `ReviewModule` | `review.service.ts` | Tambah review, hitung rata-rata rating |
| `BookmarkModule` | `bookmark.service.ts` | Tambah/hapus bookmark, list bookmark user |
| `OrderModule` | `order.service.ts` | Buat order, riwayat order, update status |
| `PaymentModule` | `payment.service.ts` | Checkout via Midtrans, handle webhook |
| `AdminModule` | `admin.service.ts` | Aggregasi fitur admin (bisa pakai module lain) |

### Struktur Tiap Module

Setiap module memiliki pola yang sama (contoh: CulinaryModule):

```
culinary/
├── culinary.module.ts        ← Deklarasi module, import dependencies
├── culinary.controller.ts    ← Terima request HTTP, panggil service
├── culinary.service.ts       ← Business logic, panggil Prisma
└── dto/
    ├── create-culinary.dto.ts  ← Validasi request body POST
    └── update-culinary.dto.ts  ← Validasi request body PATCH
```

---

## 7. REST API DESIGN

### Auth Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Daftar akun baru |
| POST | `/auth/login` | ❌ | Login, dapat JWT |

**POST /auth/register**
```json
// Request Body
{
  "name": "Budi Santoso",
  "email": "budi@email.com",
  "password": "password123"
}

// Response 201
{
  "message": "Registrasi berhasil",
  "data": { "id": "clx...", "name": "Budi Santoso", "email": "budi@email.com" }
}
```

**POST /auth/login**
```json
// Request Body
{
  "email": "budi@email.com",
  "password": "password123"
}

// Response 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "clx...", "name": "Budi Santoso", "role": "USER" }
}
```

---

### Culinary Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/culinary` | ❌ | Daftar kuliner (filter + search + pagination) |
| GET | `/culinary/:id` | ❌ | Detail kuliner + menu + review |

**GET /culinary** (Query Params)
```
GET /culinary?search=bakso&category=mie&minPrice=5000&maxPrice=50000&page=1&limit=10

// Response 200
{
  "data": [
    {
      "id": "clx...",
      "name": "Bakso Pak Kumis",
      "address": "Jl. Soekarno Hatta No. 5",
      "rating": 4.5,
      "category": { "name": "Mie & Bakso" },
      "priceMin": 10000,
      "priceMax": 25000
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10 }
}
```

---

### Menu Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/culinary/:id/menus` | ❌ | Daftar menu per kuliner |

---

### Review Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/reviews` | ✅ USER | Tambah review |
| GET | `/reviews/culinary/:id` | ❌ | Lihat review per kuliner |

**POST /reviews**
```json
// Request Body + Header Authorization: Bearer <token>
{
  "culinaryPlaceId": "clx...",
  "rating": 5,
  "comment": "Baksonya enak banget, kuahnya gurih!"
}
```

---

### Bookmark Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/bookmarks` | ✅ USER | Tambah bookmark |
| DELETE | `/bookmarks/:culinaryPlaceId` | ✅ USER | Hapus bookmark |
| GET | `/bookmarks` | ✅ USER | Daftar bookmark user |

---

### Order Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/orders` | ✅ USER | Buat order baru |
| GET | `/orders/me` | ✅ USER | Riwayat order milik user |
| GET | `/orders/:id` | ✅ USER | Detail order |

**POST /orders**
```json
// Request Body
{
  "culinaryPlaceId": "clx...",
  "note": "Tidak pakai sambal",
  "items": [
    { "menuId": "clx...", "quantity": 2 },
    { "menuId": "clx...", "quantity": 1 }
  ]
}

// Response 201
{
  "message": "Order berhasil dibuat",
  "data": {
    "id": "clx...",
    "totalPrice": 45000,
    "status": "PENDING",
    "items": [...]
  }
}
```

---

### Payment Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/payments/checkout` | ✅ USER | Inisiasi pembayaran Midtrans |
| POST | `/payments/webhook` | ❌ (Midtrans) | Callback dari Midtrans |
| GET | `/payments/:orderId` | ✅ USER | Status pembayaran |

**POST /payments/checkout**
```json
// Request Body
{ "orderId": "clx..." }

// Response 200
{
  "snap_token": "abc123...",
  "payment_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123",
  "message": "Silakan selesaikan pembayaran"
}
```

---

### Admin Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/admin/culinary` | ✅ ADMIN | Tambah kuliner |
| PATCH | `/admin/culinary/:id` | ✅ ADMIN | Edit kuliner |
| DELETE | `/admin/culinary/:id` | ✅ ADMIN | Hapus kuliner |
| POST | `/admin/categories` | ✅ ADMIN | Tambah kategori |
| POST | `/admin/menus` | ✅ ADMIN | Tambah menu |
| PATCH | `/admin/menus/:id` | ✅ ADMIN | Edit menu |
| DELETE | `/admin/menus/:id` | ✅ ADMIN | Hapus menu |
| GET | `/admin/orders` | ✅ ADMIN | Semua transaksi |
| PATCH | `/admin/orders/:id/status` | ✅ ADMIN | Update status order |

---

## 8. JWT AUTHENTICATION FLOW

### Alur Register

```
1. User kirim POST /auth/register { name, email, password }
2. AuthService validasi email belum terdaftar
3. bcrypt.hash(password, 10)  ← hash dengan salt rounds 10
4. prisma.user.create({ data: { name, email, password: hashedPassword } })
5. Return { message: "Berhasil" } — JANGAN kembalikan password
```

### Alur Login & JWT

```
1. User kirim POST /auth/login { email, password }
2. prisma.user.findUnique({ where: { email } })
3. bcrypt.compare(plainPassword, hashedPassword)
4. Jika cocok: jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' })
5. Return { access_token: "eyJ..." }
```

### Struktur File Auth

```typescript
// src/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string; role: Role }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
    // Hasil ini jadi req.user di controller
  }
}
```

```typescript
// src/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // tidak ada role requirement

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

```typescript
// src/decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Cara pakai di controller:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Post('/admin/culinary')
createCulinary(@Body() dto: CreateCulinaryDto) { ... }
```

### RBAC Summary

| Endpoint | Guard yang Dipakai |
|---|---|
| Public (browse kuliner) | Tidak ada guard |
| User features (order, review, bookmark) | `JwtAuthGuard` |
| Admin features | `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.ADMIN)` |

---

## 9. PAYMENT GATEWAY FLOW (MIDTRANS)

### Cara Kerja Midtrans Snap

```
[User]              [NestJS Backend]              [Midtrans API]
   |                       |                            |
   |-- POST /payments/checkout                          |
   |   { orderId }         |                            |
   |                       |-- Ambil data order ------->|
   |                       |-- Buat transaction params  |
   |                       |-- POST ke Midtrans API --->|
   |                       |   /snap/v1/transactions    |
   |                       |<-- { token, redirect_url }--|
   |                       |-- Simpan payment record    |
   |<-- { snap_token, payment_url }                     |
   |                       |                            |
   |-- User membayar di browser/app Midtrans            |
   |                       |                            |
   |                  [Midtrans Webhook]                |
   |                  POST /payments/webhook            |
   |                       |                            |
   |                       |-- Verifikasi signature key |
   |                       |-- Parse notifikasi:        |
   |                       |   transaction_status       |
   |                       |   order_id                 |
   |                       |   fraud_status             |
   |                       |                            |
   |                       |-- if status == 'settlement'|
   |                       |   → payment.status = SUCCESS
   |                       |   → order.status = CONFIRMED
   |                       |                            |
   |                       |-- if status == 'expire'   |
   |                       |   → payment.status = EXPIRED
   |                       |   → order.status = CANCELLED
   |                       |                            |
   |-- GET /payments/:orderId                           |
   |<-- { paymentStatus: "SUCCESS", paidAt: "..." }     |
```

### Contoh Kode PaymentService

```typescript
// src/payments/payment.service.ts
import * as midtransClient from 'midtrans-client';

@Injectable()
export class PaymentService {
  private snap: midtransClient.Snap;

  constructor(private prisma: PrismaService) {
    this.snap = new midtransClient.Snap({
      isProduction: false, // ganti true saat production
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  async checkout(orderId: string, userId: string) {
    // 1. Ambil data order
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true, orderItems: { include: { menu: true } } },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 2. Buat parameter transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalPrice,
      },
      customer_details: {
        first_name: order.user.name,
        email: order.user.email,
      },
      item_details: order.orderItems.map((item) => ({
        id: item.menuId,
        price: item.price,
        quantity: item.quantity,
        name: item.menu.name,
      })),
    };

    // 3. Request ke Midtrans
    const transaction = await this.snap.createTransaction(parameter);

    // 4. Simpan payment di database
    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        transactionId: order.id, // gunakan orderId sebagai transactionId
        amount: order.totalPrice,
        snapToken: transaction.token,
        paymentUrl: transaction.redirect_url,
        paymentStatus: 'PENDING',
      },
    });

    return {
      snap_token: transaction.token,
      payment_url: transaction.redirect_url,
    };
  }

  async handleWebhook(notification: any) {
    // 1. Verifikasi signature dari Midtrans
    const hash = crypto
      .createHash('sha512')
      .update(
        notification.order_id +
          notification.status_code +
          notification.gross_amount +
          process.env.MIDTRANS_SERVER_KEY,
      )
      .digest('hex');

    if (hash !== notification.signature_key) {
      throw new UnauthorizedException('Signature tidak valid');
    }

    // 2. Tentukan status berdasarkan notifikasi
    const { transaction_status, fraud_status, order_id } = notification;

    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = PaymentStatus.SUCCESS;
        orderStatus = OrderStatus.CONFIRMED;
      }
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentStatus = PaymentStatus.FAILED;
      orderStatus = OrderStatus.CANCELLED;
    }

    // 3. Update database
    await this.prisma.payment.update({
      where: { orderId: order_id },
      data: { paymentStatus, paidAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: order_id },
      data: { status: orderStatus },
    });

    return { message: 'Webhook berhasil diproses' };
  }
}
```

### Status Transaksi Midtrans

| Status Midtrans | Artinya | Action |
|---|---|---|
| `settlement` | Pembayaran berhasil | payment=SUCCESS, order=CONFIRMED |
| `capture` | Kartu kredit berhasil | payment=SUCCESS, order=CONFIRMED |
| `pending` | Menunggu bayar | payment=PENDING |
| `expire` | Waktu bayar habis | payment=EXPIRED, order=CANCELLED |
| `cancel` | Dibatalkan | payment=FAILED, order=CANCELLED |
| `deny` | Ditolak bank | payment=FAILED |

---

## 10. LIBRARY & DEPENDENCIES

### Install Command Lengkap

```bash
# ===== CORE NESTJS =====
npm install @nestjs/common @nestjs/core @nestjs/platform-express

# ===== DATABASE (Prisma ORM) =====
npm install prisma @prisma/client
npx prisma init  # Inisialisasi prisma

# ===== AUTHENTICATION =====
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# ===== VALIDATION =====
npm install class-validator class-transformer

# ===== ENVIRONMENT VARIABLE =====
npm install @nestjs/config

# ===== API DOCUMENTATION (Swagger) =====
npm install @nestjs/swagger swagger-ui-express

# ===== PAYMENT GATEWAY =====
npm install midtrans-client
npm install -D @types/midtrans-client

# ===== SECURITY =====
npm install helmet compression
npm install cookie-parser
npm install -D @types/cookie-parser

# ===== LOGGING (Opsional) =====
npm install morgan
npm install -D @types/morgan
```

### Penjelasan Fungsi Tiap Library

| Library | Fungsi | Kenapa Dibutuhkan |
|---|---|---|
| `@nestjs/jwt` | Generate & verify JWT token | Autentikasi stateless |
| `passport` + `passport-jwt` | Strategy autentikasi | Ekstrak token dari header |
| `bcrypt` | Hash & compare password | Keamanan password |
| `class-validator` | Validasi DTO (request body) | Cegah data tidak valid masuk |
| `class-transformer` | Transform object (plain ↔ class) | Diperlukan class-validator |
| `@nestjs/config` | Baca file `.env` | Manajemen environment variable |
| `@nestjs/swagger` | Auto-generate API docs | Dokumentasi API di `/api` |
| `midtrans-client` | SDK Midtrans official | Buat transaksi, verifikasi webhook |
| `helmet` | Set HTTP security headers | Proteksi dari serangan umum |
| `compression` | Kompres response HTTP | Performa lebih baik |

---

## 11. INSTRUKSI EKSEKUSI UNTUK AI AGENT

> **Untuk AI Agent:** Baca seluruh dokumen ini terlebih dahulu, lalu eksekusi semua langkah di bawah ini secara berurutan dari Step 1 hingga Step 9 tanpa berhenti. Setiap step harus selesai sempurna sebelum melanjutkan ke step berikutnya. Buat semua file dengan konten lengkap dan fungsional — jangan buat placeholder atau komentar `// TODO`.

---

### STEP 1 — Inisialisasi Project & Instalasi Dependencies

Buat project NestJS baru, install semua dependency, buat file `.env`, dan inisialisasi Prisma.

```bash
npm i -g @nestjs/cli
nest new kuliner-backend --package-manager npm --skip-git
cd kuliner-backend
```

Install semua dependency sekaligus:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @nestjs/config class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
npm install midtrans-client helmet compression cookie-parser
npm install -D @types/passport-jwt @types/bcrypt @types/cookie-parser @types/compression
npm install prisma @prisma/client
npx prisma init
```

Buat file `.env` di root project dengan isi:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kuliner_db"
JWT_SECRET="kuliner_jwt_secret_super_aman_2024_xYzAbC123"
JWT_EXPIRES_IN="7d"
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxxxxxxxxxx"
MIDTRANS_IS_PRODUCTION=false
PORT=3000
NODE_ENV=development
```

Timpa `prisma/schema.prisma` dengan schema lengkap dari **Bagian 5** dokumen ini.

Jalankan migrasi:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### STEP 2 — Buat Struktur Folder & File Dasar

Buat semua folder dan file berikut sesuai struktur di **Bagian 12**. Eksekusi pembuatan folder terlebih dahulu:

```bash
mkdir -p src/prisma
mkdir -p src/auth/dto src/auth/strategies
mkdir -p src/users
mkdir -p src/culinary/dto
mkdir -p src/categories/dto
mkdir -p src/menus/dto
mkdir -p src/reviews/dto
mkdir -p src/bookmarks
mkdir -p src/orders/dto
mkdir -p src/payments
mkdir -p src/admin/dto
mkdir -p src/guards
mkdir -p src/decorators
mkdir -p src/common/filters src/common/interceptors
```

---

### STEP 3 — Prisma Module

Buat `src/prisma/prisma.service.ts` dengan konten:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Buat `src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

### STEP 4 — Guards & Decorators

Buat `src/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Buat `src/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

Buat `src/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
```

Buat `src/decorators/get-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) return request.user?.[data];
    return request.user;
  },
);
```

Buat `src/common/filters/http-exception.filter.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' ? (message as any).message : message,
    });
  }
}
```

Buat `src/common/interceptors/response.interceptor.ts`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
```

---

### STEP 5 — Auth Module (Register, Login, JWT Strategy)

Buat `src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'budi@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
```

Buat `src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'budi@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}
```

Buat `src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Token tidak valid');
    return { id: user.id, email: user.email, role: user.role, name: user.name };
  }
}
```

Buat `src/auth/auth.service.ts`:

```typescript
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email sudah terdaftar');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return { message: 'Registrasi berhasil', user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email atau password salah');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
```

Buat `src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Daftar akun baru' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan JWT token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

Buat `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

---

### STEP 6 — Culinary, Category, Menu, Review, Bookmark Modules

Buat setiap module dengan pola yang sama: **DTO → Service → Controller → Module**.

#### 6a. Category Module

Buat `src/categories/dto/create-category.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mie & Bakso' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'mie-bakso' })
  @IsString()
  slug: string;
}
```

Buat `src/categories/categories.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug sudah digunakan');
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Kategori berhasil dihapus' };
  }
}
```

Buat `src/categories/categories.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua kategori' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah kategori baru' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
```

Buat `src/categories/categories.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

#### 6b. Culinary Module

Buat `src/culinary/dto/create-culinary.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCulinaryDto {
  @ApiProperty({ example: 'Bakso Pak Kumis' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bakso legendaris sejak 1990' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Jl. Soekarno Hatta No. 5, Malang' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiProperty({ example: 'category-id-here' })
  @IsString()
  categoryId: string;
}
```

Buat `src/culinary/dto/query-culinary.dto.ts`:

```typescript
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCulinaryDto {
  @ApiPropertyOptional({ example: 'bakso' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
```

Buat `src/culinary/culinary.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCulinaryDto } from './dto/create-culinary.dto';
import { QueryCulinaryDto } from './dto/query-culinary.dto';

@Injectable()
export class CulinaryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryCulinaryDto) {
    const { search, categoryId, minPrice, maxPrice, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (minPrice !== undefined) where.priceMin = { gte: minPrice };
    if (maxPrice !== undefined) where.priceMax = { lte: maxPrice };

    const [data, total] = await Promise.all([
      this.prisma.culinaryPlace.findMany({
        where,
        skip,
        take: limit,
        include: { category: true },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.culinaryPlace.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id },
      include: {
        category: true,
        menus: { where: { isAvailable: true } },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');
    return place;
  }

  async create(dto: CreateCulinaryDto) {
    return this.prisma.culinaryPlace.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: string, dto: Partial<CreateCulinaryDto>) {
    await this.findOne(id);
    return this.prisma.culinaryPlace.update({ where: { id }, data: dto, include: { category: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.culinaryPlace.update({ where: { id }, data: { isActive: false } });
    return { message: 'Kuliner berhasil dihapus' };
  }
}
```

Buat `src/culinary/culinary.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CulinaryService } from './culinary.service';
import { CreateCulinaryDto } from './dto/create-culinary.dto';
import { QueryCulinaryDto } from './dto/query-culinary.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Culinary')
@Controller('culinary')
export class CulinaryController {
  constructor(private culinaryService: CulinaryService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar kuliner (search, filter, pagination)' })
  findAll(@Query() query: QueryCulinaryDto) {
    return this.culinaryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kuliner + menu + review' })
  findOne(@Param('id') id: string) {
    return this.culinaryService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah kuliner baru' })
  create(@Body() dto: CreateCulinaryDto) {
    return this.culinaryService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCulinaryDto>) {
    return this.culinaryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.culinaryService.remove(id);
  }
}
```

Buat `src/culinary/culinary.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CulinaryController } from './culinary.controller';
import { CulinaryService } from './culinary.service';

@Module({
  controllers: [CulinaryController],
  providers: [CulinaryService],
  exports: [CulinaryService],
})
export class CulinaryModule {}
```

#### 6c. Menu Module

Buat `src/menus/dto/create-menu.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ example: 'Bakso Campur' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bakso isi daging sapi + tahu + mie' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/bakso.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;
}
```

Buat `src/menus/menus.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string) {
    return this.prisma.menu.findMany({
      where: { culinaryPlaceId, isAvailable: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateMenuDto>) {
    await this.findOne(id);
    return this.prisma.menu.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.menu.update({ where: { id }, data: { isAvailable: false } });
    return { message: 'Menu berhasil dihapus' };
  }
}
```

Buat `src/menus/menus.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Menus')
@Controller()
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Get('culinary/:culinaryId/menus')
  @ApiOperation({ summary: 'Daftar menu per kuliner' })
  findByCulinary(@Param('culinaryId') culinaryId: string) {
    return this.menusService.findByCulinary(culinaryId);
  }

  @Post('menus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah menu baru' })
  create(@Body() dto: CreateMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch('menus/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateMenuDto>) {
    return this.menusService.update(id, dto);
  }

  @Delete('menus/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }
}
```

Buat `src/menus/menus.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

@Module({
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
```

#### 6d. Review Module

Buat `src/reviews/dto/create-review.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Baksonya enak banget, kuahnya gurih!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
```

Buat `src/reviews/reviews.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string) {
    return this.prisma.review.findMany({
      where: { culinaryPlaceId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id: dto.culinaryPlaceId },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');

    const review = await this.prisma.review.create({
      data: { userId, culinaryPlaceId: dto.culinaryPlaceId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, name: true } } },
    });

    // Recalculate average rating
    const reviews = await this.prisma.review.findMany({
      where: { culinaryPlaceId: dto.culinaryPlaceId },
      select: { rating: true },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.prisma.culinaryPlace.update({
      where: { id: dto.culinaryPlaceId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return review;
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review berhasil dihapus' };
  }
}
```

Buat `src/reviews/reviews.controller.ts`:

```typescript
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('culinary/:culinaryId')
  @ApiOperation({ summary: 'Daftar review per kuliner' })
  findByCulinary(@Param('culinaryId') culinaryId: string) {
    return this.reviewsService.findByCulinary(culinaryId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tambah review kuliner' })
  create(@GetUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Hapus review' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
```

Buat `src/reviews/reviews.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
```

#### 6e. Bookmark Module

Buat `src/bookmarks/bookmarks.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      include: { culinaryPlace: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, culinaryPlaceId: string) {
    const exists = await this.prisma.bookmark.findUnique({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    if (exists) throw new ConflictException('Sudah dibookmark');

    return this.prisma.bookmark.create({
      data: { userId, culinaryPlaceId },
      include: { culinaryPlace: true },
    });
  }

  async remove(userId: string, culinaryPlaceId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    if (!bookmark) throw new NotFoundException('Bookmark tidak ditemukan');
    await this.prisma.bookmark.delete({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    return { message: 'Bookmark berhasil dihapus' };
  }
}
```

Buat `src/bookmarks/bookmarks.controller.ts`:

```typescript
import { Controller, Get, Post, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';

class CreateBookmarkDto {
  @IsString()
  culinaryPlaceId: string;
}

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar bookmark user' })
  findAll(@GetUser('id') userId: string) {
    return this.bookmarksService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah bookmark' })
  create(@GetUser('id') userId: string, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(userId, dto.culinaryPlaceId);
  }

  @Delete(':culinaryPlaceId')
  @ApiOperation({ summary: 'Hapus bookmark' })
  remove(@GetUser('id') userId: string, @Param('culinaryPlaceId') culinaryPlaceId: string) {
    return this.bookmarksService.remove(userId, culinaryPlaceId);
  }
}
```

Buat `src/bookmarks/bookmarks.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';

@Module({
  controllers: [BookmarksController],
  providers: [BookmarksService],
})
export class BookmarksModule {}
```

---

### STEP 7 — Order Module

Buat `src/orders/dto/create-order.dto.ts`:

```typescript
import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'menu-id-here' })
  @IsString()
  menuId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;

  @ApiPropertyOptional({ example: 'Tidak pakai sambal' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

Buat `src/orders/orders.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Validasi semua menu dan stok
    const menuIds = dto.items.map((i) => i.menuId);
    const menus = await this.prisma.menu.findMany({
      where: { id: { in: menuIds }, culinaryPlaceId: dto.culinaryPlaceId, isAvailable: true },
    });

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('Beberapa menu tidak ditemukan atau tidak tersedia');
    }

    // Hitung total harga & validasi stok
    let totalPrice = 0;
    const itemsWithPrice = dto.items.map((item) => {
      const menu = menus.find((m) => m.id === item.menuId);
      if (menu.stock < item.quantity) {
        throw new BadRequestException(`Stok menu "${menu.name}" tidak mencukupi`);
      }
      totalPrice += menu.price * item.quantity;
      return { menuId: item.menuId, quantity: item.quantity, price: menu.price };
    });

    // Buat order dalam satu transaksi
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          culinaryPlaceId: dto.culinaryPlaceId,
          totalPrice,
          note: dto.note,
          orderItems: { create: itemsWithPrice },
        },
        include: {
          orderItems: { include: { menu: true } },
          culinaryPlace: { select: { id: true, name: true } },
        },
      });

      // Kurangi stok
      for (const item of dto.items) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        culinaryPlace: { select: { id: true, name: true, imageUrl: true } },
        orderItems: { include: { menu: { select: { id: true, name: true, imageUrl: true } } } },
        payment: { select: { paymentStatus: true, paymentUrl: true, paidAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        culinaryPlace: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        culinaryPlace: { select: { id: true, name: true } },
        payment: { select: { paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }
}
```

Buat `src/orders/orders.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Role } from '@prisma/client';

class UpdateOrderStatusDto {
  @IsString()
  status: string;
}

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Buat order baru' })
  create(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Riwayat order user' })
  findMyOrders(@GetUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail order' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Semua order' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update status order' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
```

Buat `src/orders/orders.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

---

### STEP 8 — Payment Module (Midtrans)

Buat `src/payments/payments.service.ts`:

```typescript
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private snap: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const midtransClient = require('midtrans-client');
    this.snap = new midtransClient.Snap({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.get('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.get('MIDTRANS_CLIENT_KEY'),
    });
  }

  async checkout(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { menu: { select: { name: true } } } },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.payment) throw new BadRequestException('Order sudah memiliki pembayaran');

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalPrice,
      },
      customer_details: {
        first_name: order.user.name,
        email: order.user.email,
      },
      item_details: order.orderItems.map((item) => ({
        id: item.menuId,
        price: item.price,
        quantity: item.quantity,
        name: item.menu.name,
      })),
    };

    const transaction = await this.snap.createTransaction(parameter);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        transactionId: order.id,
        amount: order.totalPrice,
        snapToken: transaction.token,
        paymentUrl: transaction.redirect_url,
        paymentStatus: 'PENDING',
      },
    });

    return {
      snap_token: transaction.token,
      payment_url: transaction.redirect_url,
      payment_id: payment.id,
    };
  }

  async handleWebhook(notification: any) {
    const serverKey = this.config.get('MIDTRANS_SERVER_KEY');
    const hash = crypto
      .createHash('sha512')
      .update(
        notification.order_id +
          notification.status_code +
          notification.gross_amount +
          serverKey,
      )
      .digest('hex');

    if (hash !== notification.signature_key) {
      throw new UnauthorizedException('Signature tidak valid');
    }

    const { transaction_status, fraud_status, order_id } = notification;

    let paymentStatus: string;
    let orderStatus: string;

    if (
      transaction_status === 'capture' ||
      transaction_status === 'settlement'
    ) {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = 'SUCCESS';
        orderStatus = 'CONFIRMED';
      } else {
        paymentStatus = 'FAILED';
        orderStatus = 'CANCELLED';
      }
    } else if (['cancel', 'deny'].includes(transaction_status)) {
      paymentStatus = 'FAILED';
      orderStatus = 'CANCELLED';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'EXPIRED';
      orderStatus = 'CANCELLED';
    } else {
      return { message: 'Status pending, tidak ada perubahan' };
    }

    await this.prisma.payment.update({
      where: { transactionId: order_id },
      data: {
        paymentStatus: paymentStatus as any,
        paymentMethod: notification.payment_type,
        paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
      },
    });

    await this.prisma.order.update({
      where: { id: order_id },
      data: { status: orderStatus as any },
    });

    return { message: 'Webhook berhasil diproses' };
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { order: { id: orderId, userId } },
      include: { order: { select: { id: true, status: true, totalPrice: true } } },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');
    return payment;
  }
}
```

Buat `src/payments/payments.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';

class CheckoutDto {
  @IsString()
  orderId: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inisiasi pembayaran via Midtrans' })
  checkout(@GetUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.paymentsService.checkout(dto.orderId, userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook callback dari Midtrans (jangan dipanggil manual)' })
  webhook(@Body() notification: any) {
    return this.paymentsService.handleWebhook(notification);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cek status pembayaran berdasarkan orderId' })
  getStatus(@Param('orderId') orderId: string, @GetUser('id') userId: string) {
    return this.paymentsService.getPaymentStatus(orderId, userId);
  }
}
```

Buat `src/payments/payments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
```

---

### STEP 9 — App Module & main.ts

Timpa `src/app.module.ts` dengan:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CulinaryModule } from './culinary/culinary.module';
import { CategoriesModule } from './categories/categories.module';
import { MenusModule } from './menus/menus.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CulinaryModule,
    CategoriesModule,
    MenusModule,
    ReviewsModule,
    BookmarksModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
```

Timpa `src/main.ts` dengan:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Website Rekomendasi Kuliner Lokal')
    .setDescription('REST API Backend untuk sistem rekomendasi kuliner')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server berjalan di: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
```

Buat `prisma/seed.ts` untuk data dummy:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kuliner.com' },
    update: {},
    create: { name: 'Admin Kuliner', email: 'admin@kuliner.com', password: adminPassword, role: 'ADMIN' },
  });

  // User biasa
  const userPassword = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@kuliner.com' },
    update: {},
    create: { name: 'User Test', email: 'user@kuliner.com', password: userPassword, role: 'USER' },
  });

  // Kategori
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'mie-bakso' }, update: {}, create: { name: 'Mie & Bakso', slug: 'mie-bakso' } }),
    prisma.category.upsert({ where: { slug: 'nasi' }, update: {}, create: { name: 'Nasi', slug: 'nasi' } }),
    prisma.category.upsert({ where: { slug: 'minuman' }, update: {}, create: { name: 'Minuman', slug: 'minuman' } }),
  ]);

  // Kuliner
  const place = await prisma.culinaryPlace.create({
    data: {
      name: 'Bakso Pak Kumis',
      description: 'Bakso legendaris sejak 1990 dengan kuah gurih khas Malang',
      address: 'Jl. Soekarno Hatta No. 5, Malang',
      categoryId: categories[0].id,
      priceMin: 10000,
      priceMax: 25000,
      rating: 4.5,
    },
  });

  // Menu
  await prisma.menu.createMany({
    data: [
      { name: 'Bakso Campur', price: 15000, stock: 50, culinaryPlaceId: place.id },
      { name: 'Bakso Urat', price: 18000, stock: 30, culinaryPlaceId: place.id },
      { name: 'Bakso Halus', price: 15000, stock: 40, culinaryPlaceId: place.id },
      { name: 'Es Teh Manis', price: 5000, stock: 100, culinaryPlaceId: place.id },
    ],
  });

  console.log('✅ Seed data berhasil dimasukkan');
  console.log('📧 Admin: admin@kuliner.com | 🔑 Password: admin123');
  console.log('📧 User:  user@kuliner.com  | 🔑 Password: user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Tambahkan script seed ke `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Jalankan seed:

```bash
npx prisma db seed
npm run start:dev
```

---

### Verifikasi Akhir

Setelah semua file dibuat dan server berjalan, pastikan endpoint berikut bisa diakses:

```
GET  http://localhost:3000/api        → Swagger UI
POST http://localhost:3000/auth/register
POST http://localhost:3000/auth/login
GET  http://localhost:3000/culinary
GET  http://localhost:3000/categories
```

---

## 12. STRUKTUR FOLDER

```
kuliner-backend/
├── prisma/
│   ├── schema.prisma          ← Definisi schema database
│   ├── migrations/            ← History migrasi database
│   └── seed.ts                ← Data dummy untuk development
│
├── src/
│   ├── auth/                  ← Autentikasi (register, login, JWT)
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   └── login.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                 ← Data & profil user
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   ├── culinary/              ← Data tempat kuliner
│   │   ├── dto/
│   │   │   ├── create-culinary.dto.ts
│   │   │   └── query-culinary.dto.ts  ← Untuk filter & search
│   │   ├── culinary.controller.ts
│   │   ├── culinary.service.ts
│   │   └── culinary.module.ts
│   │
│   ├── categories/            ← Kategori kuliner
│   │   ├── dto/
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   └── categories.module.ts
│   │
│   ├── menus/                 ← Menu makanan per kuliner
│   │   ├── dto/
│   │   ├── menus.controller.ts
│   │   ├── menus.service.ts
│   │   └── menus.module.ts
│   │
│   ├── reviews/               ← Review & rating
│   │   ├── dto/
│   │   ├── reviews.controller.ts
│   │   ├── reviews.service.ts
│   │   └── reviews.module.ts
│   │
│   ├── bookmarks/             ← Simpan favorit kuliner
│   │   ├── bookmarks.controller.ts
│   │   ├── bookmarks.service.ts
│   │   └── bookmarks.module.ts
│   │
│   ├── orders/                ← Manajemen order
│   │   ├── dto/
│   │   │   └── create-order.dto.ts
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   └── orders.module.ts
│   │
│   ├── payments/              ← Integrasi Midtrans
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   │
│   ├── admin/                 ← Fitur khusus admin
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   │
│   ├── prisma/                ← Database service
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   ├── guards/                ← JWT & Role guard
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── decorators/            ← Custom decorator
│   │   ├── roles.decorator.ts
│   │   └── get-user.decorator.ts  ← Ambil data user dari request
│   │
│   ├── common/                ← Shared utilities
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── interceptors/
│   │       └── response.interceptor.ts  ← Standarisasi format response
│   │
│   ├── config/                ← Konfigurasi aplikasi
│   │   └── app.config.ts
│   │
│   ├── app.module.ts          ← Root module, import semua module
│   └── main.ts                ← Entry point aplikasi
│
├── .env                       ← Environment variables (JANGAN di-commit)
├── .env.example               ← Template .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 13. CHECKLIST EKSEKUSI AI AGENT

> AI agent wajib mencentang semua item berikut secara berurutan. Jangan lewati satu pun. Setiap item harus benar-benar dibuat dengan kode yang fungsional, bukan placeholder.

### Phase 1 — Fondasi

- [ ] Project NestJS berhasil dibuat (`nest new kuliner-backend`)
- [ ] Semua dependency terinstall tanpa error
- [ ] File `.env` dibuat dengan semua variable yang dibutuhkan
- [ ] `prisma/schema.prisma` terisi lengkap sesuai Bagian 5
- [ ] `npx prisma migrate dev --name init` berhasil
- [ ] `npx prisma generate` berhasil
- [ ] Semua folder struktur di `src/` sudah dibuat

### Phase 2 — Core Infrastructure

- [ ] `PrismaService` dibuat dan bisa di-inject ke semua module
- [ ] `JwtAuthGuard` dibuat
- [ ] `RolesGuard` dibuat
- [ ] `@Roles()` decorator dibuat
- [ ] `@GetUser()` decorator dibuat
- [ ] `AllExceptionsFilter` dibuat
- [ ] `ResponseInterceptor` dibuat

### Phase 3 — Auth

- [ ] `RegisterDto` dengan validasi class-validator
- [ ] `LoginDto` dengan validasi class-validator
- [ ] `JwtStrategy` terhubung ke PrismaService
- [ ] `AuthService.register()` dengan bcrypt hash
- [ ] `AuthService.login()` dengan JWT sign
- [ ] `POST /auth/register` bisa diakses dan return token
- [ ] `POST /auth/login` bisa diakses dan return token

### Phase 4 — Kuliner & Kategori

- [ ] `CategoriesService` dengan CRUD lengkap
- [ ] `GET /categories` publik bisa diakses
- [ ] `POST /categories` hanya bisa diakses ADMIN
- [ ] `CulinaryService` dengan search + filter + pagination
- [ ] `GET /culinary` bisa filter by search, categoryId, harga
- [ ] `GET /culinary/:id` return data lengkap + menus + reviews

### Phase 5 — Menu, Review, Bookmark

- [ ] `MenusService` dengan CRUD
- [ ] `GET /culinary/:id/menus` bisa diakses publik
- [ ] `ReviewsService` dengan auto-recalculate rating
- [ ] `POST /reviews` perlu JWT, rating 1–5
- [ ] `BookmarksService` dengan unique constraint per user
- [ ] `POST /bookmarks` dan `DELETE /bookmarks/:id` berfungsi

### Phase 6 — Order

- [ ] `OrdersService.create()` dengan validasi stok & hitung total harga
- [ ] Stok menu berkurang setelah order dibuat (Prisma transaction)
- [ ] `POST /orders` berfungsi dan return order dengan items
- [ ] `GET /orders/me` return riwayat order user yang login
- [ ] `GET /orders` (admin) return semua order
- [ ] `PATCH /orders/:id/status` (admin) berfungsi

### Phase 7 — Payment

- [ ] `PaymentsService` terhubung ke Midtrans Snap SDK
- [ ] `POST /payments/checkout` generate snap_token dan payment_url
- [ ] `POST /payments/webhook` verify signature dan update status
- [ ] `GET /payments/:orderId` return status pembayaran

### Phase 8 — Finalisasi

- [ ] `AppModule` import semua module dengan benar
- [ ] `main.ts` setup: helmet, cors, ValidationPipe, AllExceptionsFilter, ResponseInterceptor, Swagger
- [ ] `prisma/seed.ts` dibuat dengan data admin, user, kategori, kuliner, dan menu
- [ ] `npx prisma db seed` berhasil tanpa error
- [ ] `npm run start:dev` berjalan tanpa error
- [ ] Swagger UI bisa diakses di `http://localhost:3000/api`

---

## 14. FLOWCHART SISTEM (ASCII)

```
╔══════════════════════════════════════════════════════════════════╗
║              WEBSITE REKOMENDASI KULINER LOKAL                   ║
║                    BACKEND SYSTEM FLOW                           ║
╚══════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                              │
└────────────────────────────────────────────────────────────────┘

  [Mulai]
     │
     ▼
 ┌──────────────────────┐
 │  Sudah punya akun?   │
 └──────────────────────┘
     │              │
    TIDAK           YA
     │              │
     ▼              ▼
┌─────────┐    ┌─────────┐
│REGISTER │    │  LOGIN  │
│POST     │    │POST     │
│/auth/   │    │/auth/   │
│register │    │login    │
└────┬────┘    └────┬────┘
     │              │
     └──────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Dapat JWT     │
    │ access_token  │
    │ (simpan di    │
    │  client)      │
    └───────┬───────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                    BROWSE KULINER                             │
│                                                               │
│  GET /culinary?search=bakso&category=mie&minPrice=10000       │
│                                                               │
│  ┌──────────┐    ┌──────────────────────────────────────┐    │
│  │ Filter   │    │ Hasil: List kuliner + rating + harga  │    │
│  │ - Search │───►│                                      │    │
│  │ - Kategori│   │ [Bakso Pak Kumis ⭐4.5 Rp10-25rb]    │    │
│  │ - Harga  │    │ [Nasi Goreng Bu Sari ⭐4.2 Rp12rb]  │    │
│  └──────────┘    └──────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │ Pilih Kuliner │
    │ GET /culinary │
    │ /:id          │
    └───────┬───────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                   DETAIL KULINER                              │
│                                                               │
│  • Info tempat (nama, alamat, rating)                         │
│  • Daftar Menu + Harga                                        │
│  • Review dari user lain                                      │
│                                                               │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │ BOOKMARK │  │ TULIS REVIEW│  │    BUAT ORDER          │  │
│  │ POST     │  │ POST        │  │    POST /orders        │  │
│  │ /bookmarks│ │ /reviews    │  │    { items, note }     │  │
│  └──────────┘  └─────────────┘  └───────────┬────────────┘  │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │  Order Dibuat    │
                                    │  Status: PENDING │
                                    │  Total: Rp 45rb  │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                  ┌────────────────────┐
                                  │  CHECKOUT          │
                                  │  POST              │
                                  │  /payments/checkout│
                                  │  { orderId }       │
                                  └────────┬───────────┘
                                           │
                                           ▼
                              ┌────────────────────────────┐
                              │  Backend request ke         │
                              │  MIDTRANS API               │
                              │                             │
                              │  → Kirim data order        │
                              │  ← Terima snap_token       │
                              │  ← Terima payment_url      │
                              └────────────┬───────────────┘
                                           │
                                           ▼
                              ┌────────────────────────────┐
                              │  User membayar di          │
                              │  halaman Midtrans          │
                              │  (QRIS / Transfer / dll)   │
                              └────────────┬───────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                         BERHASIL                    GAGAL/EXPIRED
                              │                         │
                              ▼                         ▼
                   ┌──────────────────┐      ┌──────────────────┐
                   │ Midtrans Webhook │      │ Midtrans Webhook │
                   │ POST             │      │ POST             │
                   │ /payments/webhook│      │ /payments/webhook│
                   │                  │      │                  │
                   │ status=settlement│      │ status=expire    │
                   └────────┬─────────┘      └────────┬─────────┘
                            │                         │
                            ▼                         ▼
                 ┌────────────────────┐   ┌────────────────────┐
                 │ payment → SUCCESS  │   │ payment → EXPIRED  │
                 │ order  → CONFIRMED │   │ order  → CANCELLED │
                 └────────┬───────────┘   └────────────────────┘
                          │
                          ▼
               ┌────────────────────────┐
               │  Lihat Riwayat Order   │
               │  GET /orders/me        │
               │                        │
               │  [Order #001 CONFIRMED]│
               │  Bakso Pak Kumis       │
               │  Rp 45.000 ✓ Dibayar  │
               └────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                      ADMIN FLOW                                │
└────────────────────────────────────────────────────────────────┘

  [Admin Login]
       │
       ▼
  ┌─────────┐
  │  LOGIN  │  POST /auth/login
  │  role:  │  ← JWT payload berisi role=ADMIN
  │  ADMIN  │
  └────┬────┘
       │
       ▼
  ┌────────────────────────────────────────────────────────────┐
  │                   ADMIN DASHBOARD                          │
  ├────────────────────────────────────────────────────────────┤
  │                                                            │
  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
  │  │ KELOLA       │  │ KELOLA       │  │ LIHAT TRANSAKSI │  │
  │  │ KULINER      │  │ MENU         │  │                 │  │
  │  │              │  │              │  │ GET             │  │
  │  │ POST/PATCH   │  │ POST/PATCH   │  │ /admin/orders   │  │
  │  │ DELETE       │  │ DELETE       │  │                 │  │
  │  │ /admin/      │  │ /admin/menus │  │ PATCH status:   │  │
  │  │ culinary     │  │              │  │ CONFIRMED       │  │
  │  └──────────────┘  └──────────────┘  │ PROCESSING      │  │
  │                                      │ COMPLETED       │  │
  │  ┌──────────────┐                    └─────────────────┘  │
  │  │ KELOLA       │                                          │
  │  │ KATEGORI     │                                          │
  │  │              │                                          │
  │  │ POST/PATCH   │                                          │
  │  │ DELETE       │                                          │
  │  │ /admin/      │                                          │
  │  │ categories   │                                          │
  │  └──────────────┘                                          │
  └────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                  ARSITEKTUR TEKNIS                             │
└────────────────────────────────────────────────────────────────┘

  HTTP Request
      │
      ▼
  ┌──────────────────────────────────────────────────────┐
  │                 NestJS Application                   │
  │                                                      │
  │  ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
  │  │ Helmet   │   │ CORS     │   │ Compression      │ │
  │  │ (Security)│  │          │   │                  │ │
  │  └────┬─────┘   └────┬─────┘   └─────────┬────────┘ │
  │       └──────────────┴──────────────────┘           │
  │                       │                              │
  │                       ▼                              │
  │  ┌────────────────────────────────────────────────┐  │
  │  │              Global Validation Pipe            │  │
  │  │   class-validator + class-transformer          │  │
  │  └────────────────────┬───────────────────────────┘  │
  │                       │                              │
  │                       ▼                              │
  │  ┌─────────────────────────────────────────────┐    │
  │  │                  GUARDS                     │    │
  │  │  JwtAuthGuard ──► Verifikasi token valid    │    │
  │  │  RolesGuard   ──► Verifikasi role user      │    │
  │  └──────────────────────┬──────────────────────┘    │
  │                         │                            │
  │                         ▼                            │
  │  ┌─────────────────────────────────────────────┐    │
  │  │               CONTROLLER                   │    │
  │  │  Terima request → panggil service          │    │
  │  └──────────────────────┬──────────────────────┘    │
  │                         │                            │
  │                         ▼                            │
  │  ┌─────────────────────────────────────────────┐    │
  │  │                SERVICE                      │    │
  │  │  Business logic → panggil Prisma ORM        │    │
  │  └──────────────────────┬──────────────────────┘    │
  │                         │                            │
  │                         ▼                            │
  │  ┌─────────────────────────────────────────────┐    │
  │  │              PRISMA SERVICE                 │    │
  │  │  Database queries → PostgreSQL              │    │
  │  └──────────────────────┬──────────────────────┘    │
  └─────────────────────────┼────────────────────────── ┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │  Database     │
                    └───────────────┘
```

---

## Catatan Penting

### Environment Variables (`.env`)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/kuliner_db"

# JWT
JWT_SECRET="ganti_dengan_string_random_panjang_minimal_32_karakter"
JWT_EXPIRES_IN="7d"

# Midtrans (ambil dari https://dashboard.sandbox.midtrans.com)
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxxxxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxxxxxxxxxxxxxx"
MIDTRANS_IS_PRODUCTION=false

# App
PORT=3000
NODE_ENV=development
```

### Testing Webhook Midtrans (Development)

Karena webhook perlu URL publik, gunakan **ngrok** untuk testing local:

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000

# Copy URL dari ngrok, contoh:
# https://abc123.ngrok.io

# Set di Midtrans Dashboard → Settings → Configuration
# Payment Notification URL: https://abc123.ngrok.io/payments/webhook
```

### Postman Collection

Buat collection Postman dengan environment variable:
- `base_url` = `http://localhost:3000`
- `token` = isi setelah login (gunakan Tests script untuk auto-set)

```javascript
// Postman Tests script setelah login:
const response = pm.response.json();
pm.environment.set("token", response.access_token);
```

---

> 📌 **Blueprint ini dibuat untuk project sekolah/portfolio.**
> Fokus pada fitur MVP terlebih dahulu, lalu tambahkan fitur bonus jika waktu memungkinkan.
> Gunakan Midtrans **Sandbox** (bukan Production) selama development.