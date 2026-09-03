import React, { useState } from 'react';
import { Lock, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api';

const Login = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Inserisci la password');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/login', { password });
      toast.success('Accesso effettuato');
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Accesso non riuscito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 shadow-lg">
            <HardDrive className="h-7 w-7 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Backupper</h1>
          <p className="mt-1 text-sm text-slate-500">Inserisci la password per accedere</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="field-input pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? 'Accesso…' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
