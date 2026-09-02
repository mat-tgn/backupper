import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';

const DISMISS_KEY = 'backupper-dismissed-update-sha';

const UpdateBanner = () => {
  const [info, setInfo] = useState(null);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadUpdate = async () => {
    try {
      const { data } = await axios.get('/api/updates');
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (data.updateAvailable && data.latest?.sha && data.latest.sha !== dismissed) {
        setInfo(data);
      } else {
        setInfo(null);
      }
    } catch (error) {
      console.error('Controllo aggiornamenti non disponibile:', error);
    }
  };

  useEffect(() => {
    loadUpdate();
    const timer = setInterval(loadUpdate, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => {
    if (info?.latest?.sha) {
      window.localStorage.setItem(DISMISS_KEY, info.latest.sha);
    }
    setConfirming(false);
    setInfo(null);
  };

  const apply = async () => {
    setApplying(true);
    try {
      const { data } = await axios.post('/api/updates/apply');
      toast.success(data.message || 'Aggiornamento avviato');
      if (data.restarting) {
        toast.loading('Riavvio in corso, ricarico la pagina…');
        setTimeout(() => {
          window.location.reload();
        }, 8000);
      } else {
        setApplying(false);
        setConfirming(false);
        setInfo(null);
      }
    } catch (error) {
      setApplying(false);
      toast.error(error.response?.data?.message || 'Aggiornamento non riuscito');
    }
  };

  if (!info) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <RefreshCw className={`h-5 w-5 text-amber-700 ${applying ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="font-semibold text-amber-950">È disponibile un aggiornamento</p>
            <p className="mt-1 text-sm text-amber-800">
              In esecuzione: {info.current.shortSha || info.current.version}
              {' → '}
              nuovo: {info.latest.shortSha}
              {info.latest.message ? ` — ${info.latest.message}` : ''}
            </p>
            {confirming && (
              <p className="mt-2 text-sm text-amber-900">
                Confermi? Il container scarica il codice da GitHub, ricompila e si riavvia da solo.
                Backup e configurazioni restano invariati.
              </p>
            )}
            {!info.canApply && (
              <p className="mt-2 text-sm text-amber-900">{info.applyHint}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {info.canApply && !confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Aggiorna
                </button>
              )}
              {info.canApply && confirming && (
                <button
                  type="button"
                  onClick={apply}
                  disabled={applying}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {applying ? 'Aggiornamento in corso…' : 'Conferma aggiornamento'}
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                disabled={applying}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Dopo
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={applying}
          className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 hover:text-amber-950"
          aria-label="Chiudi avviso aggiornamento"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
