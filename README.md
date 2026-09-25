# Plastindo Twins - Inventory Stock System

Sistem manajemen stok barang (*inventory stock*) full-stack yang dirancang berdasarkan [inventory-stock.md](inventory-stock.md) dan [rencana-implementasi.md](rencana-implementasi.md).

---

## 📁 Struktur Direktori

```text
plastindotwins/
├── backend/                   # REST API (Node.js Express + Prisma ORM)
│   ├── prisma/
│   │   └── schema.prisma      # Skema database PostgreSQL
│   ├── src/
│   │   ├── controllers/       # Controller bisnis (Auth, Product & Mutasi Stok)
│   │   ├── middleware/        # Autentikasi JWT & Role-Based Access Control (RBAC)
│   │   ├── routes/            # Rute Express API
│   │   └── server.js          # Entrypoint server Express
│   ├── .env.example
│   └── package.json
│
├── frontend/                  # Antarmuka Pengguna (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/        # Dashboard, AuthModal, dll.
│   │   ├── services/          # Client API Axios dengan interceptor JWT
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml         # Container PostgreSQL lokal
├── inventory-stock.md         # Blueprint & panduan arsitektur
├── rencana-implementasi.md    # Detail spesifikasi teknis
└── README.md
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Menjalankan Database PostgreSQL

Jalankan container PostgreSQL via Docker Compose:

```bash
docker compose up -d
```

*(Database akan berjalan pada port default `5432` dengan database `plastindo_inventory`)*

---

### 2. Menjalankan Backend (Express + Prisma)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pastikan file `.env` sudah sesuai (salin dari `.env.example` jika belum):
   ```bash
   cp .env.example .env
   ```
3. Generate client Prisma & jalankan migrasi database:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Jalankan backend server:
   ```bash
   npm run dev
   ```
   *(Backend akan berjalan di `http://localhost:5001`)*

---

### 3. Menjalankan Frontend (React + Vite)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pastikan file `.env` sudah ada:
   ```bash
   cp .env.example .env
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```
   *(Frontend akan berjalan di `http://localhost:3001`)*

---

## 🔒 Fitur Keamanan & Peran (Role)

| Role | Hak Akses |
| :--- | :--- |
| **ADMIN** | Melihat produk, menambah produk baru, penyesuaian stok (*Stock In / Out*), update detail, dan hapus barang. |
| **STAFF** | Melihat daftar produk dan melakukan penyesuaian stok (*Stock In / Out*). |
| **Publik** | Login & Registrasi pengguna baru. |

---

## 🧪 Endpoint REST API Utama

| Method | Endpoint | Deskripsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Mendaftarkan akun Admin/Staff baru | Publik |
| `POST` | `/api/auth/login` | Login & mendapatkan Bearer Token JWT | Publik |
| `GET` | `/api/auth/me` | Memeriksa data user yang sedang aktif | Bearer Token |
| `GET` | `/api/products` | Mengambil seluruh daftar inventori & status stok | Bearer Token |
| `POST` | `/api/products/create` | Menambah master produk baru ke sistem | `ADMIN` |
| `POST` | `/api/products/adjust-stock` | Mutasi stok masuk (*IN*) atau keluar (*OUT*) | `ADMIN` & `STAFF` |
| `PUT` | `/api/products/:id` | Mengubah informasi produk | `ADMIN` |
| `DELETE`| `/api/products/:id` | Menghapus produk dari sistem | `ADMIN` |
| `GET` | `/api/sales` | Mengambil seluruh riwayat penjualan & detail item | Bearer Token |
| `POST` | `/api/sales` | Transaksi penjualan baru (auto deduct stok via ACID) | `ADMIN` & `STAFF` |
| `GET` | `/api/purchases` | Mengambil seluruh riwayat pembelian PO & item | Bearer Token |
| `POST` | `/api/purchases` | Transaksi pembelian baru (auto increase stok via ACID) | `ADMIN` & `STAFF` |
