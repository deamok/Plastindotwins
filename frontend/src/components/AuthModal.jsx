import React, { useState } from 'react';
import { authService } from '../services/api';
import { LogIn, UserPlus, X, Lock, Mail, User, ShieldCheck } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await authService.register(formData);
      } else {
        res = await authService.login({
          email: formData.email,
          password: formData.password
        });
      }

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      if (!err.response) {
        setError('Gagal terhubung ke backend (Network Error). Pastikan server backend sedang aktif.');
      } else {
        setError(err.response.data?.message || 'Gagal melakukan autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      if (!err.response) {
        setError('Gagal terhubung ke backend (Network Error). Pastikan server backend sedang aktif.');
      } else {
        setError(err.response.data?.message || 'Gagal login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            {isRegister ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Sistem'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister ? 'Buat akun untuk mengelola stok Plastindo' : 'Pilih akun demo atau masukkan email Anda'}
          </p>
        </div>

        {/* Quick Login Helper */}
        {!isRegister && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-600 block mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Demo Akun Cepat:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@plastindo.com', 'admin123')}
                disabled={loading}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200 text-left"
              >
                👑 Login Admin
                <span className="block text-[10px] text-blue-500 font-normal">Akses Penuh CRUD</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('staff@plastindo.com', 'staff123')}
                disabled={loading}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 text-left"
              >
                👷 Login Staff
                <span className="block text-[10px] text-emerald-500 font-normal">Mutasi Stok</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Budi Santoso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="nama@plastindo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role / Peran</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="STAFF">Staff Gudang</option>
                <option value="ADMIN">Admin Sistem</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs mt-2"
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk Manual'}
          </button>
        </form>

        <div className="text-center mt-4 text-xs text-slate-500">
          {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isRegister ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </div>
      </div>
    </div>
  );
}
