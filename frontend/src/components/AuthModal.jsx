import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';
import { 
  X, 
  Mail, 
  User, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Send,
  ArrowLeft,
  Phone,
  RefreshCw
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // Modal flow state: 'LOGIN' | 'ONBOARDING' | 'PENDING_APPROVAL'
  const [modalState, setModalState] = useState('LOGIN');
  
  // Onboarding self-registration form (when Google account is not yet registered/approved)
  const [onboardingForm, setOnboardingForm] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    notes: '',
    avatarUrl: '',
    googleId: ''
  });

  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (modalState === 'LOGIN') {
        const cleanup = initializeGoogleGis();
        return () => {
          if (cleanup && typeof cleanup === 'function') cleanup();
        };
      }
    }
  }, [isOpen, modalState]);

  const initializeGoogleGis = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured');
      return;
    }

    const tryRender = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
          });
          setGisLoaded(true);
          return true;
        } catch (e) {
          console.error('Google GIS Init Error:', e);
        }
      }
      return false;
    };

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) {
          clearInterval(interval);
        }
      }, 250);
      const timer = setTimeout(() => clearInterval(interval), 6000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  };

  // Handler response Google Login
  const handleGoogleCredentialResponse = async (response) => {
    processGoogleLogin({ credential: response.credential });
  };

  const processGoogleLogin = async (payload) => {
    setError('');
    setLoading(true);
    try {
      const res = await authService.googleLogin(payload);
      
      // Kasus 1: Berhasil Login (Developer, Admin, atau Karyawan Disetujui)
      if (res.data.status === 'LOGGED_IN' && res.data.token) {
        localStorage.setItem('token', res.data.token);
        onAuthSuccess(res.data.user);
        onClose();
        return;
      }

      // Kasus 2: Akun Belum Terdaftar -> Masuk ke Form Onboarding Karyawan
      if (res.data.status === 'NEED_REGISTRATION') {
        const profile = res.data.profile || {};
        setOnboardingForm({
          email: profile.email || payload.email || '',
          name: profile.name || '',
          phone: '',
          address: '',
          notes: '',
          avatarUrl: profile.avatarUrl || '',
          googleId: profile.googleId || ''
        });
        setModalState('ONBOARDING');
        return;
      }

      // Kasus 3: Akun Sedang Menunggu Persetujuan
      if (res.data.status === 'PENDING') {
        setPendingEmail(res.data.contact?.email || payload.email || '');
        setPendingName(res.data.contact?.name || '');
        setModalState('PENDING_APPROVAL');
        return;
      }

      // Kasus 4: Ditolak
      if (res.data.status === 'REJECTED') {
        setError(res.data.message || 'Pendaftaran akun Anda ditolak oleh Developer / Administrator.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Gagal terhubung ke backend. Pastikan server backend sedang aktif.');
      } else {
        setError(err.response.data?.message || 'Login dengan Google gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Form Pendaftaran Karyawan Baru
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authService.registerEmployee(onboardingForm);
      setPendingEmail(onboardingForm.email);
      setPendingName(onboardingForm.name);
      setModalState('PENDING_APPROVAL');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim formulir pendaftaran karyawan.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* TAMPILAN 1: MODAL LOGIN GOOGLE SAJA                                       */}
        {/* ========================================================================= */}
        {modalState === 'LOGIN' && (
          <div className="py-2">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-center mx-auto mb-4 p-3">
                <svg className="w-10 h-10" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Masuk ke Plastindo Twins
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Silakan masuk menggunakan akun Google Anda untuk mengakses sistem.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-600 font-medium">Memverifikasi akun Google...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Google Official Button Container */}
                <div className="flex flex-col items-center justify-center p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                  <div ref={googleBtnRef} className="flex justify-center w-full min-h-[44px]"></div>
                  {!gisLoaded && (
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Memuat tombol Google Sign-In...</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-left flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Karyawan baru yang belum terdaftar otomatis akan diarahkan ke formulir pendaftaran untuk disetujui oleh Developer / Administrator.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAMPILAN 2: FORM ONBOARDING PENDAFTARAN KARYAWAN BARU                     */}
        {/* ========================================================================= */}
        {modalState === 'ONBOARDING' && (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Pendaftaran Karyawan Baru
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Akun Google Anda belum terdaftar di sistem. Lengkapi formulir di bawah ini untuk diverifikasi oleh Developer / Administrator.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="space-y-3 text-left">
              {/* Email Google (Read-only) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Email Akun Google (Terotentikasi)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    readOnly
                    value={onboardingForm.email}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Rizky"
                    value={onboardingForm.name}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Nomor HP / WA */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Nomor HP / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081234567890"
                    value={onboardingForm.phone}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Alamat Lengkap (Multi-line, NO PROVINSI) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Alamat Lengkap Domisili (Multi-line) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Contoh: Jl. Kaligawe Raya No. 45&#10;Kel. Bangetayu Wetan, Kec. Genuk, Kota Semarang"
                  value={onboardingForm.address}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-y"
                ></textarea>
              </div>

              {/* Catatan / Posisi Divisi */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Catatan / Posisi Divisi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Divisi Sales Lapangan / Staff Gudang Bangetayu"
                  value={onboardingForm.notes}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalState('LOGIN');
                    setError('');
                  }}
                  className="px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Mengirim...' : 'Kirim Formulir Pendaftaran'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAMPILAN 3: STATUS PENDING APPROVAL (SEDANG DIPROSES)                     */}
        {/* ========================================================================= */}
        {modalState === 'PENDING_APPROVAL' && (
          <div className="text-center py-3">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Pendaftaran Sedang Diproses
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
              Terima kasih <strong>{pendingName || 'Karyawan'}</strong>. Formulir pendaftaran akun Anda telah diterima oleh sistem dan sedang menunggu persetujuan (approval) serta penentuan hak akses (rule) oleh <strong>Developer / Administrator</strong>.
            </p>

            <div className="my-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Akun Google:</span>
                <span className="font-mono font-bold text-slate-800">{pendingEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status Akun:</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Menunggu Persetujuan
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pemberi Hak Akses:</span>
                <span className="font-semibold text-purple-700">Developer (Super Admin)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">
              Silakan hubungi Developer / Admin untuk mengonfirmasi persetujuan akun Anda. Setelah disetujui, Anda dapat langsung login kembali menggunakan akun Google ini.
            </p>

            <button
              type="button"
              onClick={() => {
                setModalState('LOGIN');
                setError('');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
