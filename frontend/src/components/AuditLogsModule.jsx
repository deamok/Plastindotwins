import React, { useState, useEffect } from 'react';
import { auditService } from '../services/api';
import { 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  User, 
  Layers, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  HardDrive
} from 'lucide-react';

export default function AuditLogsModule({ user, onOpenAuth }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Cleanup
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(180);
  const [cleaning, setCleaning] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 25,
        search: search.trim() || undefined,
        entity: entityFilter !== 'ALL' ? entityFilter : undefined,
        userRole: roleFilter !== 'ALL' ? roleFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await auditService.getAuditLogs(params);
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat log aktivitas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await auditService.getAuditStats();
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil statistik log:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchLogs();
    }
  }, [page, entityFilter, roleFilter, user?.role]);

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchStats();
    }
  }, [user?.role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilter = () => {
    setSearch('');
    setEntityFilter('ALL');
    setRoleFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleCleanupSubmit = async (e) => {
    e.preventDefault();
    try {
      setCleaning(true);
      setError('');
      const res = await auditService.cleanupAuditLogs(cleanupDays);
      setSuccessMsg(res.data.message || 'Log lama berhasil dibersihkan.');
      setIsCleanupOpen(false);
      fetchLogs();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membersihkan log lama.');
    } finally {
      setCleaning(false);
    }
  };

  // Badge Action styling
  const getActionBadge = (action) => {
    if (action.includes('CREATE')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          TAMBAH / BARU
        </span>
      );
    }
    if (action.includes('UPDATE') || action.includes('REVIEW')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          UBAH / EDIT
        </span>
      );
    }
    if (action.includes('STOCK') || action.includes('TRANSFER')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          MUTASI STOK
        </span>
      );
    }
    if (action.includes('DELETE') || action.includes('REJECT')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
          HAPUS / TOLAK
        </span>
      );
    }
    if (action.includes('LOGIN')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          LOGIN MASUK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {action}
      </span>
    );
  };

  const getEntityLabel = (entity) => {
    switch (entity) {
      case 'PRODUCT':
        return <span className="font-semibold text-blue-700">Stok Barang</span>;
      case 'SALE':
        return <span className="font-semibold text-emerald-700">Penjualan</span>;
      case 'PURCHASE':
        return <span className="font-semibold text-indigo-700">Purchasing</span>;
      case 'TRANSFER':
        return <span className="font-semibold text-amber-700">Mutasi Gudang</span>;
      case 'CONTACT':
        return <span className="font-semibold text-purple-700">Kontak</span>;
      case 'AUTH':
        return <span className="font-semibold text-slate-700">Autentikasi</span>;
      default:
        return <span>{entity}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!user || user.role !== 'DEVELOPER') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Halaman Log Aktivitas hanya dapat diakses oleh Developer. Silakan masuk menggunakan akun Developer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Notifikasi */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="font-bold text-red-800 hover:text-red-950">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold text-emerald-900 hover:text-emerald-950">×</button>
        </div>
      )}

      {/* Header & Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Aktivitas</span>
            <span className="text-2xl font-bold text-slate-900">
              {stats ? stats.totalLogs.toLocaleString('id-ID') : '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">7 Hari Terakhir</span>
            <span className="text-2xl font-bold text-slate-900">
              {stats ? stats.recentLogsCount.toLocaleString('id-ID') : '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Status Storage</span>
            <span className="text-sm font-bold text-purple-900 block mt-0.5">Sangat Ringan</span>
            <span className="text-[11px] text-slate-500 font-medium block">Hanya aksi CUD & Login</span>
          </div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari user, nama barang, nomor dokumen, atau rincian aksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 shadow-xs"
            >
              Cari
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { fetchLogs(); fetchStats(); }}
              disabled={loading}
              title="Segarkan Log"
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {user?.role === 'DEVELOPER' && (
              <button
                onClick={() => setIsCleanupOpen(true)}
                title="Pembersihan Otomatis Log Usang"
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Bersihkan Log Usang</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Modul / Entitas</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Semua Modul</option>
              <option value="PRODUCT">Stok & Produk</option>
              <option value="SALE">Penawaran & Penjualan</option>
              <option value="PURCHASE">Purchasing</option>
              <option value="TRANSFER">Mutasi Antar Gudang</option>
              <option value="CONTACT">Kontak & Karyawan</option>
              <option value="AUTH">Autentikasi (Login)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Peran / Role User</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Semua Role</option>
              <option value="DEVELOPER">Developer / Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="SALES">Sales</option>
              <option value="GUDANG">Gudang</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Reset Filter Button if active */}
        {(search || entityFilter !== 'ALL' || roleFilter !== 'ALL' || startDate || endDate) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Filter sedang aktif</span>
            <button
              onClick={handleResetFilter}
              className="text-red-600 hover:underline font-bold"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Log Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4 whitespace-nowrap">Waktu (WIB)</th>
                <th className="px-5 py-4 whitespace-nowrap">Pengguna / Pelaku</th>
                <th className="px-5 py-4 whitespace-nowrap">Aksi & Modul</th>
                <th className="px-5 py-4">Target / Dokumen</th>
                <th className="px-5 py-4 min-w-[280px]">Rincian Perubahan</th>
                <th className="px-5 py-4 whitespace-nowrap text-slate-400">IP Addr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Memuat riwayat aktivitas...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>Tidak ada catatan aktivitas yang sesuai dengan filter.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                          log.userRole === 'DEVELOPER' ? 'bg-purple-600' :
                          log.userRole === 'ADMIN' ? 'bg-blue-600' :
                          log.userRole === 'SALES' ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}>
                          {log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block text-xs">{log.userName || 'Sistem'}</span>
                          <span className="text-[10px] text-slate-500 font-medium block">{log.userRole || '-'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getActionBadge(log.action)}</div>
                        <div className="text-[11px] text-slate-500">{getEntityLabel(log.entity)}</div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 text-xs line-clamp-2">
                        {log.targetName || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <p className="line-clamp-3 leading-relaxed">{log.details || '-'}</p>
                    </td>

                    <td className="px-5 py-3.5 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      {log.ipAddress || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan total <b className="font-bold text-slate-800">{totalCount.toLocaleString('id-ID')}</b> aktivitas tercatat
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Bersihkan Log Usang */}
      {isCleanupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pembersihan Log Usang</h3>
                <p className="text-xs text-slate-500">Hapus catatan log lama untuk menghemat penyimpanan</p>
              </div>
            </div>

            <form onSubmit={handleCleanupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hapus catatan log yang berusia lebih dari:
                </label>
                <select
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value={90}>90 Hari (3 Bulan yang lalu)</option>
                  <option value={180}>180 Hari (6 Bulan yang lalu) - Disarankan</option>
                  <option value={365}>365 Hari (1 Tahun yang lalu)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  💡 Catatan log terbaru tidak akan terhapus. Hanya log yang berusia lebih lama dari rentang waktu di atas yang akan dibersihkan.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCleanupOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cleaning}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {cleaning ? 'Membersihkan...' : 'Mulai Bersihkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
