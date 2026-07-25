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
import axios from 'axios';
import toast from 'react-hot-toast';

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
      return { type: 'Schedulato', color: 'bg-purple-100 text-purple-800' };
    } else if (fileName.includes('backup')) {
      return { type: 'Manuale', color: 'bg-blue-100 text-blue-800' };
    }
    return { type: 'Sconosciuto', color: 'bg-gray-100 text-gray-800' };
  };

  const totalSize = backupFiles.reduce((acc, file) => acc + file.size, 0);
  const latestBackup = backupFiles[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">File di Backup</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <HardDrive className="h-4 w-4" />
          <span>Gestione file di backup</span>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totale File</p>
              <p className="text-2xl font-bold text-gray-900">{backupFiles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ultimo Backup</p>
              <p className="text-sm font-bold text-gray-900">
                {latestBackup
                  ? formatDate(latestBackup.createdAt).split(',')[0]
                  : 'Nessuno'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Spazio Totale</p>
              <p className="text-sm font-bold text-gray-900">
                {formatFileSize(totalSize)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro calendario */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filtra per data</h2>
            </div>
            {hasDateFilter && (
              <button
                onClick={clearDateFilter}
                className="inline-flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                <span>Azzera filtri</span>
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Dal
              </label>
              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Al
              </label>
              <input
                id="dateTo"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="sm:pb-2 sm:self-end text-sm text-gray-500">
              {hasDateFilter
                ? `${filteredFiles.length} di ${backupFiles.length} backup`
                : 'Mostra tutti i backup, dal più recente'}
            </div>
          </div>
        </div>
      </div>

      {/* Lista file di backup */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            File di Backup
            {hasDateFilter && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (filtrati)
              </span>
            )}
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Caricamento file...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {backupFiles.length === 0
                  ? 'Nessun file di backup trovato'
                  : 'Nessun backup nel periodo selezionato'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {backupFiles.length === 0
                  ? 'I backup appariranno qui dopo essere stati eseguiti'
                  : 'Prova a modificare o azzerare i filtri di data'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFiles.map((file) => {
                const backupType = getBackupType(file.name);
                return (
                  <div
                    key={file.name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {file.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${backupType.color}`}>
                            {backupType.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Dimensione: {formatFileSize(file.size)}</span>
                          <span>Creato: {formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => downloadBackup(file.name)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Scarica Backup"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteBackup(file.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Elimina Backup"
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

      {/* Informazioni aggiuntive */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Informazioni sui Backup</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-2">Tipi di Backup</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span>Backup Manuale: Eseguiti manualmente dall'utente</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span>Backup Schedulato: Eseguiti automaticamente secondo la schedulazione</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-2">Formato File</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• I backup sono salvati in formato SQL</li>
                <li>• Nome file: backup_[connessione]_[database]_[timestamp].sql</li>
                <li>• La conservazione automatica si configura per ogni connessione</li>
                <li>• Compatibili con MySQL e MariaDB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupFiles;
