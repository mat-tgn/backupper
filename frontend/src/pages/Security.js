import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api';
import PageHeader from '../components/PageHeader';

const MIN_LENGTH = 8;

const Security = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Inserisci la password attuale');
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      toast.error(`La nuova password deve avere almeno ${MIN_LENGTH} caratteri`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Le nuove password non coincidono');
      return;
    }

    setLoading(true);
    try {
      await axios.put('/api/auth/password', { currentPassword, newPassword });
      toast.success('Password aggiornata');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Aggiornamento non riuscito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sicurezza"
        subtitle="Cambia la password di accesso all'applicazione"
      />

      <form onSubmit={handleSubmit} className="card max-w-lg p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Shield className="h-4 w-4 text-indigo-500" />
          Cambia password
        </div>

        <label htmlFor="current-password" className="field-label">
          Password attuale
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          className="field-input mb-4"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <label htmlFor="new-password" className="field-label">
          Nuova password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="field-input mb-4"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={`Minimo ${MIN_LENGTH} caratteri`}
        />

        <label htmlFor="confirm-password" className="field-label">
          Conferma nuova password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="field-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="btn-primary mt-6" disabled={loading}>
          {loading ? 'Salvataggio…' : 'Aggiorna password'}
        </button>
      </form>
    </div>
  );
};

export default Security;
