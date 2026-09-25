import React, { useState, useEffect } from 'react';
import { purchaseService, productService } from '../services/api';
import { 
  Truck, 
  PlusCircle, 
  Search, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck,
  TrendingDown,
  Layers
} from 'lucide-react';

export default function PurchasesModule({ user, onOpenAuth }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState(null);

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { productId: '', quantity: 1, costPrice: 0 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [purchasesRes, prodRes] = await Promise.all([
        purchaseService.getPurchases(),
        productService.getProducts()
      ]);
      setPurchases(purchasesRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data pembelian.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setSupplierName('');
    setPaymentStatus('PAID');
    setNotes('');
    setItems([{ productId: products[0]?.id || '', quantity: 1, costPrice: products[0]?.costPrice || 0 }]);
    setIsModalOpen(true);
  };

  const handleProductChange = (index, prodId) => {
    const selected = products.find((p) => p.id === prodId);
    const newItems = [...items];
    newItems[index].productId = prodId;
    newItems[index].costPrice = selected ? parseFloat(selected.costPrice || 0) : 0;
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...items];
    newItems[index].quantity = parseInt(qty) || 1;
    setItems(newItems);
  };

  const handlePriceChange = (index, cost) => {
    const newItems = [...items];
    newItems[index].costPrice = parseFloat(cost) || 0;
    setItems(newItems);
  };

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      { productId: defaultProd?.id || '', quantity: 1, costPrice: defaultProd?.costPrice || 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await purchaseService.createPurchase({
        supplierName,
        paymentStatus,
        notes,
        items
      });
      setSuccessMsg(`Pembelian berhasil dicatat! No PO: ${res.data.data.purchaseNo}`);
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mencatat transaksi pembelian.');
    }
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter((p) => {
    return (
      p.purchaseNo.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Calculate Metrics
  const totalExpense = purchases.reduce((acc, p) => acc + parseFloat(p.totalAmount || 0), 0);
  const totalTransactions = purchases.length;
  const totalItemsPurchased = purchases.reduce(
    (acc, p) => acc + p.items.reduce((sum, item) => sum + item.quantity, 0),
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
            <p className="text-sm font-medium text-slate-500">Total Pengeluaran Pembelian</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              Rp {totalExpense.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Faktur Pembelian (PO)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalTransactions} <span className="text-sm font-normal text-slate-500">faktur</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Barang Masuk (Stok In)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalItemsPurchased.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">pcs</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no PO, supplier, atau catatan..."
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Pembelian Baru</span>
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">No Purchase Order (PO)</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pemasok / Supplier</th>
                <th className="px-6 py-4">Status Pembayaran</th>
                <th className="px-6 py-4">Total Biaya</th>
                <th className="px-6 py-4">Petugas</th>
                <th className="px-6 py-4 text-right">Rincian Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {purchase.purchaseNo}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(purchase.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {purchase.supplierName}
                    {purchase.notes && (
                      <span className="block text-xs text-slate-400">{purchase.notes}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      purchase.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {purchase.paymentStatus === 'PAID' ? 'LUNAS' : 'TEMPO / PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                    Rp {Number(purchase.totalAmount).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                    {purchase.user?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedPurchaseDetail(purchase)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Lihat {purchase.items.length} Item
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPurchases.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Belum ada riwayat transaksi pembelian stok.</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm">Memuat riwayat pembelian...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Pembelian Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Catat Pembelian dari Supplier</h3>
            <p className="text-xs text-slate-500 mb-4">
              Stok produk akan bertambah secara otomatis dan harga modal estimasi diperbarui.
            </p>

            <form onSubmit={handleSubmitPurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Supplier / Pabrik</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Sumber Plastik Abadi"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Status Pembayaran</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="PAID">Lunas (Paid)</option>
                    <option value="PENDING">Tempo / Pending</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Item Barang yang Dibeli</label>
                <div className="space-y-2.5">
                  {items.map((item, index) => {
                    const subtotal = item.quantity * item.costPrice;

                    return (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-2.5 items-center">
                        <div className="flex-1 w-full sm:w-auto">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          >
                            <option value="" disabled>Pilih Produk...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name} (Stok Saat Ini: {p.stock})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div className="w-32">
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="Harga Beli"
                            value={item.costPrice}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div className="w-28 text-right font-bold text-xs text-slate-800">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Baris Produk</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Transaksi</label>
                <input
                  type="text"
                  placeholder="Catatan no surat jalan / tempo jatuh tempo, dll."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-800">Total Biaya Pembelian:</span>
                <span className="text-xl font-bold text-blue-900">
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Simpan & Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Rincian Pembelian */}
      {selectedPurchaseDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Rincian Purchase Order (PO)</h3>
                <p className="text-xs font-mono text-blue-600">{selectedPurchaseDetail.purchaseNo}</p>
              </div>
              <button
                onClick={() => setSelectedPurchaseDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1 mb-4 text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div>Supplier: <strong className="text-slate-900">{selectedPurchaseDetail.supplierName}</strong></div>
              <div>Status: <strong className="text-slate-900">{selectedPurchaseDetail.paymentStatus === 'PAID' ? 'LUNAS' : 'TEMPO / PENDING'}</strong></div>
              <div>Tanggal: {new Date(selectedPurchaseDetail.createdAt).toLocaleString('id-ID')}</div>
              {selectedPurchaseDetail.notes && <div>Catatan: {selectedPurchaseDetail.notes}</div>}
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {selectedPurchaseDetail.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{item.product.name}</span>
                    <span className="block text-[11px] text-slate-400">{item.quantity} pcs @ Rp {Number(item.costPrice).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="font-bold text-slate-900">
                    Rp {Number(item.subtotal).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span>Total Pengeluaran:</span>
              <span className="text-blue-700 text-base">
                Rp {Number(selectedPurchaseDetail.totalAmount).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
