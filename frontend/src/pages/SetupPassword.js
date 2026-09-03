import React, { useState } from 'react';
import { Lock, ShieldCheck, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api';

const MIN_LENGTH = 8;

const SetupPassword = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < MIN_LENGTH) {
      toast.error(`La password deve avere almeno ${MIN_LENGTH} caratteri`);
      return;
    }
    if (password !== confirm) {
      toast.error('Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/setup', { password });
      toast.success('Password impostata');
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impostazione non riuscita');
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Primo avvio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Imposta una password per proteggere Backupper
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-indigo-50 px-3 py-3 text-sm text-indigo-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              La protezione è obbligatoria. Conserva la password: senza di essa non potrai accedere.
            </span>
          </div>

          <label htmlFor="setup-password" className="field-label">
            Nuova password
          </label>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="setup-password"
              type="password"
              autoFocus
              autoComplete="new-password"
              className="field-input pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Minimo ${MIN_LENGTH} caratteri`}
            />
          </div>

          <label htmlFor="setup-confirm" className="field-label">
            Conferma password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="setup-confirm"
              type="password"
              autoComplete="new-password"
              className="field-input pl-10"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ripeti la password"
            />
          </div>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? 'Salvataggio…' : 'Imposta password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPassword;
