import React, { useState, useEffect, useRef, useMemo } from 'react';
import { saleService, productService, contactService, locationService } from '../services/api';
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
  ArrowRight,
  Boxes,
  Users,
  CreditCard,
  Phone,
  MapPin,
  Store,
  Printer,
  Truck,
  Send,
  Check,
  XCircle,
  Edit3,
  Clock,
  ShieldCheck,
  FileCheck,
  UserCheck,
  Crown
} from 'lucide-react';

// Helper konversi angka ke kata-kata bahasa Indonesia (Terbilang)
function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return 'nol';
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function bilang(num) {
    if (num < 12) return satuan[num];
    if (num < 20) return bilang(num - 10) + ' belas';
    if (num < 100) return bilang(Math.floor(num / 10)) + ' puluh ' + (num % 10 > 0 ? bilang(num % 10) : '');
    if (num < 200) return 'seratus ' + (num - 100 > 0 ? bilang(num - 100) : '');
    if (num < 1000) return bilang(Math.floor(num / 100)) + ' ratus ' + (num % 100 > 0 ? bilang(num % 100) : '');
    if (num < 2000) return 'seribu ' + (num - 1000 > 0 ? bilang(num - 1000) : '');
    if (num < 1000000) return bilang(Math.floor(num / 1000)) + ' ribu ' + (num % 1000 > 0 ? bilang(num % 1000) : '');
    if (num < 1000000000) return bilang(Math.floor(num / 1000000)) + ' juta ' + (num % 1000000 > 0 ? bilang(num % 1000000) : '');
    if (num < 1000000000000) return bilang(Math.floor(num / 1000000000)) + ' milyar ' + (num % 1000000000 > 0 ? bilang(num % 1000000000) : '');
    return bilang(Math.floor(num / 1000000000000)) + ' triliun ' + (num % 1000000000000 > 0 ? bilang(num % 1000000000000) : '');
  }
  return bilang(n).replace(/\s+/g, ' ').trim();
}

