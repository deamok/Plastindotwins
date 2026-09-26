import React, { useState, useEffect } from 'react';
import { saleService, productService } from '../services/api';
import { 
  ShoppingCart, 
  PlusCircle, 
  Search, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  Boxes
} from 'lucide-react';

export default function SalesModule({ user, onOpenAuth }) {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { 
      productId: '', 
      unitType: 'base', 
      saleQty: 1, 
      saleUnit: 'buah', 
      itemsPerUnit: 1, 
      unitPrice: 0,
      customUnitName: ''
    }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [salesRes, prodRes] = await Promise.all([
        saleService.getSales(),
        productService.getProducts()
      ]);
      setSales(salesRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data penjualan.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const defaultProd = products[0];
    const defaultUnit = defaultProd?.unit || 'buah';
    const defaultPrice = defaultProd ? parseFloat(defaultProd.price || 0) : 0;

    setCustomerName('');
    setPaymentMethod('CASH');
    setNotes('');
    setItems([
      { 
        productId: defaultProd?.id || '', 
        unitType: 'base', 
        saleQty: 1, 
        saleUnit: defaultUnit, 
        itemsPerUnit: 1, 
        unitPrice: defaultPrice,
        customUnitName: ''
      }
    ]);
    setIsModalOpen(true);
  };

  const handleProductChange = (index, prodId) => {
    const selected = products.find((p) => p.id === prodId);
    const baseUnit = selected?.unit || 'buah';
    const basePrice = selected ? parseFloat(selected.price || 0) : 0;

    const newItems = [...items];
    newItems[index].productId = prodId;
    newItems[index].unitType = 'base';
    newItems[index].saleUnit = baseUnit;
    newItems[index].itemsPerUnit = 1;
    newItems[index].unitPrice = basePrice;
    newItems[index].customUnitName = '';
    setItems(newItems);
  };

  const handleUnitTypeChange = (index, unitType) => {
    const newItems = [...items];
    const item = newItems[index];
    const prod = products.find((p) => p.id === item.productId);
    const baseUnit = prod?.unit || 'buah';
    const basePrice = prod ? parseFloat(prod.price || 0) : 0;

    item.unitType = unitType;

    let targetUnit = baseUnit;
    let ratio = 1;

    if (unitType === 'base') {
      targetUnit = baseUnit;
      ratio = 1;
    } else if (unitType === 'lusin') {
      targetUnit = 'lusin';
      ratio = 12;
    } else if (unitType === 'pack') {
      targetUnit = 'pack';
      ratio = (baseUnit.toLowerCase() === 'pak' || baseUnit.toLowerCase() === 'pack') ? 1 : 10;
    } else if (unitType === 'kodi') {
      targetUnit = 'kodi';
      ratio = 20;
    } else if (unitType === 'gross') {
      targetUnit = 'gross';
      ratio = 144;
    } else if (unitType === 'dus') {
      targetUnit = 'dus';
      ratio = 24;
    } else if (unitType === 'custom') {
      targetUnit = item.customUnitName || 'satuan';
      ratio = item.itemsPerUnit || 1;
    }

    item.saleUnit = targetUnit;
    item.itemsPerUnit = ratio;
    // Set harga jual rekomendasi proporsional dengan rasio satuan
    item.unitPrice = basePrice * ratio;
    setItems(newItems);
  };

  const handleCustomUnitNameChange = (index, name) => {
    const newItems = [...items];
    newItems[index].customUnitName = name;
    newItems[index].saleUnit = name || 'satuan';
    setItems(newItems);
  };

  const handleItemsPerUnitChange = (index, ratioVal) => {
    const newItems = [...items];
    const item = newItems[index];
    const prod = products.find((p) => p.id === item.productId);
    const basePrice = prod ? parseFloat(prod.price || 0) : 0;

    const ratio = parseFloat(ratioVal) || 1;
    item.itemsPerUnit = ratio;

    // Jika harga masih proporsional dengan harga dasar, update otomatis
    item.unitPrice = basePrice * ratio;
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...items];
    newItems[index].saleQty = parseFloat(qty) || 0;
    setItems(newItems);
  };

  const handlePriceChange = (index, price) => {
    const newItems = [...items];
    newItems[index].unitPrice = parseFloat(price) || 0;
    setItems(newItems);
  };

  const handleAddItem = () => {
    const defaultProd = products[0];
    const defaultUnit = defaultProd?.unit || 'buah';
    const defaultPrice = defaultProd ? parseFloat(defaultProd.price || 0) : 0;

    setItems([
      ...items,
      { 
        productId: defaultProd?.id || '', 
        unitType: 'base', 
        saleQty: 1, 
        saleUnit: defaultUnit, 
        itemsPerUnit: 1, 
        unitPrice: defaultPrice,
        customUnitName: ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + ((parseFloat(item.saleQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0);
  };

  const calculateTotalBaseUnits = () => {
    return items.reduce((acc, item) => acc + Math.round((parseFloat(item.saleQty) || 0) * (parseFloat(item.itemsPerUnit) || 1)), 0);
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    try {
      setError('');

      // Validasi ketersediaan stok sebelum submit
      for (const item of items) {
        const prod = products.find((p) => p.id === item.productId);
        const sQty = parseFloat(item.saleQty) || 0;
        const ratio = parseFloat(item.itemsPerUnit) || 1;
        const neededBaseQty = Math.round(sQty * ratio);

        if (sQty <= 0) {
          setError('Jumlah penjualan (Qty) harus lebih dari 0.');
          return;
        }

        if (prod && neededBaseQty > prod.stock) {
          setError(
            `Stok untuk "${prod.name}" tidak mencukupi! Dibutuhkan: ${neededBaseQty} ${prod.unit}, sisa di gudang: ${prod.stock} ${prod.unit}.`
          );
          return;
        }
      }

      const payloadItems = items.map((item) => {
        const sQty = parseFloat(item.saleQty) || 1;
        const ratio = parseFloat(item.itemsPerUnit) || 1;
        return {
          productId: item.productId,
          saleQty: sQty,
          saleUnit: item.saleUnit || 'buah',
          itemsPerUnit: ratio,
          quantity: Math.round(sQty * ratio),
          unitPrice: parseFloat(item.unitPrice) || 0
        };
      });

      const res = await saleService.createSale({
        customerName,
        paymentMethod,
        notes,
        items: payloadItems
      });

      setSuccessMsg(`Penjualan berhasil dicatat! No Invoice: ${res.data.data.invoiceNo}`);
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mencatat transaksi penjualan.');
    }
  };

  // Filtered sales
  const filteredSales = sales.filter((s) => {
    return (
      s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Calculate Metrics
  const totalRevenue = sales.reduce((acc, s) => acc + parseFloat(s.totalAmount || 0), 0);
  const totalTransactions = sales.length;
  const totalItemsSold = sales.reduce(
    (acc, s) => acc + s.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    0
  );

  return (
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
            <p className="text-sm font-medium text-slate-500">Total Omzet Penjualan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Transaksi Penjualan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalTransactions} <span className="text-sm font-normal text-slate-500">faktur</span></p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Fisik Terjual</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalItemsSold.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">unit (buah/pak)</span></p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no invoice, pelanggan, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Penjualan Baru</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">No Invoice</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Rincian Item & Satuan Jual</th>
                <th className="px-6 py-4">Metode Bayar</th>
                <th className="px-6 py-4">Total Penjualan</th>
                <th className="px-6 py-4">Petugas</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {sale.invoiceNo}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(sale.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {sale.customerName}
                    {sale.notes && (
                      <span className="block text-xs text-slate-400">{sale.notes}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {sale.items.map((it, idx) => (
                        <div key={idx} className="text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">{it.product?.name}:</span>{' '}
                          <span className="font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                            {Number(it.saleQty || it.quantity)} {it.saleUnit || it.product?.unit || 'buah'}
                          </span>{' '}
                          {it.saleUnit && it.product?.unit && it.saleUnit.toLowerCase() !== it.product.unit.toLowerCase() && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              (×{Number(it.itemsPerUnit || 1)} = {it.quantity} {it.product.unit})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      sale.paymentMethod === 'CASH'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sale.paymentMethod === 'TRANSFER'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                    Rp {Number(sale.totalAmount).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                    {sale.user?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedSaleDetail(sale)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Belum ada riwayat transaksi penjualan.</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm">Memuat riwayat penjualan...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Penjualan Baru dengan Pilihan Multi-Satuan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Catat Transaksi Penjualan</h3>
                <p className="text-xs text-slate-500">
                  Dapat memilih satuan penjualan (misal: <strong>Lusin</strong>, <strong>Pack</strong>, <strong>Kodi</strong>, dsb). Stok otomatis dikonversi dan dipotong dari gudang.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko Maju Plastik / Bpk. Rudi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="CASH">Tunai (Cash)</option>
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TEMPO">Kredit / Tempo</option>
                  </select>
                </div>
              </div>

              {/* Items List with Multi-Unit & Conversion */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-600" /> Item Penjualan & Satuan
                  </label>
                  <span className="text-[11px] text-slate-400">Pilih Lusin, Pack, Kodi, atau Satuan Dasar</span>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const currentProd = products.find((p) => p.id === item.productId);
                    const baseUnit = currentProd?.unit || 'buah';
                    const basePrice = currentProd ? parseFloat(currentProd.price || 0) : 0;
                    const sQty = parseFloat(item.saleQty) || 0;
                    const ratio = parseFloat(item.itemsPerUnit) || 1;
                    const outgoingBaseUnits = Math.round(sQty * ratio);
                    const subtotal = sQty * (parseFloat(item.unitPrice) || 0);
                    const isStockInsufficient = currentProd && outgoingBaseUnits > currentProd.stock;

                    return (
                      <div key={index} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                          {/* Product Selection */}
                          <div className="flex-1 w-full sm:w-auto">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Produk</label>
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            >
                              <option value="" disabled>Pilih Produk...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {p.name} (Stok: {p.stock} {p.unit || 'buah'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Unit Selection Dropdown */}
                          <div className="w-full sm:w-40">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Satuan Jual</label>
                            <select
                              value={item.unitType}
                              onChange={(e) => handleUnitTypeChange(index, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            >
                              <option value="base">{baseUnit.toUpperCase()} (Dasar)</option>
                              <option value="lusin">Lusin (12 {baseUnit})</option>
                              <option value="pack">Pack / Pak</option>
                              <option value="kodi">Kodi (20 {baseUnit})</option>
                              <option value="gross">Gross (144 {baseUnit})</option>
                              <option value="dus">Dus / Karton</option>
                              <option value="custom">Satuan Kustom...</option>
                            </select>
                          </div>

                          {/* Qty in chosen unit */}
                          <div className="w-full sm:w-24">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Jumlah</label>
                            <div className="relative">
                              <input
                                type="number"
                                required
                                step="any"
                                min="0.01"
                                placeholder="Qty"
                                value={item.saleQty}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Items Per Unit (Ratio) */}
                          <div className="w-full sm:w-28">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                              Isi per {item.saleUnit || 'unit'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                required
                                step="any"
                                min="0.01"
                                disabled={item.unitType === 'base'}
                                placeholder="Isi"
                                value={item.itemsPerUnit}
                                onChange={(e) => handleItemsPerUnitChange(index, e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                                  item.unitType === 'base'
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-white border border-blue-300 text-blue-800'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Unit Price per chosen unit */}
                          <div className="w-full sm:w-32">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                              Harga / {item.saleUnit || 'unit'} (Rp)
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="Harga Jual"
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(index, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="pt-4 hidden sm:block">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              disabled={items.length === 1}
                              className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Optional Custom Unit Name Input */}
                        {item.unitType === 'custom' && (
                          <div className="flex items-center gap-2 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-xs">
                            <label className="font-semibold text-amber-900 whitespace-nowrap">Nama Satuan Kustom:</label>
                            <input
                              type="text"
                              required
                              placeholder="Misal: Bal, Roll, Karung, Ikat"
                              value={item.customUnitName}
                              onChange={(e) => handleCustomUnitNameChange(index, e.target.value)}
                              className="flex-1 px-2.5 py-1 bg-white border border-amber-300 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            />
                            <span className="text-slate-500 text-[11px]">(Contoh: 1 Bal = 50 pak)</span>
                          </div>
                        )}

                        {/* Visual Stock Deduction & Subtotal Feedback Banner */}
                        <div className={`p-2 rounded-lg flex flex-wrap items-center justify-between text-xs gap-2 border ${
                          isStockInsufficient 
                            ? 'bg-red-50 border-red-200 text-red-700' 
                            : 'bg-emerald-50/70 border-emerald-200/80 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold">Potong Stok:</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                              {item.saleQty} {item.saleUnit} {item.unitType !== 'base' && `(× ${item.itemsPerUnit} ${baseUnit})`}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className={`font-bold px-2 py-0.5 rounded border ${
                              isStockInsufficient
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              -{outgoingBaseUnits.toLocaleString('id-ID')} {baseUnit}
                            </span>
                            {currentProd && (
                              <span className={`text-[11px] font-medium ${isStockInsufficient ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                {isStockInsufficient 
                                  ? `⚠️ Stok Tidak Cukup! (Sisa: ${currentProd.stock} ${baseUnit})` 
                                  : `(Sisa nanti: ${currentProd.stock - outgoingBaseUnits} ${baseUnit})`
                                }
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-slate-900 text-right">
                            Subtotal: Rp {subtotal.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Baris Produk Lain</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Transaksi</label>
                <input
                  type="text"
                  placeholder="Catatan pengiriman, no resi, info pesanan, dll."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Total Fisik Barang Terjual:</span>
                  <span className="text-base font-bold text-emerald-900">
                    -{calculateTotalBaseUnits().toLocaleString('id-ID')} unit (buah/pak)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Tagihan Penjualan:</span>
                  <span className="text-xl font-bold text-emerald-900">
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Simpan & Cetak Faktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Rincian Penjualan */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Rincian Faktur Penjualan</h3>
                <p className="text-xs font-mono text-emerald-600 font-semibold">{selectedSaleDetail.invoiceNo}</p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1 mb-4 text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div>Pelanggan: <strong className="text-slate-900">{selectedSaleDetail.customerName}</strong></div>
              <div>Metode: <strong className="text-slate-900">{selectedSaleDetail.paymentMethod}</strong></div>
              <div>Tanggal: {new Date(selectedSaleDetail.createdAt).toLocaleString('id-ID')}</div>
              {selectedSaleDetail.notes && <div>Catatan: {selectedSaleDetail.notes}</div>}
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {selectedSaleDetail.items.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{item.product?.name}</span>
                    <span className="font-bold text-slate-900">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Terjual: <strong className="text-slate-800">{Number(item.saleQty || item.quantity)} {item.saleUnit || item.product?.unit || 'buah'}</strong>
                      {' '}@ Rp {Number(item.unitPrice).toLocaleString('id-ID')}
                      {item.saleUnit && item.product?.unit && item.saleUnit.toLowerCase() !== item.product.unit.toLowerCase() && (
                        <span className="text-slate-400"> (×{Number(item.itemsPerUnit || 1)} = {item.quantity} {item.product.unit})</span>
                      )}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      -{item.quantity} {item.product?.unit || 'buah'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span>Total Penjualan:</span>
              <span className="text-emerald-700 text-base">
                Rp {Number(selectedSaleDetail.totalAmount).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
