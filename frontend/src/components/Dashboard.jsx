import React, { useState, useEffect } from 'react';
import { productService, locationService } from '../services/api';
import SalesModule from './SalesModule';
import PurchasesModule from './PurchasesModule';
import ContactsModule from './ContactsModule';
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
  Truck,
  Users,
  Building2,
  Store,
  ArrowLeftRight,
  Edit3,
  Trash2,
  History,
  ArrowRight,
  Loader2,
  Sparkles,
  X
} from 'lucide-react';

export default function Dashboard({ user, onLogout, onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'sales', 'purchases', 'contacts'
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL'); // 'ALL', 'BANGETAYU', 'JOMBLANG'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states - Add Product
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    category: '',
    subCategory: '',
    description: '',
    stockBangetayu: 0,
    stockJomblang: 0,
    minStock: 5,
    unit: 'buah',
    purchaseUnit: 'kg',
    itemsPerPurchaseUnit: 120,
    price: '',
    costPrice: ''
  });

  const [skuLoading, setSkuLoading] = useState(false);
  const [skuInfo, setSkuInfo] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);

  // Form states - Edit Product
  const [editProductForm, setEditProductForm] = useState({
    id: '',
    sku: '',
    name: '',
    category: '',
    subCategory: '',
    description: '',
    stockBangetayu: 0,
    stockJomblang: 0,
    minStock: 5,
    unit: 'buah',
    purchaseUnit: 'kg',
    itemsPerPurchaseUnit: 1,
    price: '',
    costPrice: ''
  });

  // Form states - Adjust Stock
  const [adjustForm, setAdjustForm] = useState({
    locationId: '',
    type: 'STOCK_IN',
    quantity: 1,
    notes: ''
  });

  // Form states - Transfer Stock (Mutasi Antar Gudang)
  const [transferForm, setTransferForm] = useState({
    sourceLocationId: '',
    destLocationId: '',
    productId: '',
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
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [prodRes, locRes, catRes] = await Promise.all([
        productService.getProducts(),
        locationService.getLocations().catch(() => ({ data: { data: [] } })),
        productService.getCategories().catch(() => ({ data: { data: [] } }))
      ]);
      const fetchedProducts = prodRes.data.data || [];
      setProducts(fetchedProducts);
      setLocations(locRes.data.data || []);

      if (catRes.data?.data && catRes.data.data.length > 0) {
        setCategoriesList(catRes.data.data);
      } else {
        const catMap = {};
        fetchedProducts.forEach((p) => {
          if (p.category) {
            if (!catMap[p.category]) catMap[p.category] = new Set();
            if (p.subCategory) catMap[p.category].add(p.subCategory);
          }
        });
        setCategoriesList(Object.keys(catMap).map((k) => ({ category: k, subCategories: Array.from(catMap[k]) })));
      }
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

  // Helper untuk mendapatkan stok per lokasi dari object product
  const getProductStockInLoc = (product, locationCode) => {
    if (!product.stocks || !Array.isArray(product.stocks)) return 0;
    const item = product.stocks.find((s) => s.location?.code === locationCode);
    return item ? item.stock : 0;
  };

  // --- Handlers: Tambah Produk ---
  const fetchAutoSku = async (cat, subCat) => {
    if (!cat || !subCat) {
      setNewProduct((prev) => ({ ...prev, sku: '' }));
      setSkuInfo(null);
      return;
    }
    try {
      setSkuLoading(true);
      const res = await productService.getNextSku({ category: cat, subCategory: subCat });
      if (res.data?.success && res.data.data?.sku) {
        setNewProduct((prev) => ({ ...prev, sku: res.data.data.sku }));
        setSkuInfo(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil SKU otomatis:', err);
    } finally {
      setSkuLoading(false);
    }
  };

  const handleCategoryChange = (val) => {
    if (val === '__CUSTOM__') {
      setIsCustomCategory(true);
      setNewProduct((prev) => ({ ...prev, category: '', subCategory: '', sku: '' }));
      setSkuInfo(null);
      return;
    }
    setIsCustomCategory(false);
    setIsCustomSubCategory(false);

    let defaultUnit = newProduct.unit;
    let defaultPurchaseUnit = newProduct.purchaseUnit;
    if (val === 'Plastik Kemasan' || val === 'Plastik Penyimpanan') {
      defaultPurchaseUnit = 'kg';
      defaultUnit = 'lembar';
    } else if (val === 'Perlengkapan Penunjang') {
      defaultPurchaseUnit = 'dus';
      defaultUnit = 'bungkus';
    } else if (val === 'Kebutuhan Medis') {
      defaultPurchaseUnit = 'dus';
      defaultUnit = 'buah';
    }

    setNewProduct((prev) => ({
      ...prev,
      category: val,
      subCategory: '',
      sku: '',
      unit: defaultUnit,
      purchaseUnit: defaultPurchaseUnit
    }));
    setSkuInfo(null);
  };

  const handleSubCategoryChange = (val) => {
    if (val === '__CUSTOM__') {
      setIsCustomSubCategory(true);
      setNewProduct((prev) => ({ ...prev, subCategory: '', sku: '' }));
      setSkuInfo(null);
      return;
    }
    setIsCustomSubCategory(false);
    setNewProduct((prev) => ({ ...prev, subCategory: val }));
    if (newProduct.category && val) {
      fetchAutoSku(newProduct.category, val);
    } else {
      setNewProduct((prev) => ({ ...prev, sku: '' }));
      setSkuInfo(null);
    }
  };

  const currentCatObj = categoriesList.find((c) => c.category === newProduct.category);
  const availableSubCategories = currentCatObj ? currentCatObj.subCategories : [];

  const handleOpenAddModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.role !== 'ADMIN') {
      setError(`Gagal otorisasi: Akun Anda adalah "${user.role}". Hanya peran ADMIN yang dapat menambah produk baru.`);
      return;
    }
    setNewProduct({
      sku: '',
      name: '',
      category: '',
      subCategory: '',
      description: '',
      stockBangetayu: 0,
      stockJomblang: 0,
      minStock: 5,
      unit: 'lembar',
      purchaseUnit: 'kg',
      itemsPerPurchaseUnit: 120,
      price: '',
      costPrice: ''
    });
    setSkuInfo(null);
    setIsCustomCategory(false);
    setIsCustomSubCategory(false);
    setIsAddModalOpen(true);
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
        category: newProduct.category || null,
        subCategory: newProduct.subCategory || null,
        stockBangetayu: parseInt(newProduct.stockBangetayu) || 0,
        stockJomblang: parseInt(newProduct.stockJomblang) || 0,
        minStock: parseInt(newProduct.minStock) || 5,
        itemsPerPurchaseUnit: parseFloat(newProduct.itemsPerPurchaseUnit) || 1,
        price: parseFloat(newProduct.price) || 0,
        costPrice: parseFloat(newProduct.costPrice) || 0
      });
      setSuccessMsg('Produk baru berhasil ditambahkan dan dialokasikan ke gudang!');
      setIsAddModalOpen(false);
      setNewProduct({
        sku: '',
        name: '',
        category: '',
        subCategory: '',
        description: '',
        stockBangetayu: 0,
        stockJomblang: 0,
        minStock: 5,
        unit: 'buah',
        purchaseUnit: 'kg',
        itemsPerPurchaseUnit: 120,
        price: '',
        costPrice: ''
      });
      setSkuInfo(null);
      setIsCustomCategory(false);
      setIsCustomSubCategory(false);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambahkan produk.');
    }
  };

  // --- Handlers: Edit Produk & Koreksi Stok ---
  const openEditModal = (product) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.role !== 'ADMIN') {
      setError(`Akses ditolak: Hanya peran ADMIN yang dapat mengedit data produk.`);
      return;
    }

    const stockB = getProductStockInLoc(product, 'BANGETAYU');
    const stockJ = getProductStockInLoc(product, 'JOMBLANG');

    setEditProductForm({
      id: product.id,
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || '',
      subCategory: product.subCategory || '',
      description: product.description || '',
      stockBangetayu: stockB,
      stockJomblang: stockJ,
      minStock: product.minStock || 5,
      unit: product.unit || 'buah',
      purchaseUnit: product.purchaseUnit || 'kg',
      itemsPerPurchaseUnit: product.itemsPerPurchaseUnit || 1,
      price: product.price || '',
      costPrice: product.costPrice || ''
    });
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editProductForm.id) return;
    try {
      setError('');
      await productService.updateProduct(editProductForm.id, {
        sku: editProductForm.sku,
        name: editProductForm.name,
        category: editProductForm.category || null,
        subCategory: editProductForm.subCategory || null,
        description: editProductForm.description,
        minStock: parseInt(editProductForm.minStock) || 5,
        unit: editProductForm.unit,
        purchaseUnit: editProductForm.purchaseUnit,
        itemsPerPurchaseUnit: parseFloat(editProductForm.itemsPerPurchaseUnit) || 1,
        price: parseFloat(editProductForm.price) || 0,
        costPrice: parseFloat(editProductForm.costPrice) || 0,
        stockBangetayu: parseInt(editProductForm.stockBangetayu) || 0,
        stockJomblang: parseInt(editProductForm.stockJomblang) || 0
      });
      setSuccessMsg(`Data produk "${editProductForm.name}" dan penyesuaian stok berhasil disimpan!`);
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui produk.');
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${productName}" secara permanen? Seluruh riwayat transaksi produk ini juga akan terhapus.`)) {
      return;
    }
    try {
      setError('');
      await productService.deleteProduct(productId);
      setSuccessMsg(`Produk "${productName}" berhasil dihapus.`);
      setIsEditModalOpen(false);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus produk.');
    }
  };

  // --- Handlers: Mutasi Antar Gudang (Transfer) ---
  const openTransferModal = (preselectedProduct = null) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const locBangetayu = locations.find((l) => l.code === 'BANGETAYU');
    const locJomblang = locations.find((l) => l.code === 'JOMBLANG');

    setTransferForm({
      sourceLocationId: locBangetayu?.id || locations[0]?.id || '',
      destLocationId: locJomblang?.id || locations[1]?.id || '',
      productId: preselectedProduct?.id || products[0]?.id || '',
      quantity: 1,
      notes: ''
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await locationService.transferStock(transferForm);
      setSuccessMsg(res.data?.message || 'Mutasi transfer stok antar gudang berhasil.');
      setIsTransferModalOpen(false);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses mutasi antar gudang.');
    }
  };

  const openHistoryModal = async () => {
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await locationService.getTransfers();
      setTransferHistory(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // --- Handlers: Adjust Stock Manual (Masuk / Keluar) ---
  const openAdjustModal = (product, initialType = 'STOCK_IN') => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setSelectedProduct(product);
    const defaultLoc = initialType === 'STOCK_OUT'
      ? locations.find(l => l.code === 'JOMBLANG') || locations[0]
      : locations.find(l => l.code === 'BANGETAYU') || locations[0];

    setAdjustForm({
      locationId: defaultLoc?.id || '',
      type: initialType,
      quantity: 1,
      notes: ''
    });
    setIsAdjustModalOpen(true);
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
        locationId: adjustForm.locationId,
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        notes: adjustForm.notes
      });
      const alertMsg = res.data?.alert;
      setSuccessMsg(res.data?.message + (alertMsg ? ` (${alertMsg})` : ''));
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyesuaikan stok.');
    }
  };

  // --- Filtering & Metrics Calculation ---
  const filteredProducts = products.filter((p) => {
    const sTerm = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(sTerm) || 
      p.sku.toLowerCase().includes(sTerm) ||
      (p.category && p.category.toLowerCase().includes(sTerm)) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(sTerm)) ||
      (p.description && p.description.toLowerCase().includes(sTerm));

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'ALL' || p.subCategory === selectedSubCategory;

    // Cek stok berdasarkan filter lokasi
    let currentStock = p.stock || 0;
    if (selectedLocationFilter !== 'ALL') {
      currentStock = getProductStockInLoc(p, selectedLocationFilter);
    }

    const matchesLowStock = onlyLowStock ? currentStock <= p.minStock : true;
    return matchesSearch && matchesCategory && matchesSubCategory && matchesLowStock;
  });

  const totalProducts = products.length;
  
  // Total stok unit tergantung filter lokasi yang aktif
  let totalStockUnits = 0;
  if (selectedLocationFilter === 'BANGETAYU') {
    totalStockUnits = products.reduce((acc, p) => acc + getProductStockInLoc(p, 'BANGETAYU'), 0);
  } else if (selectedLocationFilter === 'JOMBLANG') {
    totalStockUnits = products.reduce((acc, p) => acc + getProductStockInLoc(p, 'JOMBLANG'), 0);
  } else {
    totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  }

  const stockBangetayuAll = products.reduce((acc, p) => acc + getProductStockInLoc(p, 'BANGETAYU'), 0);
  const stockJomblangAll = products.reduce((acc, p) => acc + getProductStockInLoc(p, 'JOMBLANG'), 0);

  const lowStockCount = products.filter((p) => {
    const s = selectedLocationFilter === 'ALL' ? p.stock : getProductStockInLoc(p, selectedLocationFilter);
    return s <= p.minStock;
  }).length;

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
              <span className="text-xs text-slate-500 font-medium">ERP & Inventory Multi-Gudang</span>
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
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Pembelian (Supplier)</span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'contacts'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Kontak & Rekening</span>
            </button>
          </nav>

          {/* User Session Info / Login Action */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/60">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight block">{user.name}</span>
                    <span className="text-[10px] text-blue-600 font-bold block">{user.role}</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 bg-slate-50/50 p-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
              activeTab === 'inventory' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventori</span>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
              activeTab === 'sales' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Sales</span>
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
              activeTab === 'purchases' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Beli</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
              activeTab === 'contacts' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kontak</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Banner Guest Notice */}
        {!user && (
          <div className="mb-6 p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Autentikasi Diperlukan</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Silakan login terlebih dahulu untuk mengelola stok, mutasi gudang, dan penjualan.
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

        {/* Tab Components */}
        {activeTab === 'sales' ? (
          <SalesModule user={user} onOpenAuth={onOpenAuth} />
        ) : activeTab === 'purchases' ? (
          <PurchasesModule user={user} onOpenAuth={onOpenAuth} />
        ) : activeTab === 'contacts' ? (
          <ContactsModule user={user} onOpenAuth={onOpenAuth} />
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

            {/* Multi-Warehouse Selector & Quick Action Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedLocationFilter('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    selectedLocationFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Semua Gudang</span>
                </button>
                <button
                  onClick={() => setSelectedLocationFilter('JOMBLANG')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    selectedLocationFilter === 'JOMBLANG'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span>Outlet Jomblang</span>
                  <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(Outlet Penjualan)</span>
                </button>
                <button
                  onClick={() => setSelectedLocationFilter('BANGETAYU')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    selectedLocationFilter === 'BANGETAYU'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Gudang Bangetayu</span>
                  <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(Penyimpanan)</span>
                </button>
              </div>

              {/* Warehouse Quick Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openTransferModal()}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Mutasi Antar Gudang"
                >
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  <span>Mutasi Antar Gudang</span>
                </button>
                <button
                  onClick={openHistoryModal}
                  className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs transition-colors"
                  title="Riwayat Mutasi Antar Gudang"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Varian Barang</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{totalProducts}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Master produk aktif</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-500">
                    {selectedLocationFilter === 'BANGETAYU' 
                      ? 'Stok Gudang Bangetayu' 
                      : selectedLocationFilter === 'JOMBLANG'
                      ? 'Stok Outlet Jomblang'
                      : 'Total Stok Fisik Gabungan'}
                  </p>
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalStockUnits.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">unit</span>
                </p>
                {selectedLocationFilter === 'ALL' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>📦 Bangetayu: <b>{stockBangetayuAll.toLocaleString('id-ID')}</b></span>
                    <span>🏪 Jomblang: <b>{stockJomblangAll.toLocaleString('id-ID')}</b></span>
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-2xl border shadow-xs flex items-center justify-between ${lowStockCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div>
                  <p className="text-sm font-medium text-slate-500">Peringatan Low Stock</p>
                  <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStockCount}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedLocationFilter === 'ALL' ? 'Secara keseluruhan' : `Di lokasi ${selectedLocationFilter}`}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Action & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari SKU, nama, warna, ukuran..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Filter Kategori */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategory('ALL');
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="ALL">Semua Kategori ({products.length})</option>
                    {categoriesList.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category}
                      </option>
                    ))}
                  </select>

                  {/* Filter Sub-Kategori (Muncul jika kategori dipilih) */}
                  {selectedCategory !== 'ALL' && (
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="ALL">Semua Sub-Kategori</option>
                      {categoriesList
                        .find((c) => c.category === selectedCategory)
                        ?.subCategories.map((sc) => (
                          <option key={sc} value={sc}>
                            {sc}
                          </option>
                        ))}
                    </select>
                  )}

                  <button
                    onClick={() => setOnlyLowStock(!onlyLowStock)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      onlyLowStock 
                        ? 'bg-amber-100 border-amber-300 text-amber-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Low Stock Saja</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-auto">
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

              {/* Status filter aktif */}
              {(selectedCategory !== 'ALL' || selectedSubCategory !== 'ALL' || search || onlyLowStock) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap">
                  <span>Filter Aktif:</span>
                  {selectedCategory !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-medium">
                      Kategori: {selectedCategory}
                      <button onClick={() => { setSelectedCategory('ALL'); setSelectedSubCategory('ALL'); }} className="hover:text-blue-950 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {selectedSubCategory !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-medium">
                      Sub: {selectedSubCategory}
                      <button onClick={() => setSelectedSubCategory('ALL')} className="hover:text-indigo-950 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      Cari: &ldquo;{search}&rdquo;
                      <button onClick={() => setSearch('')} className="hover:text-slate-900 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {onlyLowStock && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium">
                      Low Stock
                      <button onClick={() => setOnlyLowStock(false)} className="hover:text-amber-950 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSelectedSubCategory('ALL');
                      setSearch('');
                      setOnlyLowStock(false);
                    }}
                    className="text-red-600 hover:underline text-xs ml-auto font-medium"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-4">SKU</th>
                      <th className="px-5 py-4">Nama Produk & Kategori</th>
                      <th className="px-5 py-4">Stok Fisik per Gudang</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Aksi / Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredProducts.map((product) => {
                      const isLowStock = product.stock <= product.minStock;
                      const unit = product.unit || 'buah';

                      const stockB = getProductStockInLoc(product, 'BANGETAYU');
                      const stockJ = getProductStockInLoc(product, 'JOMBLANG');

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                            {product.sku}
                          </td>
                          <td className="px-5 py-4">
                            {(product.category || product.subCategory) && (
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {product.category && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                    {product.category}
                                  </span>
                                )}
                                {product.subCategory && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {product.subCategory}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>{product.description}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="space-y-1.5">
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium w-fit">
                                  <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Jomblang:</span>
                                  <b className="font-bold text-emerald-900">{stockJ.toLocaleString('id-ID')}</b>
                                  <span className="text-[10px] text-emerald-700">{unit}</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/70 font-medium w-fit">
                                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Bangetayu:</span>
                                  <b className="font-bold text-amber-900">{stockB.toLocaleString('id-ID')}</b>
                                  <span className="text-[10px] text-amber-700">{unit}</span>
                                </div>
                              </div>
                              <div className="text-xs font-bold text-slate-900 pt-0.5 pl-0.5">
                                Total: {product.stock.toLocaleString('id-ID')} <span className="font-normal text-slate-500">{unit}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Low (Min: {product.minStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Aman
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              {/* Tombol Edit Barang di Stok */}
                              <button
                                onClick={() => openEditModal(product)}
                                title="Edit Data & Stok Barang"
                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200 flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                              >
                                <Edit3 className="w-4 h-4 text-blue-600" />
                                <span>Edit</span>
                              </button>

                              {/* Tombol Transfer Cepat Antar Gudang */}
                              <button
                                onClick={() => openTransferModal(product)}
                                title="Mutasi Stok Produk Ini Antar Gudang"
                                className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-200 flex items-center gap-1 text-xs font-semibold shadow-2xs"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                                <span>Mutasi</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
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
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
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

      {/* ========================================================= */}
      {/* MODAL: EDIT BARANG DI STOK (Fitur Edit Master & Stok)      */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Edit Data Barang & Stok</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbarui detail produk, harga jual, dan penyesuaian stok fisik per gudang.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">SKU Barang</label>
                  <input
                    type="text"
                    required
                    value={editProductForm.sku}
                    onChange={(e) => setEditProductForm({ ...editProductForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Produk</label>
                  <input
                    type="text"
                    required
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Kategori & Sub-Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kategori</label>
                  <input
                    type="text"
                    list="edit-category-suggestions"
                    placeholder="Pilih atau ketik kategori..."
                    value={editProductForm.category}
                    onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <datalist id="edit-category-suggestions">
                    {categoriesList.map((c) => (
                      <option key={c.category} value={c.category} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sub-Kategori</label>
                  <input
                    type="text"
                    list="edit-subcategory-suggestions"
                    placeholder="Pilih atau ketik sub-kategori..."
                    value={editProductForm.subCategory}
                    onChange={(e) => setEditProductForm({ ...editProductForm, subCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <datalist id="edit-subcategory-suggestions">
                    {categoriesList.flatMap((c) => c.subCategories).map((sc, idx) => (
                      <option key={`${sc}-${idx}`} value={sc} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi (Warna, Ukuran, Keterangan)</label>
                <textarea
                  rows="2"
                  placeholder="Contoh: Warna: Putih | Ukuran: 15"
                  value={editProductForm.description}
                  onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Satuan & Konversi Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase block">Konfigurasi Satuan & Rasio Timbangan</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satuan Beli</label>
                    <select
                      value={editProductForm.purchaseUnit}
                      onChange={(e) => setEditProductForm({ ...editProductForm, purchaseUnit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="karung">Karung</option>
                      <option value="bal">Bal</option>
                      <option value="roll">Roll</option>
                      <option value="dus">Dus / Box</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satuan Jual / Simpan</label>
                    <select
                      value={editProductForm.unit}
                      onChange={(e) => setEditProductForm({ ...editProductForm, unit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="buah">Buah / Pcs (bh)</option>
                      <option value="lembar">Lembar (lbr)</option>
                      <option value="bungkus">Bungkus / Pak (bks)</option>
                      <option value="pak">Pak</option>
                      <option value="roll">Roll</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                      Isi per 1 {editProductForm.purchaseUnit}
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="1"
                      value={editProductForm.itemsPerPurchaseUnit}
                      onChange={(e) => setEditProductForm({ ...editProductForm, itemsPerPurchaseUnit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200 text-blue-800 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Harga Jual & Modal Beli */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Harga Jual per {editProductForm.unit} (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editProductForm.price}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Estimasi Beli per {editProductForm.purchaseUnit} (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editProductForm.costPrice}
                    onChange={(e) => setEditProductForm({ ...editProductForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Stok Fisik per Gudang (Stock Opname Direct Edit) */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase block">Koreksi Stok Fisik per Lokasi Gudang</span>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    Total: {(parseInt(editProductForm.stockBangetayu) || 0) + (parseInt(editProductForm.stockJomblang) || 0)} {editProductForm.unit}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Outlet Jomblang (Penjualan)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editProductForm.stockJomblang}
                      onChange={(e) => setEditProductForm({ ...editProductForm, stockJomblang: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-800 uppercase mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Gudang Bangetayu (Penyimpanan)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editProductForm.stockBangetayu}
                      onChange={(e) => setEditProductForm({ ...editProductForm, stockBangetayu: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  💡 Angka di atas merefleksikan stok fisik riil di masing-masing lokasi. Mengubah angka ini akan memperbarui saldo stok langsung.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Batas Peringatan Low Stock ({editProductForm.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={editProductForm.minStock}
                  onChange={(e) => setEditProductForm({ ...editProductForm, minStock: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(editProductForm.id, editProductForm.name)}
                  className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Produk</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH PRODUK BARU                                 */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-slate-900">Tambah Master Produk Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Pilih Kategori & Sub-Kategori untuk membuat nomor SKU otomatis dengan format <span className="font-mono text-blue-600">SKU. kodeKat.kodeSub.noUrut</span>.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Kategori & Sub-Kategori (Pilihan sub-kategori mengikuti kategori) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  {!isCustomCategory ? (
                    <select
                      required
                      value={newProduct.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {categoriesList.map((c) => (
                        <option key={c.category} value={c.category}>
                          {c.code ? `[${c.code}] ` : ''}{c.category}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Kategori Baru (Ketik Manual)...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Ketik kategori baru..."
                        value={newProduct.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProduct((prev) => ({ ...prev, category: val, sku: '' }));
                          setSkuInfo(null);
                        }}
                        onBlur={() => {
                          if (newProduct.category && newProduct.subCategory) {
                            fetchAutoSku(newProduct.category, newProduct.subCategory);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          handleCategoryChange('');
                        }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Sub-Kategori <span className="text-red-500">*</span>
                    </label>
                    {newProduct.category && (
                      <span className="text-[10px] text-blue-600 font-medium">
                        Filter: {newProduct.category}
                      </span>
                    )}
                  </div>
                  {!isCustomSubCategory ? (
                    <select
                      required
                      disabled={!newProduct.category}
                      value={newProduct.subCategory}
                      onChange={(e) => handleSubCategoryChange(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                        !newProduct.category 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">
                        {!newProduct.category ? '-- Pilih Kategori Dulu --' : '-- Pilih Sub-Kategori --'}
                      </option>
                      {availableSubCategories.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                      {newProduct.category && (
                        <option value="__CUSTOM__">+ Sub-Kategori Baru (Ketik Manual)...</option>
                      )}
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Ketik sub-kategori baru..."
                        value={newProduct.subCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProduct((prev) => ({ ...prev, subCategory: val, sku: '' }));
                          setSkuInfo(null);
                        }}
                        onBlur={() => {
                          if (newProduct.category && newProduct.subCategory) {
                            fetchAutoSku(newProduct.category, newProduct.subCategory);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomSubCategory(false);
                          handleSubCategoryChange('');
                        }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SKU Barang (Otomatis) & Nama Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">SKU Barang</label>
                    {newProduct.sku && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Otomatis
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder={skuLoading ? 'Menghitung SKU...' : 'Auto via Kategori & Sub'}
                      value={skuLoading ? 'Membuat SKU...' : newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    {skuLoading && (
                      <div className="absolute right-2.5 top-2.5">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    )}
                    {!skuLoading && newProduct.category && newProduct.subCategory && (
                      <button
                        type="button"
                        onClick={() => fetchAutoSku(newProduct.category, newProduct.subCategory)}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Hitung Ulang SKU"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {skuInfo ? (
                    <p className="text-[10px] text-slate-500 mt-1">
                      No. Urut: <span className="font-bold text-slate-800">{skuInfo.nextSequence}</span> (Kat: {skuInfo.categoryCode}, Sub: {skuInfo.subCategoryCode})
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      *Format: SKU. [kodeKat].[kodeSub].[noUrut+1]
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Plastik kresek merk REA warna putih ukuran 15"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi (Warna, Ukuran, Keterangan)</label>
                <textarea
                  placeholder="Contoh: Warna: Putih | Ukuran: 15"
                  rows="2"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Satuan & Konversi Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase block">Konfigurasi Satuan & Rasio Timbangan</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satuan Beli Supplier</label>
                    <select
                      value={newProduct.purchaseUnit}
                      onChange={(e) => setNewProduct({ ...newProduct, purchaseUnit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="karung">Karung</option>
                      <option value="bal">Bal</option>
                      <option value="roll">Roll</option>
                      <option value="dus">Dus / Box</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satuan Jual / Simpan</label>
                    <select
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="buah">Buah / Pcs (bh)</option>
                      <option value="lembar">Lembar (lbr)</option>
                      <option value="bungkus">Bungkus / Pak (bks)</option>
                      <option value="pak">Pak</option>
                      <option value="roll">Roll</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                      Isi per 1 {newProduct.purchaseUnit} ({newProduct.unit})
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="1"
                      placeholder="Misal 120"
                      value={newProduct.itemsPerPurchaseUnit}
                      onChange={(e) => setNewProduct({ ...newProduct, itemsPerPurchaseUnit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200 text-blue-800 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Harga Jual & Modal Beli */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Harga Jual per {newProduct.unit} (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Contoh: 1500"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Estimasi Beli per {newProduct.purchaseUnit} (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 30000"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Alokasi Stok Awal per Gudang */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase block">Alokasi Stok Awal ({newProduct.unit})</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Outlet Jomblang (Penjualan)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newProduct.stockJomblang}
                      onChange={(e) => setNewProduct({ ...newProduct, stockJomblang: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-800 uppercase mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Gudang Bangetayu (Penyimpanan)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newProduct.stockBangetayu}
                      onChange={(e) => setNewProduct({ ...newProduct, stockBangetayu: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Min. Alert Stok ({newProduct.unit})</label>
                <input
                  type="number"
                  min="0"
                  placeholder="5"
                  value={newProduct.minStock}
                  onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
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

      {/* ========================================================= */}
      {/* MODAL: MUTASI / TRANSFER STOK ANTAR GUDANG                */}
      {/* ========================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                  <span>Mutasi Stok Antar Gudang</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer barang antara Gudang Bangetayu (Penyimpanan) dan Outlet Jomblang (Penjualan).
                </p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Dari Gudang Asal</label>
                  <select
                    required
                    value={transferForm.sourceLocationId}
                    onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code === 'BANGETAYU' ? 'Penyimpanan' : 'Penjualan'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ke Gudang Tujuan</label>
                  <select
                    required
                    value={transferForm.destLocationId}
                    onChange={(e) => setTransferForm({ ...transferForm, destLocationId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code === 'BANGETAYU' ? 'Penyimpanan' : 'Penjualan'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Pilih Produk</label>
                <select
                  required
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {products.map((p) => {
                    const srcLoc = locations.find((l) => l.id === transferForm.sourceLocationId);
                    const availStock = srcLoc ? getProductStockInLoc(p, srcLoc.code) : p.stock;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] — Sisa di asal: {availStock} {p.unit}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Jumlah Unit yang Dipindahkan</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Mutasi / Surat Jalan</label>
                <input
                  type="text"
                  placeholder="Misal: Restok toko Jomblang dari gudang Bangetayu"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Kirim Mutasi Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RIWAYAT MUTASI ANTAR GUDANG                        */}
      {/* ========================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-700" />
                  <span>Riwayat Mutasi Antar Gudang</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan pergerakan stok antara Gudang Bangetayu dan Outlet Jomblang.
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm">Memuat riwayat transfer...</p>
              </div>
            ) : transferHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">Belum ada riwayat mutasi transfer antar gudang.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <th className="px-3.5 py-2.5">No Transfer</th>
                      <th className="px-3.5 py-2.5">Tanggal</th>
                      <th className="px-3.5 py-2.5">Produk</th>
                      <th className="px-3.5 py-2.5">Rute Mutasi</th>
                      <th className="px-3.5 py-2.5 text-right">Jumlah</th>
                      <th className="px-3.5 py-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferHistory.map((trf) => (
                      <tr key={trf.id} className="hover:bg-slate-50/80">
                        <td className="px-3.5 py-3 font-mono font-medium text-slate-800">{trf.transferNo}</td>
                        <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(trf.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-800">{trf.product?.name}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="font-medium text-amber-700">{trf.sourceLocation?.name}</span>
                          <span className="mx-1 text-slate-400">➜</span>
                          <span className="font-medium text-emerald-700">{trf.destLocation?.name}</span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold text-indigo-700">
                          {trf.quantity} {trf.product?.unit}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500">{trf.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PENYESUAIAN STOK (Barang Masuk / Keluar)           */}
      {/* ========================================================= */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Penyesuaian Stok</h3>
            <p className="text-xs text-slate-500 mb-4">
              Produk: <span className="font-semibold text-slate-700">{selectedProduct.name}</span>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Lokasi Gudang</label>
                <select
                  required
                  value={adjustForm.locationId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {locations.map((loc) => {
                    const currentInLoc = getProductStockInLoc(selectedProduct, loc.code);
                    return (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} (Stok saat ini: {currentInLoc} {selectedProduct.unit})
                      </option>
                    );
                  })}
                </select>
              </div>

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
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Misal: Penyesuaian stok opname / barang rusak"
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
