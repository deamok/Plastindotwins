import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';
import SalesModule from './SalesModule';
import PurchasesModule from './PurchasesModule';
import { 
  Package, 
  AlertTriangle, 
  PlusCircle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  LogOut,
  User as UserIcon,
  Layers,
  ShieldAlert,
  LogIn,
  ShoppingCart,
  Truck
} from 'lucide-react';

export default function Dashboard({ user, onLogout, onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'sales', 'purchases'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states - Add Product
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    stock: 0,
    minStock: 5,
    price: ''
  });

  // Form states - Adjust Stock
  const [adjustForm, setAdjustForm] = useState({
    type: 'STOCK_IN',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await productService.getProducts();
      setProducts(response.data.data || []);
    } catch (err) {
      if (!err.response) {
        setError('Gagal terhubung ke server (Network Error). Pastikan server backend sedang aktif.');
      } else if (err.response.status === 401) {
        if (user) {
          setError('Sesi login telah kedaluwarsa. Silakan login ulang.');
        }
      } else if (err.response.status === 403) {
        setError('Hak akses ditolak. Anda tidak memiliki izin untuk melihat data ini.');
      } else {
        setError(err.response.data?.message || 'Gagal memuat data inventori.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.role !== 'ADMIN') {
      setError('Gagal otorisasi: Hanya akun peran ADMIN yang diizinkan mendaftarkan produk baru.');
      setIsAddModalOpen(false);
      return;
    }

    try {
      setError('');
      await productService.createProduct({
        ...newProduct,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 5,
        price: parseFloat(newProduct.price) || 0
      });
      setSuccessMsg('Produk baru berhasil ditambahkan!');
      setIsAddModalOpen(false);
      setNewProduct({ sku: '', name: '', description: '', stock: 0, minStock: 5, price: '' });
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Hak akses ditolak: Akun Anda tidak memiliki izin ADMIN untuk menambahkan produk.');
      } else {
        setError(err.response?.data?.message || 'Gagal menambahkan produk.');
      }
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      setError('');
      const res = await productService.adjustStock({
        productId: selectedProduct.id,
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        notes: adjustForm.notes
      });
      const alertMsg = res.data?.alert;
      setSuccessMsg(res.data?.message + (alertMsg ? ` (${alertMsg})` : ''));
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
      setAdjustForm({ type: 'STOCK_IN', quantity: 1, notes: '' });
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Hak akses ditolak: Anda tidak memiliki izin untuk melakukan mutasi stok.');
      } else {
        setError(err.response?.data?.message || 'Gagal menyesuaikan stok.');
      }
    }
  };

  const openAdjustModal = (product, initialType = 'STOCK_IN') => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setSelectedProduct(product);
    setAdjustForm({ type: initialType, quantity: 1, notes: '' });
    setIsAdjustModalOpen(true);
  };

  const handleOpenAddModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.role !== 'ADMIN') {
      setError(`Gagal otorisasi: Akun Anda adalah "${user.role}". Hanya peran ADMIN yang dapat menambah produk baru.`);
      return;
    }
    setIsAddModalOpen(true);
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesLowStock = onlyLowStock ? p.stock <= p.minStock : true;
    return matchesSearch && matchesLowStock;
  });

  // Calculate Metrics
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 leading-none block">Plastindo Twins</span>
              <span className="text-xs text-slate-500 font-medium">ERP & Inventory Stock System</span>
            </div>
          </div>

          {/* Module Tab Switcher in Navbar */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200/60">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'inventory'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventori Stok</span>
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'sales'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Penjualan (Sales)</span>
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'purchases'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Pembelian (Purchasing)</span>
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                <LogIn className="w-4 h-4" /> Masuk / Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex border-t border-slate-100 px-4 py-2 bg-slate-50 gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-xs border border-slate-200' : 'text-slate-600'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Stok
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'sales' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200' : 'text-slate-600'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Penjualan
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              activeTab === 'purchases' ? 'bg-white text-blue-600 shadow-xs border border-slate-200' : 'text-slate-600'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Pembelian
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Banner if not logged in */}
        {!user && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Autentikasi Diperlukan</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Silakan login terlebih dahulu untuk mengakses data stok inventori, mencatat penjualan dan pembelian.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAuth}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0 shadow-xs"
            >
              Login Sekarang
            </button>
          </div>
        )}

        {/* Conditional Rendering based on activeTab */}
        {activeTab === 'sales' ? (
          <SalesModule user={user} onOpenAuth={onOpenAuth} />
        ) : activeTab === 'purchases' ? (
          <PurchasesModule user={user} onOpenAuth={onOpenAuth} />
        ) : (
          <div>
            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
                <button onClick={() => setError('')} className="text-red-500 font-bold hover:text-red-700">✕</button>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button onClick={() => setSuccessMsg('')} className="text-emerald-500 font-bold hover:text-emerald-700">✕</button>
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Varian Barang</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{totalProducts}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Stok Fisik</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{totalStockUnits.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">pcs</span></p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              <div className={`p-6 rounded-2xl border shadow-xs flex items-center justify-between ${lowStockCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div>
                  <p className="text-sm font-medium text-slate-500">Peringatan Low Stock</p>
                  <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStockCount}</p>
                </div>
                <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Action & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari SKU atau nama produk..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={() => setOnlyLowStock(!onlyLowStock)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 transition-all ${
                    onlyLowStock 
                      ? 'bg-amber-100 border-amber-300 text-amber-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Low Stock Saja</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchInventory}
                  disabled={loading}
                  title="Refresh"
                  className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Produk</span>
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Nama Produk</th>
                      <th className="px-6 py-4">Harga Jual</th>
                      <th className="px-6 py-4">Harga Beli/Modal</th>
                      <th className="px-6 py-4">Stok Saat Ini</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Penyesuaian Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredProducts.map((product) => {
                      const isLowStock = product.stock <= product.minStock;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-slate-500 line-clamp-1">{product.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                            Rp {Number(product.price).toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                            Rp {Number(product.costPrice || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{product.stock}</span>{' '}
                            <span className="text-xs text-slate-500">pcs</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Low Stock (Min: {product.minStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Aman
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openAdjustModal(product, 'STOCK_IN')}
                                title="Barang Masuk"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                              >
                                <ArrowDownCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => openAdjustModal(product, 'STOCK_OUT')}
                                title="Barang Keluar"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                              >
                                <ArrowUpCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && !loading && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="font-medium">
                            {!user ? 'Silakan login untuk memuat daftar produk' : 'Tidak ada produk ditemukan.'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {!user ? 'Gunakan tombol Masuk / Login di pojok kanan atas.' : 'Coba sesuaikan pencarian atau tambah barang baru.'}
                          </p>
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                          <p className="text-sm">Memuat data produk...</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Tambah Produk */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tambah Produk Baru</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">SKU</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PLS-005"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ember Plastik 20 Liter"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi</label>
                <textarea
                  placeholder="Keterangan bahan, warna, dll."
                  rows="2"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25000"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Min. Stok</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Penyesuaian Stok */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Penyesuaian Stok</h3>
            <p className="text-xs text-slate-500 mb-4">
              Produk: <span className="font-semibold text-slate-700">{selectedProduct.name}</span> (Stok saat ini: {selectedProduct.stock} pcs)
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Jenis Mutasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'STOCK_IN' })}
                    className={`py-2 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      adjustForm.type === 'STOCK_IN'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                    <span>Masuk (+ In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'STOCK_OUT' })}
                    className={`py-2 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      adjustForm.type === 'STOCK_OUT'
                        ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4 text-amber-600" />
                    <span>Keluar (- Out)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Jumlah (Quantity)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={adjustForm.type === 'STOCK_OUT' ? selectedProduct.stock : undefined}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Misal: Pembelian Supplier / Retur / Penjualan"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Konfirmasi Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
