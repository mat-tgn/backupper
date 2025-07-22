import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock,
  Database
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ScheduledBackups = () => {
  const [scheduledBackups, setScheduledBackups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    connectionId: '',
    database: '',
    schedule: '',
    enabled: true
  });
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [customSchedule, setCustomSchedule] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFormData, setCustomFormData] = useState({
    minute: '*',
    hour: '*',
    day: '*',
    month: '*',
    dayOfWeek: '*'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [backupsRes, connectionsRes] = await Promise.all([
        axios.get('/api/scheduled-backups'),
        axios.get('/api/connections')
      ]);
      setScheduledBackups(backupsRes.data);
      setConnections(connectionsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'connectionId') {
      // Quando cambia la connessione, aggiorna i database disponibili
      const connection = connections.find(c => c.id === value);
      if (connection) {
        const databases = connection.databases ? 
          connection.databases.split('\n').filter(db => db.trim()) : 
          (connection.database ? [connection.database] : []);
        
        setAvailableDatabases(databases.map(db => ({ name: db.trim(), selected: false })));
      } else {
        setAvailableDatabases([]);
      }
      
      setFormData({
        ...formData,
        [name]: value
      });
    } else if (name === 'schedule') {
      if (value === 'custom') {
        // Se seleziona personalizzato, mantieni il valore
        setFormData({
          ...formData,
          schedule: 'custom'
        });
        setShowCustomForm(true);
      } else {
        // Se seleziona un'opzione predefinita
        setFormData({
          ...formData,
          schedule: value
        });
        setCustomSchedule(''); // Resetta il campo personalizzato
        setShowCustomForm(false);
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const toggleDatabaseSelection = (index) => {
    setAvailableDatabases(prev => 
      prev.map((db, i) => 
        i === index ? { ...db, selected: !db.selected } : db
      )
    );
  };

  const selectAllDatabases = () => {
    setAvailableDatabases(prev => 
      prev.map(db => ({ ...db, selected: true }))
    );
  };

  const deselectAllDatabases = () => {
    setAvailableDatabases(prev => 
      prev.map(db => ({ ...db, selected: false }))
    );
  };

  const handleCustomFormChange = (field, value) => {
    const newFormData = {
      ...customFormData,
      [field]: value
    };
    setCustomFormData(newFormData);
    
    // Genera l'espressione cron
    const cronExpression = `${newFormData.minute} ${newFormData.hour} ${newFormData.day} ${newFormData.month} ${newFormData.dayOfWeek}`;
    setCustomSchedule(cronExpression);
  };

  const saveScheduledBackup = async () => {
    try {
      setLoading(true);
      
      // Validazione campi
      if (!formData.connectionId) {
        toast.error('Seleziona una connessione');
        return;
      }
      
      if (!formData.schedule || (formData.schedule === 'custom' && !customSchedule)) {
        toast.error('Seleziona una schedulazione valida');
        return;
      }
      
      // Ottieni i database selezionati
      const selectedDbs = availableDatabases.filter(db => db.selected);
      
      if (selectedDbs.length === 0) {
        toast.error('Seleziona almeno un database');
        return;
      }
      
      // Usa il valore personalizzato se selezionato
      const scheduleToSave = formData.schedule === 'custom' ? customSchedule : formData.schedule;
      
      // Crea un backup schedulato per ogni database selezionato
      const results = [];
      
      for (const db of selectedDbs) {
        try {
          const backupData = {
            ...formData,
            database: db.name,
            schedule: scheduleToSave
          };
          
          const response = await axios.post('/api/scheduled-backups', backupData, {
          timeout: 10000 // 10 secondi di timeout
        });
          
          // Verifica che la risposta sia valida
          if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'Risposta non valida dal server');
          }
          
          results.push({ success: true, database: db.name });
        } catch (error) {
          console.error(`Errore nel salvataggio del database ${db.name}:`, error);
          results.push({ success: false, database: db.name, error: error.message });
        }
      }
      
      // Conta i successi e gli errori
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      
      if (failures === 0) {
        toast.success(`Backup schedulati salvati per ${successes} database!`);
      } else if (successes === 0) {
        toast.error(`Errore nel salvataggio di tutti i ${failures} database`);
      } else {
        toast.success(`Backup schedulati salvati per ${successes} database, ${failures} falliti`);
      }
      setFormData({
        connectionId: '',
        database: '',
        schedule: '',
        enabled: true
      });
      setCustomSchedule('');
      setShowCustomForm(false);
      setShowAddForm(false);
      setAvailableDatabases([]);
      fetchData();
    } catch (error) {
      console.error('Errore generale nel salvataggio:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Errore sconosciuto nel salvataggio';
      toast.error('Errore nel salvataggio: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledBackup = async (id) => {
    if (window.confirm('Sei sicuro di voler eliminare questo backup schedulato?')) {
      try {
        await axios.delete(`/api/scheduled-backups/${id}`);
        toast.success('Backup schedulato eliminato');
        
        // Aggiorna direttamente lo stato invece di ricaricare tutto
        setScheduledBackups(prev => prev.filter(backup => backup.id !== id));
      } catch (error) {
        toast.error('Errore nell\'eliminazione del backup schedulato: ' + error.response?.data?.message || error.message);
      }
    }
  };

  const getConnectionName = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? connection.name : 'Connessione non trovata';
  };

  const scheduleOptions = [
    { value: '0 0 * * *', label: 'Ogni giorno a mezzanotte' },
    { value: '0 0 * * 0', label: 'Ogni domenica a mezzanotte' },
    { value: '0 0 1 * *', label: 'Primo giorno del mese' },
    { value: '0 */6 * * *', label: 'Ogni 6 ore' },
    { value: '0 */12 * * *', label: 'Ogni 12 ore' },
    { value: '0 2 * * *', label: 'Ogni giorno alle 2:00' },
    { value: '0 0 * * 1', label: 'Ogni lunedì a mezzanotte' },
    { value: 'custom', label: 'Personalizzato' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Backup Schedulati</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nuovo Backup Schedulato</span>
        </button>
      </div>

      {/* Form per nuovo backup schedulato */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuovo Backup Schedulato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connessione
              </label>
              <select
                name="connectionId"
                value={formData.connectionId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Seleziona una connessione</option>
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name} ({connection.host}:{connection.port})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database ({availableDatabases.filter(db => db.selected).length} selezionati)
              </label>
              {formData.connectionId ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Seleziona i database per il backup
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={selectAllDatabases}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Seleziona Tutti
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllDatabases}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        Deseleziona Tutti
                      </button>
                    </div>
                  </div>
                  
                  {availableDatabases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {availableDatabases.map((db, index) => (
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
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nessun database configurato per questa connessione</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Seleziona prima una connessione</p>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedulazione
              </label>
              <select
                name="schedule"
                value={formData.schedule}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Seleziona una schedulazione</option>
                {scheduleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formData.schedule === 'custom' && showCustomForm && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Configura Schedulazione Personalizzata</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Minuti */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minuti
                      </label>
                      <select
                        value={customFormData.minute}
                        onChange={(e) => handleCustomFormChange('minute', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="*">Ogni minuto</option>
                        <option value="0">Al minuto 0</option>
                        <option value="15">Al minuto 15</option>
                        <option value="30">Al minuto 30</option>
                        <option value="45">Al minuto 45</option>
                        <option value="custom">Personalizzato</option>
                      </select>
                    </div>

                    {/* Ore */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ore
                      </label>
                      <select
                        value={customFormData.hour}
                        onChange={(e) => handleCustomFormChange('hour', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="*">Ogni ora</option>
                        <option value="0">A mezzanotte (00:00)</option>
                        <option value="2">Alle 2:00</option>
                        <option value="6">Alle 6:00</option>
                        <option value="12">A mezzogiorno (12:00)</option>
                        <option value="18">Alle 18:00</option>
                        <option value="22">Alle 22:00</option>
                        <option value="custom">Personalizzato</option>
                      </select>
                    </div>

                    {/* Giorni */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giorni del Mese
                      </label>
                      <select
                        value={customFormData.day}
                        onChange={(e) => handleCustomFormChange('day', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="*">Ogni giorno</option>
                        <option value="1">Il primo del mese</option>
                        <option value="15">Il 15 del mese</option>
                        <option value="custom">Personalizzato</option>
                      </select>
                    </div>

                    {/* Mesi */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mesi
                      </label>
                      <select
                        value={customFormData.month}
                        onChange={(e) => handleCustomFormChange('month', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="*">Ogni mese</option>
                        <option value="1">Gennaio</option>
                        <option value="2">Febbraio</option>
                        <option value="3">Marzo</option>
                        <option value="4">Aprile</option>
                        <option value="5">Maggio</option>
                        <option value="6">Giugno</option>
                        <option value="7">Luglio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Settembre</option>
                        <option value="10">Ottobre</option>
                        <option value="11">Novembre</option>
                        <option value="12">Dicembre</option>
                        <option value="custom">Personalizzato</option>
                      </select>
                    </div>

                    {/* Giorni della Settimana */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giorni della Settimana
                      </label>
                      <select
                        value={customFormData.dayOfWeek}
                        onChange={(e) => handleCustomFormChange('dayOfWeek', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="*">Ogni giorno</option>
                        <option value="1">Lunedì</option>
                        <option value="2">Martedì</option>
                        <option value="3">Mercoledì</option>
                        <option value="4">Giovedì</option>
                        <option value="5">Venerdì</option>
                        <option value="6">Sabato</option>
                        <option value="0">Domenica</option>
                        <option value="custom">Personalizzato</option>
                      </select>
                    </div>
                  </div>

                  {/* Espressione Cron Generata */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Espressione Cron Generata
                    </label>
                    <input
                      type="text"
                      value={customSchedule}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Questa espressione verrà utilizzata per la schedulazione
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={saveScheduledBackup}
              disabled={loading || !formData.connectionId || availableDatabases.filter(db => db.selected).length === 0 || !formData.schedule || (formData.schedule === 'custom' && !customSchedule)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salva Backup Schedulato'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista backup schedulati */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Backup Schedulati</h2>
        </div>
        <div className="p-6">
          {scheduledBackups.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nessun backup schedulato</p>
              <p className="text-sm text-gray-400 mt-1">Crea il tuo primo backup automatico</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledBackups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getConnectionName(backup.connectionId)}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          backup.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {backup.enabled ? 'Attivo' : 'Disabilitato'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Database: {backup.database}
                      </p>
                      <p className="text-sm text-gray-600">
                        Schedulazione: {backup.schedule}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creato il: {new Date(backup.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteScheduledBackup(backup.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Elimina Backup Schedulato"
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
    </div>
  );
};

export default ScheduledBackups; 