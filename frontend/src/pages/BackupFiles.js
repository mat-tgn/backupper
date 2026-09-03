import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  Trash2, 
  FileText,
  Calendar,
  HardDrive,
  Filter,
  X
} from 'lucide-react';
import axios from '../api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';

const BackupFiles = () => {
  const [backupFiles, setBackupFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchBackupFiles();
  }, []);

  const fetchBackupFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/backups');
      setBackupFiles(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei file di backup');
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return backupFiles.filter((file) => {
      const created = new Date(file.createdAt);
      const dayStart = new Date(created.getFullYear(), created.getMonth(), created.getDate());

      if (dateFrom) {
        const from = new Date(dateFrom);
        if (dayStart < from) return false;
      }

      if (dateTo) {
        const to = new Date(dateTo);
        if (dayStart > to) return false;
      }

      return true;
    });
  }, [backupFiles, dateFrom, dateTo]);

  const hasDateFilter = Boolean(dateFrom || dateTo);

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadBackup = async (fileName) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/backups/${encodeURIComponent(fileName)}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Download completato: ${fileName}`);
    } catch (error) {
      toast.error('Errore durante il download: ' + (error.response?.data?.message || error.message));
      console.error('Errore download:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (fileName) => {
    if (window.confirm(`Sei sicuro di voler eliminare il backup: ${fileName}?`)) {
      try {
        setLoading(true);
        await axios.delete(`/api/backups/${encodeURIComponent(fileName)}`);
        toast.success(`Backup eliminato: ${fileName}`);
        setBackupFiles(prev => prev.filter(file => file.name !== fileName));
      } catch (error) {
        toast.error('Errore nell\'eliminazione del backup: ' + (error.response?.data?.message || error.message));
        console.error('Errore eliminazione:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getBackupType = (fileName) => {
    if (fileName.includes('scheduled_backup')) {
      return { type: 'Schedulato', color: 'bg-violet-50 text-violet-700' };
    } else if (fileName.includes('backup')) {
      return { type: 'Manuale', color: 'bg-indigo-50 text-indigo-700' };
    }
    return { type: 'Sconosciuto', color: 'bg-slate-100 text-slate-600' };
  };

  const totalSize = backupFiles.reduce((acc, file) => acc + file.size, 0);
  const latestBackup = backupFiles[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Archivio backup"
        subtitle="Scarica o elimina i dump salvati"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Totale file</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{backupFiles.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ultimo backup</p>
              <p className="text-sm font-semibold text-slate-900">
                {latestBackup
                  ? formatDate(latestBackup.createdAt).split(',')[0]
                  : 'Nessuno'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Spazio totale</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatFileSize(totalSize)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro calendario */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h2 className="card-title">Filtra per data</h2>
          </div>
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="inline-flex items-center space-x-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
              <span>Azzera filtri</span>
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label htmlFor="dateFrom" className="field-label">Dal</label>
              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="field-label">Al</label>
              <input
                id="dateTo"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="sm:pb-2 sm:self-end text-sm text-slate-500">
              {hasDateFilter
                ? `${filteredFiles.length} di ${backupFiles.length} backup`
                : 'Mostra tutti i backup, dal più recente'}
            </div>
          </div>
        </div>
      </div>

      {/* Lista file di backup */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            File di backup
            {hasDateFilter && (
              <span className="ml-2 text-sm font-normal text-slate-500">(filtrati)</span>
            )}
          </h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="empty-state">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-slate-500 mt-2">Caricamento file...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty-state">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600">
                {backupFiles.length === 0
                  ? 'Nessun file di backup trovato'
                  : 'Nessun backup nel periodo selezionato'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {backupFiles.length === 0
                  ? 'I backup appariranno qui dopo essere stati eseguiti'
                  : 'Prova a modificare o azzerare i filtri di data'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => {
                const backupType = getBackupType(file.name);
                return (
                  <div key={file.name} className="list-row">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 truncate">{file.name}</h3>
                          <span className={`badge ${backupType.color}`}>{backupType.type}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => downloadBackup(file.name)}
                          className="btn-icon-info"
                          title="Scarica backup"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteBackup(file.name)}
                          className="btn-icon-danger"
                          title="Elimina backup"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Informazioni</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Tipi di backup</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                  <span>Manuale: eseguito dall'utente</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 bg-violet-500 rounded-full"></span>
                  <span>Schedulato: eseguito automaticamente</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Formato file</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>Dump in formato SQL, compatibili con MySQL e MariaDB</li>
                <li>Nome: backup_[connessione]_[database]_[timestamp].sql</li>
                <li>La conservazione si configura per ogni schedulazione</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupFiles;
