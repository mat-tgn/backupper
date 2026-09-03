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
import axios from '../api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';

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
    <div className="space-y-8">
      <PageHeader
        title="Connessioni MySQL"
        subtitle="Gestisci host, credenziali e database da includere nei backup"
        actions={
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Nuova connessione</span>
          </button>
        }
      />

      {/* Form per nuova connessione */}
      {showAddForm && (
        <div className="card p-6">
          <h2 className="card-title mb-5">Nuova connessione</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome connessione</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="field-input"
                placeholder="Es: Database Produzione"
              />
            </div>
            <div>
              <label className="field-label">Host</label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleInputChange}
                className="field-input"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="field-label">Porta</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                className="field-input"
                placeholder="3306"
              />
            </div>
            <div>
              <label className="field-label">Utente</label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleInputChange}
                className="field-input"
                placeholder="root"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="field-input pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Database (uno per riga)</label>
              <div className="flex space-x-2">
                <textarea
                  name="databases"
                  value={formData.databases}
                  onChange={handleInputChange}
                  rows={4}
                  className="field-input flex-1"
                  placeholder="mio_database&#10;altro_database&#10;terzo_database"
                />
                <button
                  type="button"
                  onClick={discoverDatabases}
                  disabled={loading || !formData.host || !formData.user || !formData.password}
                  className="btn-primary h-fit"
                  title="Cerca database automaticamente"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerca</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Inserisci un database per riga. Usa il pulsante "Cerca" per trovare automaticamente i database disponibili.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={testConnection} disabled={loading} className="btn-secondary">
              {loading ? 'Testando...' : 'Test connessione'}
            </button>
            <button onClick={saveConnection} disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salva connessione'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData(emptyForm);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Form per modifica connessione */}
      {showEditForm && (
        <div className="card p-6">
          <h2 className="card-title mb-5">Modifica connessione</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome connessione</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="field-input"
                placeholder="Es: Database Produzione"
              />
            </div>
            <div>
              <label className="field-label">Host</label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleInputChange}
                className="field-input"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="field-label">Porta</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                className="field-input"
                placeholder="3306"
              />
            </div>
            <div>
              <label className="field-label">Utente</label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleInputChange}
                className="field-input"
                placeholder="root"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="field-input pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Database (uno per riga)</label>
              <div className="flex space-x-2">
                <textarea
                  name="databases"
                  value={formData.databases}
                  onChange={handleInputChange}
                  rows={4}
                  className="field-input flex-1"
                  placeholder="mio_database&#10;altro_database&#10;terzo_database"
                />
                <button
                  type="button"
                  onClick={discoverDatabases}
                  disabled={loading || !formData.host || !formData.user || !formData.password}
                  className="btn-primary h-fit"
                  title="Cerca database automaticamente"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerca</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Inserisci un database per riga. Usa il pulsante "Cerca" per trovare automaticamente i database disponibili.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={updateConnection} disabled={loading} className="btn-primary">
              {loading ? 'Aggiornando...' : 'Aggiorna connessione'}
            </button>
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditingConnection(null);
                setFormData(emptyForm);
              }}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista connessioni */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Connessioni salvate</h2>
        </div>
        <div className="p-5">
          {connections.length === 0 ? (
            <div className="empty-state">
              <Database className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Nessuna connessione salvata</p>
              <p className="text-sm text-slate-400 mt-1">Aggiungi la tua prima connessione MySQL</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div key={connection.id} className="list-row">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{connection.name}</h3>
                      <p className="text-sm text-slate-500 font-mono">
                        {connection.host}:{connection.port}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Database: {connection.databases ? 
                          connection.databases.split('\n').filter(db => db.trim()).join(', ') : 
                          (connection.database || 'Nessun database configurato')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Creato il {new Date(connection.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => editConnection(connection)}
                        className="btn-icon-info"
                        title="Modifica connessione"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => runBackup(connection)}
                        disabled={loading}
                        className="btn-icon-success disabled:opacity-50"
                        title="Esegui backup"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteConnection(connection.id)}
                        className="btn-icon-danger"
                        title="Elimina connessione"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-md shadow-card-hover">
            <div className="card-header">
              <div>
                <h3 className="card-title">Seleziona database</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedConnection?.name} — {selectedDatabases.length} disponibili
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-700">
                  {selectedDatabases.filter(db => db.selected).length} selezionati
                </span>
                <div className="flex space-x-3">
                  <button onClick={selectAllDatabases} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                    Seleziona tutti
                  </button>
                  <button onClick={deselectAllDatabases} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                    Deseleziona
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {selectedDatabases.map((db, index) => (
                  <label
                    key={index}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={db.selected}
                      onChange={() => toggleDatabaseSelection(index)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-900">{db.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBackupDialog(false);
                  setSelectedConnection(null);
                  setSelectedDatabases([]);
                }}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={executeSelectedBackups}
                disabled={loading || selectedDatabases.filter(db => db.selected).length === 0}
                className="btn-primary"
              >
                {loading ? 'Eseguendo...' : 'Esegui backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Connections; 