import React, { useState, useEffect } from 'react';
import { contactService } from '../services/api';
import { 
  Users, 
  UserCheck, 
  Truck, 
  PlusCircle, 
  Search, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Building2,
  Copy,
  ExternalLink,
  ShoppingBag,
  FileText
} from 'lucide-react';

const PROVINSI_LIST = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Banten',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
];

export default function ContactsModule({ user, onOpenAuth }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'CUSTOMER', 'SUPPLIER'
  const [copiedId, setCopiedId] = useState(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContactDetail, setSelectedContactDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'CUSTOMER',
    phone: '',
    email: '',
    address: '',
    province: '',
    bankName: 'BCA',
    bankAccountNo: '',
    bankAccountHolder: '',
    notes: ''
  });

  useEffect(() => {
    fetchContacts();
  }, [activeFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (activeFilter !== 'ALL') {
        params.type = activeFilter;
      }
      const res = await contactService.getContacts(params);
      setContacts(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat daftar kontak.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setEditingContact(null);
    setFormData({
      name: '',
      type: activeFilter === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
      phone: '',
      email: '',
      address: '',
      province: '',
      bankName: 'BCA',
      bankAccountNo: '',
      bankAccountHolder: '',
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (contact) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      type: contact.type || 'CUSTOMER',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      province: contact.province || '',
      bankName: contact.bankName || 'BCA',
      bankAccountNo: contact.bankAccountNo || '',
      bankAccountHolder: contact.bankAccountHolder || '',
      notes: contact.notes || ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = async (contact) => {
    setSelectedContactDetail(contact);
    setIsDetailModalOpen(true);
    try {
      setDetailLoading(true);
      const res = await contactService.getContactById(contact.id);
      setSelectedContactDetail(res.data.data);
    } catch (err) {
      console.error('Gagal mengambil detail kontak:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (editingContact) {
        await contactService.updateContact(editingContact.id, formData);
        setSuccessMsg(`Kontak "${formData.name}" berhasil diperbarui.`);
      } else {
        await contactService.createContact(formData);
        setSuccessMsg(`Kontak "${formData.name}" berhasil ditambahkan.`);
      }
      setIsFormModalOpen(false);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data kontak.');
    }
  };

  const handleDelete = async (contact) => {
    if (!user || user.role !== 'ADMIN') {
      setError('Hanya Administrator yang memiliki akses menghapus data kontak.');
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus kontak "${contact.name}"?`)) {
      return;
    }
    try {
      setError('');
      await contactService.deleteContact(contact.id);
      setSuccessMsg(`Kontak "${contact.name}" berhasil dihapus.`);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus kontak.');
    }
  };

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered contacts based on search input
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.province && c.province.toLowerCase().includes(q)) ||
      (c.bankName && c.bankName.toLowerCase().includes(q)) ||
      (c.bankAccountNo && c.bankAccountNo.toLowerCase().includes(q)) ||
      (c.bankAccountHolder && c.bankAccountHolder.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalContacts = contacts.length;
  const totalCustomers = contacts.filter((c) => c.type === 'CUSTOMER' || c.type === 'BOTH').length;
  const totalSuppliers = contacts.filter((c) => c.type === 'SUPPLIER' || c.type === 'BOTH').length;

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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Mitra Terdaftar</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalContacts} <span className="text-sm font-normal text-slate-500">kontak</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Pelanggan (Customer)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCustomers} <span className="text-sm font-normal text-slate-500">mitra</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Pemasok (Supplier Pabrik)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalSuppliers} <span className="text-sm font-normal text-slate-500">mitra</span></p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setActiveFilter('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'CUSTOMER' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pelanggan
            </button>
            <button
              onClick={() => setActiveFilter('SUPPLIER')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'SUPPLIER' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Supplier
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, no hp, rekening bank, alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchContacts}
            disabled={loading}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Kontak Baru</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Nama & Kategori</th>
                <th className="px-6 py-4">Kontak & Alamat</th>
                <th className="px-6 py-4">Rekening Bank</th>
                <th className="px-6 py-4 text-center">Aktivitas Transaksi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredContacts.map((contact) => {
                const isCustomer = contact.type === 'CUSTOMER';
                const isSupplier = contact.type === 'SUPPLIER';
                const isBoth = contact.type === 'BOTH';

                return (
                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Type */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{contact.name}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isCustomer
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isSupplier
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {isCustomer ? 'Pelanggan' : isSupplier ? 'Supplier' : 'Pelanggan & Supplier'}
                        </span>
                      </div>
                      {contact.notes && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{contact.notes}</p>
                      )}
                    </td>

                    {/* Contact & Address */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {contact.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-emerald-600 transition-colors"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}

                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{contact.email}</span>
                          </div>
                        )}

                        {(contact.address || contact.province) && (
                          <div className="flex items-start gap-1.5 text-slate-500 text-[11px] pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              {contact.address && (
                                <p className="whitespace-pre-line text-slate-700 leading-tight">
                                  {contact.address}
                                </p>
                              )}
                              {contact.province && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                                  {contact.province}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Bank Account Info */}
                    <td className="px-6 py-4">
                      {contact.bankAccountNo ? (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                              {contact.bankName || 'BANK'}
                            </span>
                            <button
                              onClick={() => handleCopy(contact.bankAccountNo, contact.id)}
                              title="Salin No Rekening"
                              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors flex items-center gap-1 text-[11px]"
                            >
                              {copiedId === contact.id ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Tersalin
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5">
                                  <Copy className="w-3 h-3" /> Salin
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="font-mono font-semibold text-slate-900 tracking-wide text-xs">
                            {contact.bankAccountNo}
                          </div>
                          {contact.bankAccountHolder && (
                            <div className="text-[11px] text-slate-500">
                              a.n. <strong className="text-slate-700">{contact.bankAccountHolder}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada data bank</span>
                      )}
                    </td>

                    {/* Transaction Activity Counts */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col gap-1 text-xs">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-semibold border border-emerald-100">
                          {contact._count?.sales || 0} Penjualan
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-semibold border border-blue-100">
                          {contact._count?.purchases || 0} Pembelian
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(contact)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(contact)}
                          title="Ubah Kontak"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(contact)}
                            title="Hapus Kontak"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredContacts.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Tidak ada data kontak ditemukan.</p>
                    <p className="text-xs text-slate-400 mt-1">Gunakan tombol "Tambah Kontak Baru" untuk mendaftarkan mitra.</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-sm">Memuat daftar kontak...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Kontak */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingContact ? 'Edit Data Kontak Mitra' : 'Tambah Kontak Mitra Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Data kontak dapat digunakan pada modul transaksi Pembelian dan Penjualan.
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tipe Mitra</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'CUSTOMER' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.type === 'CUSTOMER'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pelanggan (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SUPPLIER' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.type === 'SUPPLIER'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Supplier (Pemasok)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'BOTH' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      formData.type === 'BOTH'
                        ? 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Keduanya (Both)
                  </button>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nama Kontak / Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko Maju Plastik / PT Sumber Plastik"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Email & Propinsi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Email</label>
                  <input
                    type="email"
                    placeholder="Contoh: mitra@plastik.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Propinsi</label>
                  <input
                    type="text"
                    list="province-options"
                    placeholder="Pilih atau ketik propinsi (misal: Jawa Tengah)..."
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <datalist id="province-options">
                    {PROVINSI_LIST.map((prov) => (
                      <option key={prov} value={prov} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Alamat dibuat Multiline */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Alamat Kantor / Toko
                </label>
                <textarea
                  rows="3"
                  placeholder="Contoh: Jl. Kaligawe Raya No. 45&#10;Kec. Genuk, Kota Semarang"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-y"
                ></textarea>
              </div>

              {/* Bank Account Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Informasi Rekening Bank Pembayaran</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Nama Bank</label>
                    <input
                      type="text"
                      placeholder="BCA / Mandiri / BRI / BNI"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      placeholder="Contoh: 8830123456"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Atas Nama (Pemilik)</label>
                    <input
                      type="text"
                      placeholder="Nama di buku tabungan"
                      value={formData.bankAccountHolder}
                      onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Tambahan</label>
                <textarea
                  rows="2"
                  placeholder="Catatan termin pembayaran tempo, PIC toko, dll."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {editingContact ? 'Simpan Perubahan' : 'Tambahkan Kontak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Kontak & Riwayat Transaksi */}
      {isDetailModalOpen && selectedContactDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">{selectedContactDetail.name}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 ${
                  selectedContactDetail.type === 'CUSTOMER'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedContactDetail.type === 'SUPPLIER'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {selectedContactDetail.type === 'CUSTOMER' ? 'Pelanggan' : selectedContactDetail.type === 'SUPPLIER' ? 'Supplier Pabrik' : 'Pelanggan & Supplier'}
                </span>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Contact Details */}
            <div className="space-y-2.5 text-xs text-slate-600 mb-4">
              {selectedContactDetail.phone && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">Telepon / WhatsApp:</span>
                  <a
                    href={`https://wa.me/${selectedContactDetail.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedContactDetail.phone}
                  </a>
                </div>
              )}

              {selectedContactDetail.email && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{selectedContactDetail.email}</span>
                </div>
              )}

              {(selectedContactDetail.address || selectedContactDetail.province) && (
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-500 block text-[11px]">Alamat Lengkap:</span>
                  {selectedContactDetail.address && (
                    <p className="font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                      {selectedContactDetail.address}
                    </p>
                  )}
                  {selectedContactDetail.province && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1.5 border-t border-slate-200/70 mt-1.5">
                      <span className="text-slate-400">Propinsi:</span>
                      <strong className="text-indigo-900 font-semibold">{selectedContactDetail.province}</strong>
                    </div>
                  )}
                </div>
              )}

              {selectedContactDetail.notes && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <span className="text-amber-800 font-semibold block mb-0.5">Catatan:</span>
                  <span className="text-amber-900">{selectedContactDetail.notes}</span>
                </div>
              )}
            </div>

            {/* Bank Card */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl mb-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Rekening Bank</span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                  {selectedContactDetail.bankName || 'BANK'}
                </span>
              </div>
              <div className="text-lg font-mono font-bold tracking-widest my-1 flex items-center justify-between">
                <span>{selectedContactDetail.bankAccountNo || '-'}</span>
                {selectedContactDetail.bankAccountNo && (
                  <button
                    onClick={() => handleCopy(selectedContactDetail.bankAccountNo, 'detail')}
                    className="p-1 hover:bg-white/20 rounded text-xs transition-colors"
                    title="Salin"
                  >
                    {copiedId === 'detail' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="text-xs text-indigo-300 mt-2">
                Atas Nama:{' '}
                <strong className="text-white">{selectedContactDetail.bankAccountHolder || selectedContactDetail.name}</strong>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Riwayat Transaksi Terakhir</h4>
              
              {detailLoading ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                  Memuat riwayat transaksi...
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* Sales */}
                  {selectedContactDetail.sales && selectedContactDetail.sales.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-700 block mb-1">Penjualan:</span>
                      {selectedContactDetail.sales.map((s) => (
                        <div key={s.id} className="p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs flex justify-between items-center mb-1">
                          <span className="font-mono font-semibold text-slate-800">{s.invoiceNo}</span>
                          <span className="font-bold text-emerald-800">Rp {Number(s.totalAmount).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Purchases */}
                  {selectedContactDetail.purchases && selectedContactDetail.purchases.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-blue-700 block mb-1">Pembelian (PO):</span>
                      {selectedContactDetail.purchases.map((p) => (
                        <div key={p.id} className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-xs flex justify-between items-center mb-1">
                          <span className="font-mono font-semibold text-slate-800">{p.purchaseNo}</span>
                          <span className="font-bold text-blue-800">Rp {Number(p.totalAmount).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!selectedContactDetail.sales || selectedContactDetail.sales.length === 0) &&
                   (!selectedContactDetail.purchases || selectedContactDetail.purchases.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-2 text-center">Belum ada catatan transaksi terkait kontak ini.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