export default function SalesModule({ user, onOpenAuth }) {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OFFER_PENDING' | 'OFFER_APPROVED' | 'INVOICE' | 'DELIVERING' | 'COMPLETED'

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [reviewModalSale, setReviewModalSale] = useState(null);
  const [reviewItemDecisions, setReviewItemDecisions] = useState({});
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit Transaksi Modal (Admin & Developer Godmode)
  const [editingSale, setEditingSale] = useState(null);
  const [editSaleForm, setEditSaleForm] = useState({
    customerName: '',
    customerAddress: '',
    paymentMethod: 'CASH',
    notes: '',
    deliveryDriver: '',
    deliveryNotes: '',
    status: ''
  });
  const [savingEditSale, setSavingEditSale] = useState(false);

  // Print Document Modals: 'OFFER' | 'INVOICE' | 'DELIVERY'
  const [printDocumentType, setPrintDocumentType] = useState(null);
  const [printDocumentSale, setPrintDocumentSale] = useState(null);

  // Delivery Status Update Modal
  const [shippingModalSale, setShippingModalSale] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [submittingShipping, setSubmittingShipping] = useState(false);

  // Form State (Buat Penawaran Baru oleh Sales)
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
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

  const printAreaRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [salesRes, prodRes, contactsRes, locsRes] = await Promise.all([
        saleService.getSales(),
        productService.getProducts(),
        contactService.getContacts({ type: 'CUSTOMER' }).catch(() => ({ data: { data: [] } })),
        locationService.getLocations().catch(() => ({ data: { data: [] } }))
      ]);
      setSales(salesRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setContacts(contactsRes.data.data || []);
      setLocations(locsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data penjualan.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const defaultProd = products[0];
    const defaultUnit = defaultProd?.unit || 'buah';
    const defaultPrice = defaultProd ? parseFloat(defaultProd.price || 0) : 0;
    const defaultLoc = locations.find((l) => l.code === 'JOMBLANG') || locations[0];

    setCustomerName('');
    setCustomerAddress('');
    setContactId('');
    setLocationId(defaultLoc?.id || '');
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
    setIsCreateModalOpen(true);
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

  // Submit Draft Penawaran oleh Sales
  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    try {
      setError('');

      for (const item of items) {
        const sQty = parseFloat(item.saleQty) || 0;
        if (sQty <= 0) {
          setError('Jumlah barang yang ditawarkan (Qty) harus lebih dari 0.');
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
        customerAddress,
        contactId: contactId || null,
        locationId: locationId || undefined,
        paymentMethod,
        notes,
        items: payloadItems
      });

      setSuccessMsg(`Draft Penawaran ${res.data.data.offerNo} berhasil dibuat dan dikirim ke Admin untuk ditinjau!`);
      setIsCreateModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat draft penawaran.');
    }
  };

  // =========================================================================
  // REVIEW FLOW OLEH ADMIN (DEVELOPER & ADMIN)
  // =========================================================================
  const handleOpenReviewModal = (sale) => {
    if (!sale) return;
    setReviewModalSale(sale);
    setAdminReviewNotes(sale.adminNotes || '');
    const initialDecisions = {};
    (sale.items || []).forEach((item) => {
      initialDecisions[item.id] = {
        adminDecision: item.adminDecision || 'APPROVED',
        adminPrice: item.adminPrice !== null && item.adminPrice !== undefined ? item.adminPrice : item.offeredPrice
      };
    });
    setReviewItemDecisions(initialDecisions);
  };

  const handleDecisionChange = (itemId, decision) => {
    setReviewItemDecisions((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        adminDecision: decision
      }
    }));
  };

  const handleCustomAdminPriceChange = (itemId, price) => {
    setReviewItemDecisions((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        adminPrice: price
      }
    }));
  };

  const calculateReviewTotal = () => {
    if (!reviewModalSale || !Array.isArray(reviewModalSale.items)) return 0;
    return reviewModalSale.items.reduce((sum, item) => {
      const dec = reviewItemDecisions[item.id];
      let p = parseFloat(item.offeredPrice) || 0;
      if (dec?.adminDecision === 'USE_APP_PRICE') p = parseFloat(item.appPrice) || 0;
      if (dec?.adminDecision === 'CUSTOM_PRICE') p = parseFloat(dec.adminPrice !== undefined && dec.adminPrice !== '' ? dec.adminPrice : item.appPrice) || 0;
      const qty = parseFloat(item.saleQty) || 1;
      return sum + (qty * p);
    }, 0);
  };

  const handleSubmitReview = async () => {
    if (!reviewModalSale) return;
    try {
      setSubmittingReview(true);
      setError('');

      const reviewedItemsPayload = reviewModalSale.items.map((it) => {
        const dec = reviewItemDecisions[it.id] || { adminDecision: 'APPROVED' };
        return {
          itemId: it.id,
          adminDecision: dec.adminDecision,
          adminPrice: dec.adminDecision === 'CUSTOM_PRICE' ? parseFloat(dec.adminPrice) : undefined
        };
      });

      const res = await saleService.reviewOffer(reviewModalSale.id, {
        adminNotes: adminReviewNotes,
        reviewedItems: reviewedItemsPayload
      });

      setSuccessMsg(`Draft penawaran ${res.data.data.offerNo} telah disetujui Admin menjadi Dokumen Penawaran Resmi!`);
      setReviewModalSale(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan hasil review penawaran.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // =========================================================================
  // PELANGGAN SETUJU -> TERBITKAN FAKTUR & KIRIM KE GUDANG
  // =========================================================================
  const handleApproveToInvoice = async (sale) => {
    if (!window.confirm(`Konfirmasi pelanggan telah setuju dengan Dokumen Penawaran #${sale.offerNo}?\n\nSistem akan menerbitkan Faktur Penjualan resmi, memotong stok fisik gudang, dan meneruskan order ke bagian Gudang untuk disiapkan.`)) {
      return;
    }

    try {
      setError('');
      const res = await saleService.approveToInvoice(sale.id);
      setSuccessMsg(`Faktur Penjualan #${res.data.data.invoiceNo} berhasil diterbitkan dan pesanan telah diteruskan ke Gudang!`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menerbitkan faktur penjualan.');
    }
  };

  // =========================================================================
  // GUDANG FLOW: UPDATE STATUS PENGIRIMAN
  // =========================================================================
  const handleOpenShippingModal = (sale) => {
    setShippingModalSale(sale);
    setDriverName(sale.deliveryDriver || '');
    setShippingNotes(sale.deliveryNotes || '');
  };

  const handleUpdateShipping = async (status) => {
    if (!shippingModalSale) return;
    try {
      setSubmittingShipping(true);
      setError('');

      const res = await saleService.updateShippingStatus(shippingModalSale.id, {
        status,
        deliveryDriver: driverName,
        deliveryNotes: shippingNotes
      });

      setSuccessMsg(res.data.message || 'Status pengiriman berhasil diperbarui.');
      setShippingModalSale(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui status pengiriman.');
    } finally {
      setSubmittingShipping(false);
    }
  };

  // =========================================================================
  // PRINT DOKUMEN MODAL
  // =========================================================================
  const handlePrintDocument = (sale, docType) => {
    setPrintDocumentSale(sale);
    setPrintDocumentType(docType);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  // =========================================================================
  // EDIT & DELETE SALE (ADMIN & DEVELOPER GODMODE)
  // =========================================================================
  const handleOpenEditSaleModal = (sale) => {
    setEditingSale(sale);
    setEditSaleForm({
      customerName: sale.customerName || '',
      customerAddress: sale.customerAddress || '',
      paymentMethod: sale.paymentMethod || 'CASH',
      notes: sale.notes || '',
      deliveryDriver: sale.deliveryDriver || '',
      deliveryNotes: sale.deliveryNotes || '',
      status: sale.status || 'OFFER_PENDING'
    });
  };

  const handleSaveEditSale = async (e) => {
    e.preventDefault();
    if (!editingSale) return;
    try {
      setSavingEditSale(true);
      setError('');
      await saleService.updateSale(editingSale.id, editSaleForm);
      setSuccessMsg(`Transaksi #${editingSale.invoiceNo || editingSale.offerNo} berhasil diperbarui.`);
      setEditingSale(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui transaksi.');
    } finally {
      setSavingEditSale(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    const isDeductStock = ['INVOICE', 'DELIVERING', 'COMPLETED'].includes(sale.status);
    const msg = isDeductStock
      ? `Yakin ingin membatalkan & menghapus transaksi Faktur #${sale.invoiceNo}? Stok fisik produk akan otomatis dikembalikan ke gudang.`
      : `Yakin ingin menghapus dokumen penawaran #${sale.offerNo}?`;

    if (!window.confirm(msg)) {
      return;
    }

    try {
      setError('');
      await saleService.deleteSale(sale.id);
      setSuccessMsg(`Transaksi #${sale.invoiceNo || sale.offerNo} berhasil dihapus.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus transaksi.');
    }
  };

  const isAdminOrDev = user?.role === 'DEVELOPER' || user?.role === 'ADMIN';
  const isGudang = user?.role === 'GUDANG';
  const isSales = user?.role === 'SALES';

  // Filter Sales berdasarkan Hak Akses Role
  const filteredSales = sales.filter((s) => {
    // 1. Tiap Sales HANYA bisa melihat dokumen yang mereka buat sendiri
    if (isSales && !isAdminOrDev && s.userId && user?.id && s.userId !== user.id) {
      return false;
    }

    // 2. Bagian Gudang hanya melihat dokumen pesanan yang siap disiapkan / dikirim
    if (isGudang && !isAdminOrDev && !['INVOICE', 'DELIVERING', 'COMPLETED'].includes(s.status)) {
      return false;
    }

    const matchSearch = (
      (s.invoiceNo && s.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (s.offerNo && s.offerNo.toLowerCase().includes(search.toLowerCase())) ||
      (s.deliveryNo && s.deliveryNo.toLowerCase().includes(search.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (s.user?.name && s.user.name.toLowerCase().includes(search.toLowerCase()))
    );

    if (!matchSearch) return false;

    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  // Kumpulan dokumen yang dihitung untuk kartu metrik sesuai peran
  const visibleSales = isSales && !isAdminOrDev
    ? sales.filter((s) => s.userId === user?.id)
    : isGudang && !isAdminOrDev
    ? sales.filter((s) => ['INVOICE', 'DELIVERING', 'COMPLETED'].includes(s.status))
    : sales;

  // Badge Counts
  const countPendingReview = visibleSales.filter((s) => s.status === 'OFFER_PENDING').length;
  const countApprovedOffer = visibleSales.filter((s) => s.status === 'OFFER_APPROVED').length;
  const countInvoice = visibleSales.filter((s) => s.status === 'INVOICE').length;
  const countDelivering = visibleSales.filter((s) => s.status === 'DELIVERING').length;
  const countCompleted = visibleSales.filter((s) => s.status === 'COMPLETED').length;

  const totalOmzet = visibleSales
    .filter((s) => ['INVOICE', 'DELIVERING', 'COMPLETED'].includes(s.status))
    .reduce((acc, s) => acc + parseFloat(s.totalAmount || 0), 0);

  // Perhitungan Diskon & Total Dokumen Cetak (Surat Penawaran SPH & Faktur)
  // Nominal diskon adalah selisih antara harga jual sesuai harga barang dengan harga jual yg ditawarkan
  const docCalculations = useMemo(() => {
    if (!printDocumentSale || !Array.isArray(printDocumentSale.items)) {
      return {
        itemsWithPrice: [],
        totalStandardAmount: 0,
        totalOfferedAmount: 0,
        discountAmount: 0
      };
    }

    let totalStandardAmount = 0;
    let totalOfferedAmount = 0;

    const itemsWithPrice = printDocumentSale.items.map((item) => {
      const qty = parseFloat(item.saleQty) || 1;
      const ratio = parseFloat(item.itemsPerUnit) || 1;

      // Harga jual sesuai harga master barang (per satuan transaksi)
      const stdPrice = (item.appPrice && parseFloat(item.appPrice) > 0)
        ? parseFloat(item.appPrice)
        : (item.product?.price ? parseFloat(item.product.price) * ratio : parseFloat(item.unitPrice) || 0);

      // Harga jual yang ditawarkan sales / aktif
      const offeredPrice = parseFloat(item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : item.offeredPrice) || 0;

      const stdSubtotal = stdPrice * qty;
      const offeredSubtotal = offeredPrice * qty;

      totalStandardAmount += stdSubtotal;
      totalOfferedAmount += offeredSubtotal;

      const hasDiscount = offeredPrice < stdPrice;
      const discountPerUnit = hasDiscount ? (stdPrice - offeredPrice) : 0;

      return {
        ...item,
        stdPrice,
        offeredPrice,
        stdSubtotal,
        offeredSubtotal,
        hasDiscount,
        discountPerUnit
      };
    });

    const finalOfferedTotal = Number(printDocumentSale.totalAmount) || totalOfferedAmount;
    const discountAmount = Math.max(0, totalStandardAmount - finalOfferedTotal);

    return {
      itemsWithPrice,
      totalStandardAmount,
      totalOfferedAmount: finalOfferedTotal,
      discountAmount
    };
  }, [printDocumentSale]);

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 font-bold hover:text-red-700">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 font-bold hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Admin Notification Banner jika ada Penawaran Pending */}
      {isAdminOrDev && countPendingReview > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Pemberitahuan Persetujuan Penawaran ({countPendingReview} Draft)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Terdapat draft penawaran barang dari Sales yang membutuhkan peninjauan dan persetujuan harga khusus oleh Admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('OFFER_PENDING')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Tinjau Draft Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Gudang Notification Banner jika ada Faktur siap disiapkan */}
      {(isGudang || isAdminOrDev) && countInvoice > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">
                Antrean Pengiriman Gudang ({countInvoice} Faktur)
              </h4>
              <p className="text-xs text-blue-700 mt-0.5">
                Pelanggan telah menyetujui penawaran. Faktur siap disiapkan oleh bagian Gudang dan dikirim bersama Dokumen Pengiriman (Surat Jalan).
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('INVOICE')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Lihat Antrean Gudang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {isGudang ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Antrean Siap Kirim</p>
            <p className="text-lg sm:text-xl font-bold text-blue-700 mt-1">
              {countInvoice} <span className="text-xs font-normal text-slate-500">faktur</span>
            </p>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3" /> Perlu disiapkan barang
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              {isSales ? 'Omzet Penjualan Saya' : 'Omzet Faktur Resmi'}
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> {countInvoice + countDelivering + countCompleted} transaksi faktur
            </span>
          </div>
        )}

        {!isGudang ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              {isSales ? 'Draft Penawaran Saya' : 'Draft Penawaran (SPH)'}
            </p>
            <p className="text-lg sm:text-xl font-bold text-amber-700 mt-1">
              {countPendingReview} <span className="text-xs font-normal text-slate-500">menunggu</span>
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {countApprovedOffer} disetujui admin
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Pesanan Selesai</p>
            <p className="text-lg sm:text-xl font-bold text-teal-700 mt-1">
              {countCompleted} <span className="text-xs font-normal text-slate-500">selesai</span>
            </p>
            <span className="text-[10px] text-teal-600 mt-1 block font-medium">
              Surat jalan tertandatangan
            </span>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Siap Kirim (Gudang)</p>
          <p className="text-lg sm:text-xl font-bold text-blue-700 mt-1">
            {countInvoice} <span className="text-xs font-normal text-slate-500">order</span>
          </p>
          <span className="text-[10px] text-blue-600 mt-1 block font-medium">
            Perlu disiapkan barang
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Dalam Pengiriman</p>
          <p className="text-lg sm:text-xl font-bold text-purple-700 mt-1">
            {countDelivering} <span className="text-xs font-normal text-slate-500">dalam kurir</span>
          </p>
          <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
            {countCompleted} telah tiba & selesai
          </span>
        </div>
      </div>

      {/* Sub-Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl transition-all shrink-0 ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Semua ({visibleSales.length})
        </button>

        {!isGudang && (
          <>
            <button
              onClick={() => setStatusFilter('OFFER_PENDING')}
              className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'OFFER_PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Draft Menunggu Review Admin</span>
              {countPendingReview > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'OFFER_PENDING' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {countPendingReview}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('OFFER_APPROVED')}
              className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'OFFER_APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Penawaran Disetujui (Kirim ke Pelanggan)</span>
              {countApprovedOffer > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'OFFER_APPROVED' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {countApprovedOffer}
                </span>
              )}
            </button>
          </>
        )}

        <button
          onClick={() => setStatusFilter('INVOICE')}
          className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            statusFilter === 'INVOICE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Faktur / Siap Disiapkan Gudang</span>
          {countInvoice > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'INVOICE' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
            }`}>
              {countInvoice}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('DELIVERING')}
          className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            statusFilter === 'DELIVERING'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Dalam Pengiriman</span>
          {countDelivering > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'DELIVERING' ? 'bg-white text-purple-700' : 'bg-purple-100 text-purple-800'
            }`}>
              {countDelivering}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
            statusFilter === 'COMPLETED'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Selesai & Diterima</span>
          {countCompleted > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'COMPLETED' ? 'bg-white text-teal-700' : 'bg-teal-100 text-teal-800'
            }`}>
              {countCompleted}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no penawaran, invoice, surat jalan, sales, atau pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          {(isAdminOrDev || isSales) && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Penawaran Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">Nomor / Tanggal</th>
                <th className="px-4 py-3.5">Sales PIC</th>
                <th className="px-4 py-3.5">Pelanggan</th>
                <th className="px-4 py-3.5">{isGudang ? 'Fisik Barang' : 'Total Nilai'}</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSales.map((sale) => {
                const isPendingReview = sale.status === 'OFFER_PENDING';
                const isOfferApproved = sale.status === 'OFFER_APPROVED';
                const isInvoice = sale.status === 'INVOICE';
                const isDelivering = sale.status === 'DELIVERING';
                const isCompleted = sale.status === 'COMPLETED';

                return (
                  <tr 
                    key={sale.id} 
                    onClick={() => setSelectedSaleDetail(sale)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    title="Klik baris untuk melihat rincian lengkap transaksi"
                  >
                    {/* Nomor / Tanggal */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {sale.offerNo || sale.invoiceNo}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(sale.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      {sale.invoiceNo && sale.invoiceNo.startsWith('INV-') && (
                        <div className="text-[10px] font-mono text-blue-600 font-semibold">
                          Faktur: {sale.invoiceNo}
                        </div>
                      )}
                      {sale.deliveryNo && (
                        <div className="text-[10px] font-mono text-purple-600 font-semibold">
                          SJ: {sale.deliveryNo}
                        </div>
                      )}
                    </td>

                    {/* Sales PIC */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">{sale.user?.name || 'Sales'}</span>
                      <span className="text-[10px] text-slate-400">{sale.user?.email || '-'}</span>
                    </td>

                    {/* Pelanggan */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{sale.customerName}</span>
                        {sale.contact && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-semibold">
                            Mitra
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Nilai */}
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {isGudang || sale.totalAmount === null ? (
                        <span className="text-slate-400 font-normal italic text-[11px]">
                          - (Akses Gudang)
                        </span>
                      ) : (
                        `Rp ${Number(sale.totalAmount).toLocaleString('id-ID')}`
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isPendingReview && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Menunggu Review Admin</span>
                        </span>
                      )}

                      {isOfferApproved && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
                          <FileCheck className="w-3 h-3" />
                          <span>Penawaran Disetujui</span>
                        </span>
                      )}

                      {isInvoice && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit">
                          <Truck className="w-3 h-3" />
                          <span>Faktur / Siap Gudang</span>
                        </span>
                      )}

                      {isDelivering && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-fit">
                          <Truck className="w-3 h-3 animate-bounce" />
                          <span>Dalam Pengiriman</span>
                        </span>
                      )}

                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Selesai & Diterima</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Aksi Admin: Review Penawaran */}
                      {isPendingReview && isAdminOrDev && (
                        <button
                          onClick={() => handleOpenReviewModal(sale)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Review Admin</span>
                        </button>
                      )}

                      {/* Aksi Penawaran Disetujui: Cetak SPH & Pelanggan Setuju */}
                      {isOfferApproved && (
                        <>
                          <button
                            onClick={() => handlePrintDocument(sale, 'OFFER')}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Cetak atau Unduh Dokumen Penawaran (PDF) untuk dikirim ke pelanggan"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak SPH</span>
                          </button>

                          {(isAdminOrDev || isSales) && (
                            <button
                              onClick={() => handleApproveToInvoice(sale)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1"
                              title="Pelanggan setuju -> Terbitkan Faktur & Teruskan ke Gudang"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Pelanggan Setuju</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Aksi Gudang & Sales: Siapkan & Kirim / Cetak Surat Jalan & Faktur */}
                      {(isInvoice || isDelivering || isCompleted) && (
                        <>
                          <button
                            onClick={() => handlePrintDocument(sale, 'DELIVERY')}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Cetak Surat Jalan / Dokumen Pengiriman untuk dibawa kurir & ditandatangani pelanggan"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Surat Jalan</span>
                          </button>

                          {/* Faktur hanya untuk Admin & Sales (disembunyikan dari Gudang agar harga jual tidak terlihat) */}
                          {!isGudang && (
                            <button
                              onClick={() => handlePrintDocument(sale, 'INVOICE')}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              title="Cetak Faktur Penjualan resmi"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Faktur</span>
                            </button>
                          )}

                          {(isGudang || isAdminOrDev) && (isInvoice || isDelivering) && (
                            <button
                              onClick={() => handleOpenShippingModal(sale)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>{isInvoice ? 'Kirim Barang' : 'Update Kirim'}</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Tombol Edit Transaksi (Admin & Developer Godmode) */}
                      {isAdminOrDev && (
                        <button
                          onClick={() => handleOpenEditSaleModal(sale)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Edit Informasi Transaksi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Tombol Hapus / Batalkan Transaksi (Admin & Developer Godmode) */}
                      {isAdminOrDev && (
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Hapus / Batalkan Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Tidak ada transaksi penjualan atau penawaran yang cocok.</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm">Memuat data...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM BUAT DRAFT PENAWARAN BARU OLEH SALES                        */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
                    DRAFT PENAWARAN
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Buat Penawaran Barang (Sales)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sales dapat memasukkan harga khusus di bawah harga aplikasi. Setelah disimpan, draft akan dikirim ke Admin untuk ditinjau.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOffer} className="space-y-4">
              {/* Data Pelanggan & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Pelanggan <span className="text-red-500">*</span>
                    </label>
                    {contactId && (
                      <button
                        type="button"
                        onClick={() => { setContactId(''); setCustomerName(''); setCustomerAddress(''); }}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        Ketik Manual
                      </button>
                    )}
                  </div>
                  <select
                    value={contactId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContactId(val);
                      const c = contacts.find((item) => item.id === val);
                      if (c) {
                        setCustomerName(c.name);
                        setCustomerAddress(c.address || '');
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden mb-1.5"
                  >
                    <option value="">-- Pilih dari Kontak Pelanggan (atau ketik manual) --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.npwp ? `[NPWP: ${c.npwp}]` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Nama Toko / Nama Pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Alamat Lengkap Pengiriman (Multi-line) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Contoh: Jl. Kaligawe Raya No. 45&#10;Kel. Bangetayu Wetan, Semarang"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-y"
                  ></textarea>
                </div>
              </div>

              {/* Lokasi Gudang & Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Rencana Pengambilan Gudang
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.code === 'JOMBLANG' ? '(Outlet Penjualan)' : '(Pusat Penyimpanan)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Rencana Syarat Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="CASH">Tunai (Cash on Delivery)</option>
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TEMPO">Kredit / Tempo 14-30 Hari</option>
                  </select>
                </div>
              </div>

              {/* Items Penawaran & Input Harga Khusus */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-600" /> Item Barang & Harga Penawaran
                  </label>
                  <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    💡 Anda bisa menginput harga khusus di bawah harga aplikasi
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const currentProd = products.find((p) => p.id === item.productId);
                    const baseUnit = currentProd?.unit || 'buah';
                    const basePrice = currentProd ? parseFloat(currentProd.price || 0) : 0;
                    const sQty = parseFloat(item.saleQty) || 0;
                    const ratio = parseFloat(item.itemsPerUnit) || 1;
                    const appStandardPrice = basePrice * ratio;
                    const offeredPrice = parseFloat(item.unitPrice) || 0;
                    const subtotal = sQty * offeredPrice;
                    const isDiscounted = offeredPrice < appStandardPrice && appStandardPrice > 0;
                    const discountPercent = isDiscounted ? Math.round(((appStandardPrice - offeredPrice) / appStandardPrice) * 100) : 0;

                    return (
                      <div key={index} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                          {/* Produk */}
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

                          {/* Satuan Jual */}
                          <div className="w-full sm:w-36">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Satuan Jual</label>
                            <select
                              value={item.unitType}
                              onChange={(e) => handleUnitTypeChange(index, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            >
                              <option value="base">{baseUnit.toUpperCase()} (Dasar)</option>
                              <option value="lusin">Lusin (12 {baseUnit})</option>
                              <option value="pack">Pack</option>
                              <option value="kodi">Kodi (20 {baseUnit})</option>
                              <option value="gross">Gross (144 {baseUnit})</option>
                              <option value="dus">Dus / Karton</option>
                              <option value="custom">Satuan Kustom...</option>
                            </select>
                          </div>

                          {/* Qty */}
                          <div className="w-full sm:w-20">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Qty</label>
                            <input
                              type="number"
                              required
                              step="any"
                              min="0.01"
                              value={item.saleQty}
                              onChange={(e) => handleQuantityChange(index, e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Harga Ditawarkan Sales (Input Langsung) */}
                          <div className="w-full sm:w-40">
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[10px] font-semibold text-slate-600 uppercase">
                                Harga Penawaran (Rp)
                              </label>
                            </div>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="Harga Sales"
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(index, e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                                isDiscounted 
                                  ? 'bg-amber-50 border border-amber-300 text-amber-900' 
                                  : 'bg-white border border-slate-200 text-slate-900'
                              }`}
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

                        {/* Banner Info Harga Sesuai Aplikasi vs Harga Penawaran */}
                        <div className="p-2 bg-white rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Harga Standar Aplikasi:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              Rp {appStandardPrice.toLocaleString('id-ID')} / {item.saleUnit}
                            </span>
                            {isDiscounted && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px] flex items-center gap-1">
                                <span>Diskon {discountPercent}%</span>
                                <span>(Hemat Rp {(appStandardPrice - offeredPrice).toLocaleString('id-ID')})</span>
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900">
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Tambahan untuk Admin</label>
                <input
                  type="text"
                  placeholder="Misal: Pelanggan meminta diskon khusus karena pembelian rutin skala besar."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-medium block">Total Nilai Penawaran Diajukan:</span>
                  <span className="text-xs text-amber-600">Draft akan dikirim ke Admin untuk ditinjau per item</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-amber-950">
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-xs flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Draft Penawaran ke Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVIEW ITEM-BY-ITEM OLEH ADMIN (DEVELOPER / ADMIN)               */}
      {/* ========================================================================= */}
      {reviewModalSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                    REVIEW PERSETUJUAN ADMIN
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Review Penawaran #{reviewModalSale.offerNo}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tinjau dan tentukan respon harga untuk setiap item barang yang diajukan oleh Sales.
                </p>
              </div>
              <button
                onClick={() => setReviewModalSale(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Informasi Header Penawaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs mb-4">
              <div className="space-y-1">
                <div>Sales Pembuat: <strong className="text-slate-900">{reviewModalSale.user?.name || 'Sales'}</strong> {reviewModalSale.user?.email && `(${reviewModalSale.user.email})`}</div>
                <div>Pelanggan: <strong className="text-slate-900">{reviewModalSale.customerName}</strong></div>
                {reviewModalSale.contact?.phone && <div>No. HP / WA: <strong>{reviewModalSale.contact.phone}</strong></div>}
                {reviewModalSale.contact?.npwp && <div>NPWP: <strong className="font-mono text-slate-800">{reviewModalSale.contact.npwp}</strong></div>}
              </div>
              <div className="space-y-1">
                <div>Alamat Pengiriman: <span className="text-slate-700">{reviewModalSale.customerAddress || reviewModalSale.contact?.address || '-'}</span></div>
                <div>Syarat Pembayaran: <strong className="text-slate-900">{reviewModalSale.paymentMethod}</strong></div>
                {reviewModalSale.notes && <div className="text-amber-800">Catatan Sales: <em>"{reviewModalSale.notes}"</em></div>}
              </div>
            </div>

            {/* Tabel Item dengan Pilihan Respon Admin per Item */}
            <div className="space-y-3 mb-5">
              <label className="text-xs font-bold text-slate-800 uppercase block">
                Item Barang & Respon Harga Admin:
              </label>

              {(reviewModalSale.items || []).map((item, idx) => {
                const dec = reviewItemDecisions[item.id] || { adminDecision: 'APPROVED', adminPrice: item.offeredPrice };
                const appPrice = parseFloat(item.appPrice || 0);
                const offeredPrice = parseFloat(item.offeredPrice || 0);
                const isUnderApp = offeredPrice < appPrice;

                let activePrice = offeredPrice;
                if (dec.adminDecision === 'USE_APP_PRICE') activePrice = appPrice;
                if (dec.adminDecision === 'CUSTOM_PRICE') activePrice = parseFloat(dec.adminPrice) || 0;
                const itemSubtotal = (parseFloat(item.saleQty) || 1) * activePrice;

                return (
                  <div key={item.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-bold text-sm text-slate-900">{idx + 1}. {item.product?.name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          Jumlah: <strong>{item.saleQty} {item.saleUnit}</strong> (×{item.itemsPerUnit} {item.product?.unit})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Subtotal Akhir Item:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          Rp {itemSubtotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Bandingkan Harga */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-500 block">Harga Sesuai Aplikasi:</span>
                        <span className="font-mono font-bold text-slate-800">
                          Rp {appPrice.toLocaleString('id-ID')} / {item.saleUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Harga Ditawarkan Sales:</span>
                        <span className={`font-mono font-bold ${isUnderApp ? 'text-amber-700' : 'text-slate-800'}`}>
                          Rp {offeredPrice.toLocaleString('id-ID')} / {item.saleUnit}
                          {isUnderApp && <span className="ml-1 text-[10px] text-amber-600 font-semibold">(di bawah aplikasi)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Pilihan Respon Admin */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">
                        Pilih Respon Admin untuk Item Ini:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Pilihan 1: Setuju harga sales */}
                        <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          dec.adminDecision === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name={`decision_${item.id}`}
                            checked={dec.adminDecision === 'APPROVED'}
                            onChange={() => handleDecisionChange(item.id, 'APPROVED')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="font-bold text-xs block text-emerald-800">✅ Setujui Harga Sales</span>
                            <span className="text-[11px] text-slate-500">
                              Gunakan Rp {offeredPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </label>

                        {/* Pilihan 2: Tolak, pakai harga aplikasi */}
                        <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          dec.adminDecision === 'USE_APP_PRICE'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name={`decision_${item.id}`}
                            checked={dec.adminDecision === 'USE_APP_PRICE'}
                            onChange={() => handleDecisionChange(item.id, 'USE_APP_PRICE')}
                            className="mt-0.5 text-blue-600"
                          />
                          <div>
                            <span className="font-bold text-xs block text-blue-800">❌ Pakai Harga Aplikasi</span>
                            <span className="text-[11px] text-slate-500">
                              Kembali Rp {appPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </label>

                        {/* Pilihan 3: Tolak, tentukan harga kustom baru */}
                        <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          dec.adminDecision === 'CUSTOM_PRICE'
                            ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name={`decision_${item.id}`}
                            checked={dec.adminDecision === 'CUSTOM_PRICE'}
                            onChange={() => handleDecisionChange(item.id, 'CUSTOM_PRICE')}
                            className="mt-0.5 text-purple-600"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-xs block text-purple-800">✏️ Input Harga Baru</span>
                            {dec.adminDecision === 'CUSTOM_PRICE' ? (
                              <div className="mt-1">
                                <input
                                  type="number"
                                  placeholder="Harga Baru"
                                  value={dec.adminPrice}
                                  onChange={(e) => handleCustomAdminPriceChange(item.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-purple-300 bg-white rounded font-bold text-purple-900 focus:outline-hidden"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Tentukan harga lain</span>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Catatan Keputusan Admin (Opsional):
              </label>
              <input
                type="text"
                placeholder="Misal: Disetujui dengan penyesuaian harga item 2 minimal order 5 dus."
                value={adminReviewNotes}
                onChange={(e) => setAdminReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Total Summary Setelah Review */}
            <div className="my-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-bold block">Total Penawaran yang Disetujui:</span>
                <span className="text-xs text-emerald-600">Dokumen penawaran resmi akan diterbitkan dengan total ini</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-emerald-950">
                  Rp {calculateReviewTotal().toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalSale(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={handleSubmitReview}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-xs flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>{submittingReview ? 'Menyimpan...' : 'Sahkan & Terbitkan Dokumen Penawaran'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GUDANG UPDATE STATUS PENGIRIMAN & KURIR                          */}
      {/* ========================================================================= */}
      {shippingModalSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Pengiriman Barang</h3>
                  <p className="text-xs text-slate-500">{shippingModalSale.deliveryNo || shippingModalSale.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => setShippingModalSale(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-left mb-5">
              <div>
                <span className="text-slate-500 block">Tujuan Pengiriman:</span>
                <strong className="text-slate-900">{shippingModalSale.customerName}</strong>
                <p className="text-slate-600 mt-0.5">{shippingModalSale.customerAddress || '-'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Driver / Kurir Pengantar:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Budi / Kurir Toko"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pengiriman / Plat Nomor Armada:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Mobil Pick Up B 1234 XY, barang lengkap 10 dus"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {shippingModalSale.status === 'INVOICE' && (
                <button
                  type="button"
                  disabled={submittingShipping}
                  onClick={() => handleUpdateShipping('DELIVERING')}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Kirim Sekarang (Bawa Surat Jalan)</span>
                </button>
              )}

              {shippingModalSale.status === 'DELIVERING' && (
                <button
                  type="button"
                  disabled={submittingShipping}
                  onClick={() => handleUpdateShipping('COMPLETED')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Barang Tiba & Surat Jalan Telah Ditandatangani</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShippingModalSale(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CETAK / DOWNLOAD DOKUMEN RESMI (SPH, FAKTUR, SURAT JALAN)        */}
      {/* ========================================================================= */}
      {printDocumentSale && printDocumentType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold font-mono">
                  {printDocumentType === 'OFFER' ? 'DOKUMEN PENAWARAN (SPH)' : printDocumentType === 'DELIVERY' ? 'SURAT JALAN PENGIRIMAN' : 'FAKTUR PENJUALAN'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerBrowserPrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => { setPrintDocumentSale(null); setPrintDocumentType(null); }}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* DOCUMENT PRINTABLE AREA */}
            <div ref={printAreaRef} className="text-slate-900 font-sans text-xs p-4 sm:p-8 bg-white max-w-2xl mx-auto">
              {/* Kop Surat Plastindo Twins */}
              <div className="flex items-start gap-4 mb-4">
                <img
                  src="/image_logo.png"
                  alt="Plastindo Twins"
                  className="h-16 w-auto object-contain shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="pt-0.5">
                  <h1 className="text-xl font-bold tracking-wide text-blue-900 leading-tight">PLASTINDO TWINS</h1>
                  <p className="text-xs text-slate-700 mt-0.5">Jomblang Sari IV No. 16 • Semarang, Jawa Tengah</p>
                  <p className="text-xs text-slate-700">Telp / WhatsApp: +62 856-4141-9168</p>
                </div>
              </div>

              {/* Judul Dokumen & Nomor */}
              <div className="text-center my-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide uppercase">
                  {printDocumentType === 'OFFER' 
                    ? 'SURAT PENAWARAN HARGA' 
                    : printDocumentType === 'DELIVERY' 
                    ? 'SURAT JALAN PENGIRIMAN' 
                    : 'FAKTUR PENJUALAN'}
                </h2>
                <p className="text-xs text-slate-800 font-medium mt-1">
                  No: {printDocumentType === 'OFFER' 
                    ? (printDocumentSale.offerNo || printDocumentSale.invoiceNo) 
                    : printDocumentType === 'DELIVERY' 
                    ? (printDocumentSale.deliveryNo || `SJ-${printDocumentSale.invoiceNo}`) 
                    : printDocumentSale.invoiceNo}
                </p>
                <p className="text-xs text-slate-800 font-medium">
                  Tanggal: {new Date(printDocumentSale.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Info Pelanggan & Intro */}
              <div className="text-xs text-slate-800 space-y-1 mb-5">
                <p className="text-slate-600">Kepada Yth:</p>
                <p className="font-bold text-slate-900 text-sm">{printDocumentSale.customerName}</p>
                {printDocumentSale.customerAddress && (
                  <p className="text-slate-700 whitespace-pre-line">{printDocumentSale.customerAddress}</p>
                )}
                {printDocumentSale.contact?.phone && (
                  <p className="text-slate-700">Telp / WA: {printDocumentSale.contact.phone}</p>
                )}
                {printDocumentSale.contact?.npwp && (
                  <p className="text-slate-700">NPWP: {printDocumentSale.contact.npwp}</p>
                )}
                <div className="pt-2">
                  <p>Sales: <span className="font-semibold text-slate-900">{printDocumentSale.user?.name || 'Sales'}</span></p>
                  {printDocumentType === 'DELIVERY' && printDocumentSale.deliveryDriver && (
                    <p>Kurir / Driver: <span className="font-semibold text-slate-900">{printDocumentSale.deliveryDriver}</span></p>
                  )}
                </div>
                {printDocumentType === 'OFFER' && (
                  <p className="pt-2 text-slate-700">Berikut daftar penawaran harga kami,</p>
                )}
              </div>

              {/* Tabel Rincian Barang */}
              <div className="mb-5 overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                      <th className="p-2 border border-slate-400 text-center w-10">NO</th>
                      <th className="p-2 border border-slate-400 text-center">Jenis Barang</th>
                      <th className="p-2 border border-slate-400 text-center w-16">Qty</th>
                      <th className="p-2 border border-slate-400 text-center w-20">Satuan</th>
                      {printDocumentType === 'DELIVERY' ? (
                        <>
                          <th className="p-2 border border-slate-400 text-center w-28">Isi Fisik</th>
                          <th className="p-2 border border-slate-400 text-center w-36">Keterangan</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 border border-slate-400 text-center w-28">Harga Satuan</th>
                          <th className="p-2 border border-slate-400 text-center w-32">Jumlah</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {docCalculations.itemsWithPrice.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-medium text-slate-900">
                          <div>{item.product?.name}</div>
                          {item.hasDiscount && printDocumentType !== 'DELIVERY' && (
                            <div className="text-[11px] text-blue-700 font-normal mt-0.5">
                              Harga Penawaran: Rp {item.offeredPrice.toLocaleString('id-ID')} / {item.saleUnit || item.product?.unit || 'buah'}
                              {item.discountPerUnit > 0 && (
                                <span className="text-slate-500 ml-1">
                                  (Hemat Rp {item.discountPerUnit.toLocaleString('id-ID')})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono">
                          {Number(item.saleQty)}
                        </td>
                        <td className="p-2 border border-slate-300 text-center">
                          {item.saleUnit || item.product?.unit || 'buah'}
                        </td>
                        {printDocumentType === 'DELIVERY' ? (
                          <>
                            <td className="p-2 border border-slate-300 text-center font-mono">
                              {item.quantity} {item.product?.unit || 'buah'}
                            </td>
                            <td className="p-2 border border-slate-300 text-slate-600 text-[11px] text-center">
                              Baik & Tersegel
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border border-slate-300 text-right font-mono">
                              Rp {Number(item.stdPrice).toLocaleString('id-ID')}
                            </td>
                            <td className="p-2 border border-slate-300 text-right font-mono font-semibold">
                              Rp {Number(item.stdSubtotal).toLocaleString('id-ID')}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {printDocumentType !== 'DELIVERY' && (
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="p-2 border border-slate-300 text-right font-medium">
                          Total Jumlah:
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-semibold">
                          Rp {Number(docCalculations.discountAmount > 0 ? docCalculations.totalStandardAmount : docCalculations.totalOfferedAmount).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-2 border border-slate-300 text-right font-medium">
                          Diskon
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono text-center">
                          {docCalculations.discountAmount > 0 
                            ? `Rp ${Number(docCalculations.discountAmount).toLocaleString('id-ID')}`
                            : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-2 border border-slate-300 text-right font-bold uppercase">
                          TOTAL
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-900">
                          Rp {Number(docCalculations.totalOfferedAmount).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="p-2.5 border border-slate-300 bg-white">
                          <div className="text-xs">
                            <span className="italic font-medium text-slate-800">Terbilang:</span>
                            <p className="text-center italic font-medium text-slate-800 my-1">
                              -- {terbilang(docCalculations.totalOfferedAmount)} rupiah --
                            </p>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Syarat & Catatan Pembayaran (Untuk Penawaran & Faktur) */}
              {printDocumentType !== 'DELIVERY' && (
                <div className="my-5 text-xs text-slate-800 space-y-1">
                  <p className="font-bold">Syarat & Ketentuan Pembayaran:</p>
                  <p>1. Pembayaran ditransfer ke rekening Plastindo Twins: <strong>BCA 123-456-7890 a.n. Plastindo Twins</strong>.</p>
                  <p>2. Bukti transfer mohon dikirimkan ke Sales kami untuk validasi pengiriman.</p>
                  <p>3. Penawaran harga ini berlaku selama 14 hari sejak tanggal dokumen diterbitkan.</p>
                </div>
              )}

              {/* Catatan Pengiriman Khusus Surat Jalan */}
              {printDocumentType === 'DELIVERY' && (
                <div className="my-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Perhatian Penerima:</p>
                  <p>Barang-barang tersebut di atas telah diterima dalam keadaan baik, lengkap, dan cukup sesuai pesanan. Harap ditandatangani dan dibubuhi nama jelas serta stempel perusahaan saat barang tiba.</p>
                </div>
              )}

              {/* Tanda Tangan */}
              {printDocumentType === 'OFFER' ? (
                <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 mb-6">
                  <div>
                    <p className="text-slate-800">Sales</p>
                    <div className="h-20"></div>
                    <p className="text-slate-900 font-medium">({printDocumentSale.user?.name || 'Sales'})</p>
                  </div>
                  <div>
                    <p className="text-slate-800">Konfirmasi Pelanggan:</p>
                    <div className="h-20"></div>
                    <p className="text-slate-900 font-medium">({printDocumentSale.customerName})</p>
                  </div>
                </div>
              ) : printDocumentType === 'DELIVERY' ? (
                <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 mb-6">
                  <div>
                    <p className="text-slate-600 mb-16">Disiapkan Oleh (Gudang):</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      Staff Gudang Plastindo
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-16">Diserahkan Oleh (Driver):</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      {printDocumentSale.deliveryDriver || '( ................................. )'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-16">Diterima Oleh (Pelanggan):</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      ({printDocumentSale.customerName})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 mb-6">
                  <div>
                    <p className="text-slate-600 mb-16">Sales PIC:</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      {printDocumentSale.user?.name || 'Sales Plastindo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-16">Disetujui Oleh (Admin):</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      {printDocumentSale.reviewedBy || 'Developer / Admin'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-16">Konfirmasi Pelanggan:</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block px-4">
                      ({printDocumentSale.customerName})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DETAIL RINCIAN PENJUALAN                                         */}
      {/* ========================================================================= */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Rincian Lengkap Penjualan</h3>
                <p className="text-xs font-mono text-emerald-600 font-semibold">{selectedSaleDetail.offerNo || selectedSaleDetail.invoiceNo}</p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1.5 mb-4 text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>Pelanggan: <strong className="text-slate-900">{selectedSaleDetail.customerName}</strong></div>
              {selectedSaleDetail.contact?.phone && <div>No. HP / WA: <strong className="text-emerald-700">{selectedSaleDetail.contact.phone}</strong></div>}
              {selectedSaleDetail.contact?.npwp && <div>NPWP: <strong className="font-mono text-slate-800">{selectedSaleDetail.contact.npwp}</strong></div>}
              <div>Alamat: <strong>{selectedSaleDetail.customerAddress || selectedSaleDetail.contact?.address || '-'}</strong></div>
              <div>Sales Pembuat: <strong>{selectedSaleDetail.user?.name || '-'}</strong></div>
              {selectedSaleDetail.reviewedBy && <div>Disetujui Admin: <strong>{selectedSaleDetail.reviewedBy}</strong> ({new Date(selectedSaleDetail.reviewedAt).toLocaleDateString('id-ID')})</div>}
              <div>Status Alur: <strong className="text-blue-800">{selectedSaleDetail.status}</strong></div>
              {selectedSaleDetail.deliveryNo && <div>No. Surat Jalan: <strong className="font-mono">{selectedSaleDetail.deliveryNo}</strong></div>}
              {selectedSaleDetail.deliveryDriver && <div>Kurir / Driver: <strong>{selectedSaleDetail.deliveryDriver}</strong></div>}
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
              {selectedSaleDetail.items.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{item.product?.name}</span>
                    {!isGudang && item.subtotal !== null && (
                      <span className="font-bold text-slate-900">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Qty: <strong className="text-slate-800">{Number(item.saleQty)} {item.saleUnit || item.product?.unit}</strong>
                      {!isGudang && item.unitPrice !== null && (
                        <> @ Rp {Number(item.unitPrice).toLocaleString('id-ID')}</>
                      )}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      -{item.quantity} {item.product?.unit || 'buah'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!isGudang && selectedSaleDetail.totalAmount !== null ? (
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span>Total Nilai Transaksi:</span>
                <span className="text-emerald-700 text-base">
                  Rp {Number(selectedSaleDetail.totalAmount).toLocaleString('id-ID')}
                </span>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 italic">
                <span>Dokumen Operasional:</span>
                <span className="font-semibold text-slate-700">Surat Jalan / Pengiriman Gudang</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT INFORMASI TRANSAKSI (ADMIN & DEVELOPER GODMODE)             */}
      {/* ========================================================================= */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Edit Data Transaksi</span>
                </h3>
                <p className="text-xs font-mono text-blue-600 font-semibold mt-0.5">
                  {editingSale.invoiceNo || editingSale.offerNo}
                </p>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              {/* Developer Godmode Status Override */}
              {user?.role === 'DEVELOPER' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-purple-700" />
                      <span>Godmode: Status Transaksi</span>
                    </span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                      Developer Override
                    </span>
                  </div>
                  <select
                    value={editSaleForm.status}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  >
                    <option value="OFFER_PENDING">OFFER_PENDING (Draft Penawaran - Belum Disetujui)</option>
                    <option value="OFFER_APPROVED">OFFER_APPROVED (Disetujui Admin - Siap Faktur)</option>
                    <option value="INVOICE">INVOICE (Faktur Diterbitkan - Menunggu Kirim)</option>
                    <option value="DELIVERING">DELIVERING (Sedang Dikirim Kurir)</option>
                    <option value="COMPLETED">COMPLETED (Selesai Diterima Pelanggan)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nama Pelanggan / Customer
                </label>
                <input
                  type="text"
                  required
                  value={editSaleForm.customerName}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Alamat Kirim / Lokasi Pelanggan
                </label>
                <textarea
                  rows="2"
                  value={editSaleForm.customerAddress}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, customerAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Alamat pengiriman lengkap..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={editSaleForm.paymentMethod}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="CASH">Tunai (Cash)</option>
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TEMPO">Kredit / Tempo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Nama Kurir / Driver
                  </label>
                  <input
                    type="text"
                    value={editSaleForm.deliveryDriver}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, deliveryDriver: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    placeholder="Contoh: Pak Budi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Catatan Transaksi / Sales Notes
                </label>
                <input
                  type="text"
                  value={editSaleForm.notes}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Catatan dari sales atau pelanggan..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Catatan Pengiriman / Ekspedisi
                </label>
                <input
                  type="text"
                  value={editSaleForm.deliveryNotes}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, deliveryNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="No resi, plat nomor, dll..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditSale}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEditSale && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
