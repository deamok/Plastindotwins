import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import { authService } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getMe()
        .then((res) => {
          setUser(res.data.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
          setIsAuthModalOpen(true);
        });
    } else {
      // Buka modal login langsung jika belum memiliki sesi aktif
      setIsAuthModalOpen(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div>
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />
    </div>
  );
}
