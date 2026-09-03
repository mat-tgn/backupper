import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import axios, { setUnauthorizedHandler } from './api';
import Sidebar from './components/Sidebar';
import UpdateBanner from './components/UpdateBanner';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import ScheduledBackups from './pages/ScheduledBackups';
import BackupFiles from './pages/BackupFiles';
import Security from './pages/Security';
import Login from './pages/Login';
import SetupPassword from './pages/SetupPassword';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState({
    loading: true,
    setupRequired: false,
    authenticated: false
  });

  const refreshAuth = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/auth/status');
      setAuthState({
        loading: false,
        setupRequired: Boolean(data.setupRequired),
        authenticated: Boolean(data.authenticated)
      });
    } catch (error) {
      setAuthState({
        loading: false,
        setupRequired: false,
        authenticated: false
      });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    setUnauthorizedHandler((data) => {
      setAuthState({
        loading: false,
        authenticated: false,
        setupRequired: Boolean(data?.setupRequired)
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-500">Caricamento…</div>
        <Toaster position="top-right" />
      </div>
    );
  }

  if (authState.setupRequired) {
    return (
      <>
        <SetupPassword onSuccess={refreshAuth} />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: {
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.16)',
            },
          }}
        />
      </>
    );
  }

  if (!authState.authenticated) {
    return (
      <>
        <Login onSuccess={refreshAuth} />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: {
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.16)',
            },
          }}
        />
      </>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-100">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={refreshAuth}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Apri menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-slate-900">Backupper</span>
          </div>
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <UpdateBanner />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/connections" element={<Connections />} />
                <Route path="/scheduled-backups" element={<ScheduledBackups />} />
                <Route path="/backup-files" element={<BackupFiles />} />
                <Route path="/security" element={<Security />} />
              </Routes>
            </div>
          </main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: {
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.16)',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
