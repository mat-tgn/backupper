import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  FileText,
  Calendar,
  HardDrive
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BackupFiles = () => {
  const [backupFiles, setBackupFiles] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const downloadBackup = (fileName) => {
    // In un'implementazione reale, qui si scaricherebbe il file
    toast.success(`Download avviato per: ${fileName}`);
  };

  const deleteBackup = async (fileName) => {
    if (window.confirm(`Sei sicuro di voler eliminare il backup: ${fileName}?`)) {
      try {
        setLoading(true);
        await axios.delete(`/api/backups/${encodeURIComponent(fileName)}`);
        toast.success(`Backup eliminato: ${fileName}`);
        
        // Aggiorna direttamente lo stato invece di ricaricare tutto
        setBackupFiles(prev => prev.filter(file => file.name !== fileName));
      } catch (error) {
        toast.error('Errore nell\'eliminazione del backup: ' + error.response?.data?.message || error.message);
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
                {backupFiles.length > 0 
                  ? formatDate(backupFiles[0].createdAt).split(',')[0]
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
                {formatFileSize(backupFiles.reduce((acc, file) => acc + file.size, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista file di backup */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">File di Backup</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Caricamento file...</p>
            </div>
          ) : backupFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nessun file di backup trovato</p>
              <p className="text-sm text-gray-400 mt-1">I backup appariranno qui dopo essere stati eseguiti</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backupFiles.map((file, index) => {
                const backupType = getBackupType(file.name);
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
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
                      <div className="flex items-center space-x-2">
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
                <li>• Nome file: backup_[database]_[timestamp].sql</li>
                <li>• I file contengono la struttura e i dati del database</li>
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