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
  FileText,
  UserCog,
  Shield,
  Briefcase,
  Warehouse,
  Crown,
  Clock,
  UserCheck2,
  XCircle,
  Laptop,
  Lock
} from 'lucide-react';

export default function ContactsModule({ user, onOpenAuth }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'CUSTOMER', 'SUPPLIER', 'EMPLOYEE'
  const [employeeSubFilter, setEmployeeSubFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED'
  const [copiedId, setCopiedId] = useState(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContactDetail, setSelectedContactDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Approval Modal State
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalRole, setApprovalRole] = useState('SALES');
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Form State (Propinsi DIHAPUS, Tipe Keduanya DIHAPUS)
  const [formData, setFormData] = useState({
    name: '',
    type: 'CUSTOMER', // 'CUSTOMER', 'SUPPLIER', 'EMPLOYEE'
    employeeRole: 'GUDANG', // 'ADMIN', 'SALES', 'GUDANG'
    phone: '',
    email: '',
    npwp: '',
    address: '',
    bankName: 'BCA',
    bankAccountNo: '',
    bankAccountHolder: '',
    notes: ''
  });

  const isSuperAdmin = user?.role === 'DEVELOPER';
  const isAdmin = user?.role === 'ADMIN';

  // "admin dan karyawan ybs yg bisa merubah data karyawan, karyawan lain tidak bisa"
  // Khusus akun Owner (cahyonosugeng83@gmail.com): hanya Owner sendiri atau Super Admin (Developer) yang dapat mengubah data
  const isOwnerContact = (c) => Boolean(c?.email && c.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');

  const canEditContact = (contact) => {
    if (!user) return false;
    if (isSuperAdmin) return true; // Godmode: Developer memiliki izin penuh mengedit seluruh data kontak & karyawan
    if (contact.type !== 'EMPLOYEE') return true;
    const isSelf = Boolean(
      (user.email && contact.email && user.email.toLowerCase().trim() === contact.email.toLowerCase().trim()) ||
      (user.contactId && user.contactId === contact.id)
    );
    if (isOwnerContact(contact)) {
      return isSelf;
    }
    if (isAdmin) return true;
    return isSelf;
  };

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
    
    let defaultType = 'CUSTOMER';
    if (activeFilter === 'SUPPLIER') defaultType = 'SUPPLIER';

    setEditingContact(null);
    setFormData({
      name: '',
      type: defaultType,
      employeeRole: 'GUDANG',
      phone: '',
      email: '',
      npwp: '',
      address: '',
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
      employeeRole: contact.employeeRole || 'GUDANG',
      status: contact.status || 'APPROVED',
      phone: contact.phone || '',
      email: contact.email || '',
      npwp: contact.npwp || '',
      address: contact.address || '',
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
      const isEditingEmployee = editingContact && editingContact.type === 'EMPLOYEE';

      const payload = { ...formData };
      if (isEditingEmployee) {
        if (!isSuperAdmin) {
          // Selain Super Admin (Developer), role dan email dikunci
          payload.employeeRole = editingContact.employeeRole;
          payload.email = editingContact.email;
        } else {
          // Super Admin (Developer) Godmode: bebas merubah role, email, dan status!
          payload.employeeRole = formData.employeeRole;
          payload.email = formData.email;
          if (formData.status) payload.status = formData.status;
        }
        payload.type = 'EMPLOYEE';
      }

      if (editingContact) {
        await contactService.updateContact(editingContact.id, payload);
        setSuccessMsg(`Data ${isEditingEmployee ? 'karyawan' : 'kontak'} "${formData.name}" berhasil diperbarui.`);
      } else {
        await contactService.createContact(payload);
        setSuccessMsg(`Kontak "${formData.name}" berhasil ditambahkan.`);
      }
      setIsFormModalOpen(false);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data kontak.');
    }
  };

  // Handler: Setujui Karyawan & Berikan Rule
  const handleApprove = async () => {
    if (!approvalTarget) return;
    try {
      setApprovalLoading(true);
      setError('');
      const res = await contactService.approveEmployee(approvalTarget.id, {
        employeeRole: approvalRole
      });
      setSuccessMsg(res.data?.message || `Karyawan "${approvalTarget.name}" berhasil disetujui.`);
      setApprovalTarget(null);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyetujui pendaftaran karyawan.');
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handler: Tolak Pendaftaran Karyawan
  const handleReject = async (contact) => {
    if (!window.confirm(`Yakin ingin menolak pendaftaran karyawan "${contact.name}"?`)) {
      return;
    }
    try {
      setError('');
      await contactService.rejectEmployee(contact.id);
      setSuccessMsg(`Pendaftaran karyawan "${contact.name}" telah ditolak.`);
      setApprovalTarget(null);
      fetchContacts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menolak pendaftaran karyawan.');
    }
  };

  const handleDelete = async (contact) => {
    if (!isSuperAdmin) {
      setError('Hanya Administrator / Developer yang memiliki akses menghapus data.');
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus data "${contact.name}"?`)) {
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

  // Filtered contacts based on search & sub-filter
  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    const isOwner = Boolean(c.email && c.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');
    const matchesSearch = 
      c.name.toLowerCase().includes(q) ||
      (isOwner && 'owner'.includes(q)) ||
      (c.employeeRole && c.employeeRole.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.npwp && c.npwp.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.bankName && c.bankName.toLowerCase().includes(q)) ||
      (c.bankAccountNo && c.bankAccountNo.toLowerCase().includes(q)) ||
      (c.bankAccountHolder && c.bankAccountHolder.toLowerCase().includes(q));

    if (activeFilter === 'EMPLOYEE') {
      if (!isSuperAdmin) {
        // Selain Super Admin, hanya tampilkan yang sudah Disetujui (Aktif)
        return matchesSearch && c.status === 'APPROVED';
      }
      if (employeeSubFilter === 'PENDING') return matchesSearch && c.status === 'PENDING';
      if (employeeSubFilter === 'APPROVED') return matchesSearch && c.status === 'APPROVED';
    }

    return matchesSearch;
  });

  // Calculate Metrics
  const totalContacts = contacts.length;
  const totalCustomers = contacts.filter((c) => c.type === 'CUSTOMER' || c.type === 'BOTH').length;
  const totalSuppliers = contacts.filter((c) => c.type === 'SUPPLIER' || c.type === 'BOTH').length;
  const totalEmployees = contacts.filter((c) => c.type === 'EMPLOYEE').length;
  const pendingEmployeesCount = contacts.filter((c) => c.type === 'EMPLOYEE' && c.status === 'PENDING').length;

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

      {/* Notice jika ada Karyawan Menunggu Approval */}
      {pendingEmployeesCount > 0 && isSuperAdmin && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Ada {pendingEmployeesCount} Pendaftaran Karyawan Baru Menunggu Persetujuan
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Karyawan telah mendaftar dengan akun Google mereka. Berikan hak akses (Admin, Sales, atau Gudang) agar mereka dapat masuk ke sistem.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveFilter('EMPLOYEE');
              setEmployeeSubFilter('PENDING');
            }}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Tinjau Pendaftar
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Mitra & Karyawan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalContacts} <span className="text-xs font-normal text-slate-500">kontak</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pelanggan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCustomers} <span className="text-xs font-normal text-slate-500">mitra</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pemasok / Pabrik</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalSuppliers} <span className="text-xs font-normal text-slate-500">supplier</span></p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Karyawan</p>
              {pendingEmployeesCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  {pendingEmployeesCount} pending
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalEmployees} <span className="text-xs font-normal text-slate-500">orang</span></p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <UserCog className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Main Filter Pills: Tab Keduanya DIHAPUS */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setActiveFilter('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeFilter === 'CUSTOMER' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pelanggan
            </button>
            <button
              onClick={() => setActiveFilter('SUPPLIER')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                activeFilter === 'SUPPLIER' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Supplier
            </button>
            <button
              onClick={() => setActiveFilter('EMPLOYEE')}
              className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'EMPLOYEE' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👥 Karyawan</span>
              {pendingEmployeesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          </div>

          {/* Sub-filter if Karyawan selected - HANYA DITAMPILKAN UNTUK SUPER ADMIN */}
          {activeFilter === 'EMPLOYEE' && isSuperAdmin && (
            <div className="flex bg-amber-50/80 border border-amber-200/80 p-0.5 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setEmployeeSubFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  employeeSubFilter === 'ALL' ? 'bg-white text-amber-900 shadow-2xs' : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Semua Karyawan
              </button>
              <button
                onClick={() => setEmployeeSubFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  employeeSubFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                <span>Menunggu Approval</span>
                {pendingEmployeesCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[10px] rounded-full">
                    {pendingEmployeesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setEmployeeSubFilter('APPROVED')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  employeeSubFilter === 'APPROVED' ? 'bg-white text-amber-900 shadow-2xs' : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Disetujui (Aktif)
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, role, no hp, email, alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
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
                <th className="px-6 py-4">Kontak & Alamat Domisili</th>
                <th className="px-6 py-4">Status / Role Akses</th>
                <th className="px-6 py-4 text-center">Aktivitas Transaksi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredContacts.map((contact) => {
                const isCustomer = contact.type === 'CUSTOMER';
                const isSupplier = contact.type === 'SUPPLIER';
                const isEmployee = contact.type === 'EMPLOYEE';
                const isPending = contact.status === 'PENDING';
                const isOwner = Boolean(contact.email && contact.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');

                return (
                  <tr key={contact.id} className={`transition-colors ${isPending ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'}`}>
                    {/* Name & Type */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{contact.name}</span>
                        {isPending && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-md animate-pulse">
                            Menunggu Approval
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        {isEmployee ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isPending
                              ? 'bg-amber-100/60 text-amber-800 border-amber-300'
                              : isOwner
                              ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold'
                              : contact.employeeRole === 'ADMIN'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : contact.employeeRole === 'SALES'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isPending 
                              ? '⏳ Calon Karyawan' 
                              : isOwner
                              ? '👑 Owner'
                              : contact.employeeRole === 'ADMIN' 
                              ? '👑 Karyawan - Admin' 
                              : contact.employeeRole === 'SALES' 
                              ? '💼 Karyawan - Sales' 
                              : '📦 Karyawan - Gudang'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isCustomer
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isCustomer ? 'Pelanggan' : 'Supplier Pabrik'}
                          </span>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{contact.notes}</p>
                      )}
                    </td>

                    {/* Contact & Address (Multi-line, NO PROPINSI) */}
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
                          <div className="flex items-center gap-1.5 text-slate-600">
                            {isEmployee ? (
                              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                              </svg>
                            ) : (
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="font-mono">{contact.email}</span>
                          </div>
                        )}

                        {contact.npwp && (
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold">NPWP</span>
                            <span>{contact.npwp}</span>
                          </div>
                        )}

                        {contact.address && (
                          <div className="flex items-start gap-1.5 text-slate-600 text-[11px] pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="whitespace-pre-line leading-tight">
                              {contact.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status & Role Section */}
                    <td className="px-6 py-4">
                      {isEmployee ? (
                        <div className="space-y-1.5">
                          {isPending ? (
                            <div>
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-300 inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Menunggu Approval
                              </span>
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovalTarget(contact);
                                    setApprovalRole('SALES');
                                  }}
                                  className="mt-1.5 block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                >
                                  ⚡ Setujui & Beri Rule
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <span className="text-[11px] text-slate-500">Rule:</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isOwner
                                    ? 'bg-purple-100 text-purple-900'
                                    : contact.employeeRole === 'ADMIN' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : contact.employeeRole === 'SALES' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {contact.employeeRole || 'GUDANG'}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-medium ml-auto flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disetujui
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {isOwner && '👑 Owner: Akses Penuh Seluruh Modul (Admin)'}
                                {!isOwner && contact.employeeRole === 'ADMIN' && '👑 Akses Penuh Semua Modul'}
                                {contact.employeeRole === 'SALES' && '💼 Penjualan & Pelanggan, Lihat Stok'}
                                {contact.employeeRole === 'GUDANG' && '📦 Mutasi Stok, Pembelian & Supplier'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : contact.bankAccountNo ? (
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
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada data bank</span>
                      )}
                    </td>

                    {/* Transaction Activity */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {isEmployee ? (
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          isPending
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isPending ? 'Menunggu Approval' : 'Akun Google Aktif'}
                        </span>
                      ) : (
                        <div className="inline-flex flex-col gap-1 text-xs">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-semibold border border-emerald-100">
                            {contact._count?.sales || 0} Penjualan
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-semibold border border-blue-100">
                            {contact._count?.purchases || 0} Pembelian
                          </span>
                        </div>
                      )}
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
                        {canEditContact(contact) && (
                          <button
                            onClick={() => handleOpenEditModal(contact)}
                            title="Ubah Kontak"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {isSuperAdmin && !isOwner && (
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

      {/* ========================================================================= */}
      {/* MODAL 1: SETUJUI & BERIKAN RULE KARYAWAN (APPROVAL MODAL)                 */}
      {/* ========================================================================= */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Setujui & Tentukan Rule Karyawan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih hak akses (role) untuk akun Google karyawan ini.
                </p>
              </div>
              <button
                onClick={() => setApprovalTarget(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Applicant Profile Information */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-4 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Lengkap</span>
                <span className="font-bold text-slate-900 text-sm">{approvalTarget.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Google</span>
                <span className="font-mono text-slate-700">{approvalTarget.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor HP / WhatsApp</span>
                <span className="font-semibold text-emerald-700">{approvalTarget.phone || '-'}</span>
              </div>
              {approvalTarget.address && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Alamat Domisili</span>
                  <p className="whitespace-pre-line text-slate-700">{approvalTarget.address}</p>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2 mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Pilih Hak Akses (Rule):
              </label>

              <button
                type="button"
                onClick={() => setApprovalRole('SALES')}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  approvalRole === 'SALES'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    Divisi Sales
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                    SALES
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akses modul Penjualan & Kontak Pelanggan. Memantau ketersediaan stok inventori.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setApprovalRole('GUDANG')}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  approvalRole === 'GUDANG'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4 text-amber-600" />
                    Divisi Gudang
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                    GUDANG
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akses mutasi stok & transfer antar gudang, penyesuaian stok, Pembelian & Supplier.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setApprovalRole('ADMIN')}
                className={`w-full p-3 rounded-2xl border text-left transition-all ${
                  approvalRole === 'ADMIN'
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-blue-600" />
                    Administrator Sistem
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akses penuh ke seluruh modul sistem (Inventori CRUD, Sales, Pembelian, Kontak).
                </p>
              </button>
            </div>

            {/* Approval Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={approvalLoading}
                onClick={() => handleReject(approvalTarget)}
                className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
              >
                Tolak Pendaftaran
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={approvalLoading}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approvalLoading ? 'Menyimpan...' : 'Setujui & Aktifkan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / EDIT KONTAK                                             */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            {editingContact && editingContact.type === 'EMPLOYEE' ? (
              /* ============================================================= */
              /* FORM KHUSUS: EDIT DATA KARYAWAN / OWNER                       */
              /* Role & Email Address DISABLE (Read-Only), field lainnya bisa  */
              /* dirubah (Nama, HP, Alamat multiline, Catatan, Bank)          */
              /* ============================================================= */
              (() => {
                const isEditingOwner = Boolean(formData.email && formData.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');
                return (
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                          {isEditingOwner ? <Crown className="w-5 h-5 text-purple-700" /> : <UserCog className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span>{isEditingOwner ? 'Edit Data Owner' : 'Edit Data Karyawan'}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isEditingOwner
                                ? 'bg-purple-100 text-purple-900 border-purple-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {isEditingOwner ? '👑 Owner' : 'Karyawan'}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            {isEditingOwner
                              ? 'Perbarui profil Owner. Hak akses (rule: Admin) dan email Google SSO bersifat tetap (read-only).'
                              : 'Perbarui profil karyawan. Hak akses (role) dan email Google SSO bersifat tetap (read-only).'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFormModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* 1. Role / Hak Akses */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                          <span className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <span>{isEditingOwner ? 'Hak Akses Sistem (Rule: Admin)' : 'Role / Hak Akses Karyawan'}</span>
                          </span>
                          {isSuperAdmin ? (
                            <span className="text-[11px] text-purple-700 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Crown className="w-3 h-3 text-purple-700" /> Godmode (Bisa Edit)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-400" /> Terkunci (Read-Only)
                            </span>
                          )}
                        </div>

                        {isSuperAdmin ? (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {[
                              { role: 'ADMIN', label: 'Admin', desc: 'Akses Penuh', icon: Crown, color: 'border-blue-500 bg-blue-50 text-blue-900' },
                              { role: 'SALES', label: 'Sales', desc: 'Penjualan', icon: Briefcase, color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                              { role: 'GUDANG', label: 'Gudang', desc: 'Inventori & Kirim', icon: Warehouse, color: 'border-amber-500 bg-amber-50 text-amber-900' }
                            ].map((r) => {
                              const Icon = r.icon;
                              const isSelected = formData.employeeRole === r.role;
                              return (
                                <button
                                  key={r.role}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, employeeRole: r.role })}
                                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                    isSelected
                                      ? `${r.color} ring-2 ring-purple-500 font-bold shadow-xs`
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Icon className="w-4 h-4" />
                                    {isSelected && <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold">Aktif</span>}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold leading-tight">{r.label}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{r.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                                isEditingOwner
                                  ? 'bg-purple-100 text-purple-900'
                                  : formData.employeeRole === 'ADMIN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : formData.employeeRole === 'SALES'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isEditingOwner ? (
                                  <>
                                    <Crown className="w-3.5 h-3.5 text-purple-700" />
                                    <span>Owner (Rule: Admin)</span>
                                  </>
                                ) : (
                                  <>
                                    {formData.employeeRole === 'ADMIN' && <Crown className="w-3.5 h-3.5" />}
                                    {formData.employeeRole === 'SALES' && <Briefcase className="w-3.5 h-3.5" />}
                                    {formData.employeeRole === 'GUDANG' && <Warehouse className="w-3.5 h-3.5" />}
                                    <span>
                                      {formData.employeeRole === 'ADMIN' ? 'Administrator' : formData.employeeRole === 'SALES' ? 'Sales' : 'Gudang'}
                                    </span>
                                  </>
                                )}
                              </span>
                              <span className="text-xs text-slate-500">
                                {isEditingOwner
                                  ? 'Akses penuh seluruh modul aplikasi sebagai Owner'
                                  : formData.employeeRole === 'ADMIN' 
                                  ? 'Akses penuh seluruh modul aplikasi' 
                                  : formData.employeeRole === 'SALES' 
                                  ? 'Modul Penjualan, penawaran harga & data pelanggan' 
                                  : 'Modul Gudang, mutasi stok & penerimaan barang'}
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400 italic">
                          {isSuperAdmin
                            ? '👑 Godmode Aktif: Anda memiliki hak akses Developer untuk mengubah role karyawan kapan saja.'
                            : isEditingOwner
                            ? '* Akun Owner memiliki hak akses administrator penuh ke seluruh modul sistem.'
                            : '* Perubahan role hak akses karyawan hanya dapat dilakukan langsung oleh Super Admin (Developer).'}
                        </p>
                      </div>

                  {/* Status Karyawan khusus Super Admin (Godmode) */}
                  {isSuperAdmin && (
                    <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-900 uppercase">
                        <span className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-purple-600" />
                          <span>Status Akun Karyawan (Godmode)</span>
                        </span>
                        <span className="text-[11px] text-purple-700 font-semibold">Editable</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'APPROVED', label: 'Disetujui', color: 'bg-emerald-600 border-emerald-600 text-white' },
                          { id: 'PENDING', label: 'Menunggu', color: 'bg-amber-600 border-amber-600 text-white' },
                          { id: 'REJECTED', label: 'Ditolak', color: 'bg-red-600 border-red-600 text-white' }
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: st.id })}
                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                              formData.status === st.id
                                ? `${st.color} shadow-xs ring-2 ring-purple-400`
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Email Akun Google */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email Akun Google {isSuperAdmin ? '(Godmode Editable)' : '(Terkunci)'}</span>
                      </span>
                      {isSuperAdmin ? (
                        <span className="text-[11px] font-normal text-purple-600 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-purple-600" /> Super Admin Edit
                        </span>
                      ) : (
                        <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> SSO Read-Only
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled={!isSuperAdmin}
                        value={formData.email}
                        onChange={(e) => isSuperAdmin && setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2 pl-9 rounded-xl text-sm font-medium ${
                          isSuperAdmin
                            ? 'bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden'
                            : 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed select-none'
                        }`}
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isSuperAdmin
                        ? 'Sebagai Developer (Godmode), Anda dapat mengoreksi email Google SSO karyawan.'
                        : 'Email SSO Google yang terhubung saat login akun dan tidak dapat diubah di form ini.'}
                    </p>
                  </div>

                  {/* 3. Nama Lengkap & No HP: EDITABLE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        {isEditingOwner ? 'Nama Lengkap Owner' : 'Nama Lengkap Karyawan'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isEditingOwner ? 'Contoh: Sugeng Cahyono' : 'Contoh: Ahmad Rizky'}
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

                  {/* 4. Alamat Domisili Karyawan: EDITABLE (Multi-line, tanpa propinsi) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      {isEditingOwner ? 'Alamat Domisili Owner (Multi-line)' : 'Alamat Domisili Karyawan (Multi-line)'}
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Contoh: Perumahan Indah Asri Blok B2 No. 10&#10;Kel. Bangetayu Wetan, Kec. Genuk, Kota Semarang"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-y"
                    ></textarea>
                  </div>

                  {/* 5. Catatan / Divisi: EDITABLE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catatan Kepegawaian / Divisi</label>
                    <textarea
                      rows="2"
                      placeholder="Posisi jabatan divisi, tanggal mulai bekerja, kontak darurat, dll."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    ></textarea>
                  </div>

                  {/* 6. Informasi Rekening Bank: EDITABLE */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>Informasi Rekening Bank (Payroll / Gaji)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Atas Nama Pemilik</label>
                        <input
                          type="text"
                          placeholder="Sesuai buku tabungan"
                          value={formData.bankAccountHolder}
                          onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. Action Buttons */}
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
                      className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEditingOwner ? 'Simpan Perubahan Data Owner' : 'Simpan Perubahan Karyawan'}</span>
                    </button>
                  </div>
                </form>
              </div>
            );
          })()
            ) : (
              /* ============================================================= */
              /* FORM UMUM: TAMBAH KONTAK BARU / EDIT PELANGGAN & SUPPLIER     */
              /* Hanya menampilkan tab Pelanggan dan Supplier                  */
              /* ============================================================= */
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingContact ? 'Edit Data Kontak' : 'Tambah Kontak Baru'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Data kontak untuk transaksi Pelanggan atau Supplier.
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
                  {/* Type Selection: HANYA PELANGGAN DAN SUPPLIER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tipe Kontak</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'CUSTOMER' })}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                          formData.type === 'CUSTOMER'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pelanggan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'SUPPLIER' })}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                          formData.type === 'SUPPLIER'
                            ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span>Supplier</span>
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
                        placeholder="Contoh: PT Sumber Plastik"
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

                  {/* Email & NPWP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Email</label>
                      <input
                        type="email"
                        placeholder="mitra@plastik.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">NPWP (Nomor Pokok Wajib Pajak)</label>
                      <input
                        type="text"
                        placeholder="Contoh: 01.234.567.8-901.000"
                        value={formData.npwp}
                        onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Alamat Multiline */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Kantor / Toko</label>
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
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETAIL KONTAK                                                    */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedContactDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">{selectedContactDetail.name}</h3>
                <div className="mt-1">
                  {selectedContactDetail.type === 'EMPLOYEE' ? (() => {
                    const isDetailOwner = Boolean(selectedContactDetail.email && selectedContactDetail.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        selectedContactDetail.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : isDetailOwner
                          ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold'
                          : selectedContactDetail.employeeRole === 'ADMIN'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : selectedContactDetail.employeeRole === 'SALES'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {selectedContactDetail.status === 'PENDING' 
                          ? '⏳ Menunggu Approval' 
                          : isDetailOwner
                          ? '👑 Owner'
                          : selectedContactDetail.employeeRole === 'ADMIN' 
                          ? '👑 Karyawan - Admin' 
                          : selectedContactDetail.employeeRole === 'SALES' 
                          ? '💼 Karyawan - Sales' 
                          : '📦 Karyawan - Gudang'}
                      </span>
                    );
                  })() : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedContactDetail.type === 'CUSTOMER'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {selectedContactDetail.type === 'CUSTOMER' ? 'Pelanggan' : 'Supplier Pabrik'}
                    </span>
                  )}
                </div>
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
                  <span className="text-slate-500">{selectedContactDetail.type === 'EMPLOYEE' ? 'Email Akun Google:' : 'Email:'}</span>
                  <span className="font-mono font-medium text-slate-800">{selectedContactDetail.email}</span>
                </div>
              )}

              {selectedContactDetail.npwp && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">NPWP:</span>
                  <div className="flex items-center gap-1.5 font-mono font-medium text-slate-800">
                    <span>{selectedContactDetail.npwp}</span>
                    <button
                      onClick={() => handleCopy(selectedContactDetail.npwp, 'detail-npwp')}
                      className="p-1 hover:bg-slate-200 rounded text-xs transition-colors text-slate-500 hover:text-slate-700"
                      title="Salin NPWP"
                    >
                      {copiedId === 'detail-npwp' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {selectedContactDetail.address && (
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-500 block text-[11px]">Alamat Domisili:</span>
                  <p className="font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedContactDetail.address}
                  </p>
                </div>
              )}

              {selectedContactDetail.notes && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <span className="text-amber-800 font-semibold block mb-0.5">Catatan:</span>
                  <span className="text-amber-900">{selectedContactDetail.notes}</span>
                </div>
              )}
            </div>

            {/* Bank Card (If available) */}
            {selectedContactDetail.bankAccountNo && (
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
            )}

            {/* Role Permissions Card for Employee / Owner */}
            {selectedContactDetail.type === 'EMPLOYEE' && (() => {
              const isDetailOwner = Boolean(selectedContactDetail.email && selectedContactDetail.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');
              return (
                <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl mb-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Hak Akses Sistem</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                      {selectedContactDetail.status === 'PENDING' 
                        ? 'PENDING' 
                        : isDetailOwner 
                        ? 'OWNER (ADMIN)' 
                        : selectedContactDetail.employeeRole || 'GUDANG'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 mt-2">
                    {selectedContactDetail.status === 'PENDING' ? (
                      <p className="text-amber-300">⏳ Akun ini masih berstatus <strong>Menunggu Persetujuan</strong> dari Developer / Administrator.</p>
                    ) : isDetailOwner ? (
                      <p>👑 <strong>Owner (Rule Admin):</strong> Pemilik dengan hak akses penuh ke seluruh modul sistem (Inventori CRUD, Mutasi Stok, Penjualan, Pembelian, Kontak).</p>
                    ) : selectedContactDetail.employeeRole === 'ADMIN' ? (
                      <p>👑 <strong>Administrator:</strong> Akses penuh ke seluruh modul (Inventori CRUD, Mutasi Stok, Penjualan, Pembelian, Kontak).</p>
                    ) : selectedContactDetail.employeeRole === 'SALES' ? (
                      <p>💼 <strong>Sales:</strong> Akses modul Penjualan & Kontak Pelanggan. Memantau ketersediaan stok fisik.</p>
                    ) : (
                      <p>📦 <strong>Gudang:</strong> Akses mutasi fisik & transfer antar gudang, penyesuaian stok, modul Pembelian, dan Kontak Supplier.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
