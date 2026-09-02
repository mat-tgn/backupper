import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Database,
  Eye,
  EyeOff,
  Edit,
  Search
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedDatabases, setSelectedDatabases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '3306',
    user: '',
    password: '',
    databases: ''
  });

  const emptyForm = {
    name: '',
    host: '',
    port: '3306',
    user: '',
    password: '',
    databases: ''
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await axios.get('/api/connections');
      setConnections(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento delle connessioni');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      await axios.post('/api/test-connection', formData);
      toast.success('Connessione riuscita!');
    } catch (error) {
      toast.error('Errore nella connessione: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const discoverDatabases = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/discover-databases', {
        host: formData.host,
        port: formData.port,
        user: formData.user,
        password: formData.password
      });
      
      if (response.data.success) {
        const databases = response.data.databases.join('\n');
        setFormData({
          ...formData,
          databases: databases
        });
        toast.success(`Trovati ${response.data.databases.length} database!`);
      }
    } catch (error) {
      toast.error('Errore nella ricerca database: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async () => {
    try {
      setLoading(true);
      await axios.post('/api/connections', formData);
      toast.success('Connessione salvata con successo!');
      setFormData(emptyForm);
      setShowAddForm(false);
      fetchConnections();
    } catch (error) {
      toast.error('Errore nel salvataggio della connessione: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questa connessione?')) {
      try {
        await axios.delete(`/api/connections/${id}`);
        toast.success('Connessione eliminata');
        
        // Aggiorna direttamente lo stato invece di ricaricare tutto
        setConnections(prev => prev.filter(connection => connection.id !== id));
      } catch (error) {
        toast.error('Errore nell\'eliminazione della connessione: ' + error.response?.data?.message || error.message);
      }
    }
  };

  const editConnection = (connection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      host: connection.host,
      port: connection.port,
      user: connection.user,
      password: connection.password,
      databases: connection.databases || connection.database || ''
    });
    setShowEditForm(true);
  };

  const updateConnection = async () => {
    try {
      setLoading(true);
      await axios.put(`/api/connections/${editingConnection.id}`, formData);
      toast.success('Connessione aggiornata con successo!');
      setFormData(emptyForm);
      setEditingConnection(null);
      setShowEditForm(false);
      fetchConnections();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento della connessione: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async (connection) => {
    // Ottieni i database dalla connessione
    const databases = connection.databases ? 
      connection.databases.split('\n').filter(db => db.trim()) : 
      (connection.database ? [connection.database] : []);
    
    if (databases.length === 0) {
      toast.error('Nessun database configurato per questa connessione');
      return;
    }
    
    if (databases.length === 1) {
      // Se c'è solo un database, esegui direttamente il backup
      executeBackup(connection, databases[0]);
    } else {
      // Se ci sono più database, apri la dialog di selezione
      setSelectedConnection(connection);
      setSelectedDatabases(databases.map(db => ({ name: db.trim(), selected: false })));
      setShowBackupDialog(true);
    }
  };

  const executeBackup = async (connection, database) => {
    try {
      setLoading(true);
      await axios.post('/api/backup', {
        connectionId: connection.id,
        database: database
      });
      toast.success('Backup completato con successo!');
    } catch (error) {
      toast.error('Errore durante il backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const executeSelectedBackups = async () => {
    const selectedDbs = selectedDatabases.filter(db => db.selected);
    
    if (selectedDbs.length === 0) {
      toast.error('Seleziona almeno un database');
      return;
    }

    try {
      setLoading(true);
      
      for (const db of selectedDbs) {
        await axios.post('/api/backup', {
          connectionId: selectedConnection.id,
          database: db.name
        });
      }
      
      toast.success(`Backup completati per ${selectedDbs.length} database!`);
      setShowBackupDialog(false);
      setSelectedConnection(null);
      setSelectedDatabases([]);
    } catch (error) {
      toast.error('Errore durante il backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleDatabaseSelection = (index) => {
    setSelectedDatabases(prev => 
      prev.map((db, i) => 
        i === index ? { ...db, selected: !db.selected } : db
      )
    );
  };

  const selectAllDatabases = () => {
    setSelectedDatabases(prev => 
      prev.map(db => ({ ...db, selected: true }))
    );
  };

  const deselectAllDatabases = () => {
    setSelectedDatabases(prev => 
      prev.map(db => ({ ...db, selected: false }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Connessioni MySQL</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nuova Connessione</span>
        </button>
      </div>

      {/* Form per nuova connessione */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuova Connessione</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Connessione
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Es: Database Produzione"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="3306"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utente
              </label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="root"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database (uno per riga)
              </label>
              <div className="flex space-x-2">
                <textarea
                  name="databases"
                  value={formData.databases}
                  onChange={handleInputChange}
                  rows={4}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="mio_database&#10;altro_database&#10;terzo_database"
                />
                <button
                  type="button"
                  onClick={discoverDatabases}
                  disabled={loading || !formData.host || !formData.user || !formData.password}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                  title="Cerca database automaticamente"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerca</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Inserisci un database per riga. Usa il pulsante "Cerca" per trovare automaticamente i database disponibili.
              </p>
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Testando...' : 'Test Connessione'}
            </button>
            <button
              onClick={saveConnection}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salva Connessione'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData(emptyForm);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Form per modifica connessione */}
      {showEditForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifica Connessione</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Connessione
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Es: Database Produzione"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="3306"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utente
              </label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="root"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database (uno per riga)
              </label>
              <div className="flex space-x-2">
                <textarea
                  name="databases"
                  value={formData.databases}
                  onChange={handleInputChange}
                  rows={4}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="mio_database&#10;altro_database&#10;terzo_database"
                />
                <button
                  type="button"
                  onClick={discoverDatabases}
                  disabled={loading || !formData.host || !formData.user || !formData.password}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                  title="Cerca database automaticamente"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerca</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Inserisci un database per riga. Usa il pulsante "Cerca" per trovare automaticamente i database disponibili.
              </p>
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={updateConnection}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Aggiornando...' : 'Aggiorna Connessione'}
            </button>
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditingConnection(null);
                setFormData(emptyForm);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista connessioni */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Connessioni Salvate</h2>
        </div>
        <div className="p-6">
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nessuna connessione salvata</p>
              <p className="text-sm text-gray-400 mt-1">Aggiungi la tua prima connessione MySQL</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {connection.host}:{connection.port}
                      </p>
                      <p className="text-xs text-gray-500">
                        Database: {connection.databases ? 
                          connection.databases.split('\n').filter(db => db.trim()).join(', ') : 
                          (connection.database || 'Nessun database configurato')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creato il: {new Date(connection.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => editConnection(connection)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifica Connessione"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => runBackup(connection)}
                        disabled={loading}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="Esegui Backup"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteConnection(connection.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Elimina Connessione"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog per selezione database backup */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Seleziona Database per Backup
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedConnection?.name} - {selectedDatabases.length} database disponibili
              </p>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Database ({selectedDatabases.filter(db => db.selected).length} selezionati)
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllDatabases}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Seleziona Tutti
                  </button>
                  <button
                    onClick={deselectAllDatabases}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Deseleziona Tutti
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedDatabases.map((db, index) => (
                  <label
                    key={index}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={db.selected}
                      onChange={() => toggleDatabaseSelection(index)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">{db.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBackupDialog(false);
                  setSelectedConnection(null);
                  setSelectedDatabases([]);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={executeSelectedBackups}
                disabled={loading || selectedDatabases.filter(db => db.selected).length === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Eseguendo...' : 'Esegui Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Connections; 