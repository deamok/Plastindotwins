# Komponen Kode Aplikasi Inventory Stock (Full-Stack)

Dokumen ini menyediakan implementasi kode spesifik untuk membangun aplikasi *inventory stock* modern, mencakup **Backend (Node.js/Express + Prisma)**, **Middleware (JWT & Akses Kontrol)**, serta **Frontend (React + Tailwind)**.

---

## 1. Backend: Skema Database & API Endpoints

### A. Skema Database (Prisma ORM - `schema.prisma`)
Skema ini menggunakan PostgreSQL untuk mengelola data produk, transaksi masuk/keluar, dan manajemen pengguna.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  STAFF
}

enum TransactionType {
  STOCK_IN
  STOCK_OUT
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(STAFF)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id           String        @id @default(uuid())
  sku          String        @unique
  name         String
  description  String?
  stock        Int           @default(0)
  minStock     Int           @default(5) // Alert threshold
  price        Decimal       @db.Decimal(10, 2)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
}

model Transaction {
  id          String          @id @default(uuid())
  productId   String
  product     Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  type        TransactionType
  quantity    Int
  notes       String?
  createdAt   DateTime        @default(now())
}
```

### B. Controller API Produk (`controllers/productController.js`)
Logika bisnis utama untuk memanipulasi stok barang dan mendeteksi kondisi *low stock*.

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Tambah Produk Baru
exports.createProduct = async (req, res) => {
  try {
    const { sku, name, description, stock, minStock, price } = req.body;
    
    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ message: 'SKU sudah terdaftar.' });
    }

    const product = await prisma.product.create({
      data: { sku, name, description, stock: parseInt(stock), minStock: parseInt(minStock), price }
    });
    
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan produk.', error: error.message });
  }
};

// 2. Transaksi Penyesuaian Stok (Masuk / Keluar)
exports.adjustStock = async (req, res) => {
  try {
    const { productId, type, quantity, notes } = req.body;
    const qty = parseInt(quantity);

    // Validasi produk
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan.' });

    // Hitung stok baru
    let newStock = product.stock;
    if (type === 'STOCK_IN') {
      newStock += qty;
    } else if (type === 'STOCK_OUT') {
      if (product.stock < qty) {
        return res.status(400).json({ message: 'Stok tidak mencukupi untuk transaksi ini.' });
      }
      newStock -= qty;
    } else {
      return res.status(400).json({ message: 'Tipe transaksi tidak valid.' });
    }

    // Eksekusi ACID Transaction di Database
    const result = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock }
      }),
      prisma.transaction.create({
        data: { productId, type, quantity: qty, notes }
      })
    ]);

    // Beri peringatan jika stok menyentuh batas minimum
    const updatedProduct = result[0];
    const isLowStock = updatedProduct.stock <= updatedProduct.minStock;

    res.status(200).json({
      success: true,
      message: `Stok berhasil diperbarui (${type})`,
      data: updatedProduct,
      alert: isLowStock ? `Peringatan: Stok ${updatedProduct.name} hampir habis!` : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui stok.', error: error.message });
  }
};
```

---

## 2. Middle-End (Middleware Keamanan & Validasi)

### A. Otentikasi JWT & Otorisasi Role (`middleware/authMiddleware.js`)
Memastikan rute dilindungi oleh token JWT yang valid dan hanya peran (*role*) tertentu yang bisa mengakses fungsi kritis (seperti menghapus produk).

```javascript
const jwt = require('jsonwebtoken');

// Verifikasi Token Akses
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Menyimpan data user (id, email, role) ke request object
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};

// Otorisasi Berdasarkan Peran (Role RBAC)
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Hak akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' 
      });
    }
    next();
  };
};
```

### B. Konfigurasi Rute Express (`routes/productRoutes.js`)
Penerapan langsung middleware pada jalur end-point REST API.

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Semua user terautentikasi bisa melihat produk
router.get('/', verifyToken, productController.getAllProducts);

// Hanya Staff dan Admin yang bisa mengubah/menambah stok
router.post('/adjust-stock', verifyToken, authorizeRoles('ADMIN', 'STAFF'), productController.adjustStock);

// Hanya Admin yang bisa mendaftarkan produk baru ke sistem
router.post('/create', verifyToken, authorizeRoles('ADMIN'), productController.createProduct);

module.exports = router;
```

---

## 3. Frontend: Integrasi API & UI Dashboard

### A. Service Integrasi API Axios (`src/services/api.js`)
Mengatur interseptor otomatis agar token JWT selalu disisipkan pada setiap *request header* setelah pengguna masuk.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Otomatis pasang JWT token jika tersedia di localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const productService = {
  getProducts: () => api.get('/products'),
  createProduct: (data) => api.post('/products/create', data),
  adjustStock: (data) => api.post('/products/adjust-stock', data),
};

export default api;
```

### B. Komponen Dashboard Tabel Stok (`src/components/Dashboard.jsx`)
Komponen antarmuka menggunakan **React** dan **Tailwind CSS** untuk menampilkan tabel inventori secara dinamis, lengkap dengan indikator visual jika stok menipis (*low stock alert*).

```jsx
import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts();
      setProducts(response.data.data);
    } catch (err) {
      setError('Gagal memuat data stok dari server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-10 font-medium">Memuat data inventori...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Stok Barang</h1>
        <button 
          onClick={fetchInventory}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Produk</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stok Saat Ini</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const isLowStock = product.stock <= product.minStock;
              
              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Rp {Number(product.price).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{product.stock} pcs</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLowStock ? (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">
                        Low Stock (Min: {product.minStock})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Aman
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                  Belum ada produk terdaftar di gudang.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
