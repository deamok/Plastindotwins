# Panduan Pengembangan Aplikasi Inventory Stock (Full-Stack)

Dokumen ini berisi panduan lengkap untuk membangun aplikasi manajemen stok barang (*inventory stock*), mulai dari **Backend**, **Middleware**, hingga **Frontend**.

---

## 🏗️ 1. Arsitektur & Teknologi

Aplikasi ini menggunakan arsitektur **3-Tier** yang memisahkan antara penyimpanan data, logika bisnis, dan antarmuka pengguna.

| Lapisan (Tier) | Teknologi yang Direkomendasikan | Peran/Fungsi |
| :--- | :--- | :--- |
| **Backend** | Node.js (Express.js) / Python (FastAPI) | Menyediakan API, mengelola database, dan enkripsi data. |
| **Middleware** | Express Middleware / FastAPI Dependencies | Validasi data, autentikasi (JWT), dan penanganan error. |
| **Frontend** | React.js / Vue.js / Next.js | Antarmuka pengguna (UI), grafik stok, dan konsumsi API. |
| **Database** | PostgreSQL (Relasional) / MongoDB (NoSQL) | Penyimpanan data barang, pengguna, dan log transaksi. |

---

## 🗄️ 2. Backend & Basis Data

### Struktur Tabel Basis Data (Relasional)
Berikut adalah rancangan tabel utama yang diperlukan:

1. **Users**: Mengelola data pengguna (Admin, Gudang, Kasir).
2. **Products**: Menyimpan data detail barang dan jumlah stok saat ini.
3. **Transactions**: Mencatat riwayat stok masuk (*stock in*) dan stok keluar (*stock out*).

### Desain API Endpoints (RESTful API)
| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login pengguna & instansiasi Token JWT | Publik |
| `GET` | `/api/products` | Mengambil semua daftar barang | Semua Role |
| `POST` | `/api/products` | Menambah varian barang baru | Admin / Gudang |
| `PUT` | `/api/products/:id` | Memperbarui detail/stok barang | Admin / Gudang |
| `DELETE` | `/api/products/:id` | Menghapus barang dari sistem | Admin |
| `POST` | `/api/transactions` | Mencatat transaksi stok masuk/keluar | Admin / Gudang |

---

## 🔒 3. Middleware (Lapisan Tengah)

Middleware diperlukan untuk menyaring permintaan (*request*) sebelum mencapai fungsi utama di Backend.

*   **Autentikasi (JWT Verifier):** Memeriksa apakah *request* membawa token yang valid pada header `Authorization: Bearer <token>`.
*   **Otorisasi Berbasis Role (RBAC):** Memastikan hanya pengguna dengan peran tertentu (misal: `Admin`) yang bisa menghapus data barang.
*   **Validasi Input:** Menggunakan pustaka seperti `Joi` atau `Zod` untuk memastikan data yang dikirim oleh Frontend (seperti harga atau jumlah stok) tidak bernilai minus atau kosong.

---

## 💻 4. Frontend (Antarmuka Pengguna)

Frontend berfokus pada pengalaman pengguna (*User Experience*) yang cepat dan informatif.

### Fitur Utama UI:
*   **Dashboard:** Menampilkan metrik penting seperti total produk, produk stok menipis (*low stock alert*), dan grafik tren transaksi mingguan.
*   **Manajemen Produk:** Tabel interaktif dengan fitur pencarian, filter kategori, dan tombol aksi (tambah, edit, hapus).
*   **Riwayat Transaksi:** Catatan kronologis mutasi barang masuk dan keluar untuk kebutuhan audit stok (*stock opname*).

### State Management & Fetching:
*   Gunakan **Axios** atau **Fetch API** untuk berkomunikasi dengan Backend.
*   Gunakan **Context API**, **Redux Toolkit**, atau **Pinia** untuk menyimpan status login pengguna dan data produk secara global di sisi klien.

---

## 🚀 5. Langkah-Langkah Implementasi

1. **Fase 1: Setup Database & Backend**
   * Buat skema database.
   * Hubungkan backend ke database dan uji koneksi.
   * Buat endpoint dasar untuk CRUD produk.
2. **Fase 2: Amankan dengan Middleware**
   * Implementasikan fitur registrasi/login dan enkripsi password.
   * Pasang middleware JWT di setiap endpoint yang membutuhkan proteksi.
3. **Fase 3: Pengembangan Frontend**
   * Integrasikan *template* dashboard (misal menggunakan Tailwind CSS).
   * Hubungkan form input di Frontend ke API Backend.
4. **Fase 4: Pengujian & Deployment**
   * Lakukan uji coba transaksi stok (memastikan stok berkurang/bertambah secara akurat).
   * Deploy Backend (misal: Render/Heroku) dan Frontend (misal: Vercel/Netlify).
