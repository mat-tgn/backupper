import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock,
  Database,
  Edit
} from 'lucide-react';
import axios from '../api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';

const CUSTOM_FIELD_VALUE = '__custom__';

const CRON_FIELDS = [
  {
    key: 'minute',
    label: 'Minuto',
    hint: '0–59. Esempi: */15, 0,30',
    presets: [
      { value: '*', label: 'Ogni minuto' },
      { value: '0', label: 'Al minuto 0' },
      { value: '15', label: 'Al minuto 15' },
      { value: '30', label: 'Al minuto 30' },
      { value: '45', label: 'Al minuto 45' },
      { value: '*/5', label: 'Ogni 5 minuti' },
      { value: '*/15', label: 'Ogni 15 minuti' }
    ]
  },
  {
    key: 'hour',
    label: 'Ora',
    hint: '0–23. Esempi: */6, 8-18',
    presets: [
      { value: '*', label: 'Ogni ora' },
      { value: '0', label: 'Mezzanotte (00)' },
      { value: '2', label: 'Alle 02' },
      { value: '6', label: 'Alle 06' },
      { value: '8', label: 'Alle 08' },
      { value: '12', label: 'Mezzogiorno (12)' },
      { value: '18', label: 'Alle 18' },
      { value: '22', label: 'Alle 22' },
      { value: '*/6', label: 'Ogni 6 ore' }
    ]
  },
  {
    key: 'day',
    label: 'Giorno del mese',
    hint: '1–31. Esempi: 1,15 o 1-5',
    presets: [
      { value: '*', label: 'Ogni giorno' },
      { value: '1', label: 'Il 1 del mese' },
      { value: '15', label: 'Il 15 del mese' }
    ]
  },
  {
    key: 'month',
    label: 'Mese',
    hint: '1–12. Esempi: 1,7 o 1-3',
    presets: [
      { value: '*', label: 'Ogni mese' },
      { value: '1', label: 'Gennaio' },
      { value: '2', label: 'Febbraio' },
      { value: '3', label: 'Marzo' },
      { value: '4', label: 'Aprile' },
      { value: '5', label: 'Maggio' },
      { value: '6', label: 'Giugno' },
      { value: '7', label: 'Luglio' },
      { value: '8', label: 'Agosto' },
      { value: '9', label: 'Settembre' },
      { value: '10', label: 'Ottobre' },
      { value: '11', label: 'Novembre' },
      { value: '12', label: 'Dicembre' }
    ]
  },
  {
    key: 'dayOfWeek',
    label: 'Giorno della settimana',
    hint: '0 = domenica, 1 = lunedì. Esempi: 1-5',
    presets: [
      { value: '*', label: 'Ogni giorno' },
      { value: '1-5', label: 'Dal lunedì al venerdì' },
      { value: '0,6', label: 'Sabato e domenica' },
      { value: '1', label: 'Lunedì' },
      { value: '2', label: 'Martedì' },
      { value: '3', label: 'Mercoledì' },
      { value: '4', label: 'Giovedì' },
      { value: '5', label: 'Venerdì' },
      { value: '6', label: 'Sabato' },
      { value: '0', label: 'Domenica' }
    ]
  }
];

const emptyCustomForm = {
  minute: '*',
  hour: '*',
  day: '*',
  month: '*',
  dayOfWeek: '*'
};

const cronFromFields = (fields) =>
  `${fields.minute} ${fields.hour} ${fields.day} ${fields.month} ${fields.dayOfWeek}`;

const parseCronExpression = (cronExpr) => {
  const parts = String(cronExpr || '').trim().split(/\s+/);
  if (parts.length !== 5) {
    return { ...emptyCustomForm };
  }
  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  };
};

const cronFieldPresets = (field) =>
  CRON_FIELDS.find((item) => item.key === field)?.presets.map((preset) => preset.value) || [];

const openFieldsFromCron = (fields) => ({
  minute: !cronFieldPresets('minute').includes(fields.minute),
  hour: !cronFieldPresets('hour').includes(fields.hour),
  day: !cronFieldPresets('day').includes(fields.day),
  month: !cronFieldPresets('month').includes(fields.month),
  dayOfWeek: !cronFieldPresets('dayOfWeek').includes(fields.dayOfWeek)
});

const CRON_PART_RE = /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+(-\d+)?|\*\/\d+)(,(\d+(-\d+)?|\*\/\d+))*)$/;

const isValidCronExpression = (expression) => {
  const parts = String(expression || '').trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }
  return parts.every((part) => part && part !== CUSTOM_FIELD_VALUE && CRON_PART_RE.test(part));
};

const fieldSelectValue = (field, value) =>
  cronFieldPresets(field).includes(value) ? value : CUSTOM_FIELD_VALUE;

const describeCron = (expression) => {
  const preset = scheduleOptions.find((option) => option.value === expression);
  if (preset && preset.value !== 'custom') {
    return preset.label;
  }
  if (!isValidCronExpression(expression)) {
    return 'Espressione cron non valida';
  }
  const [minute, hour, day, month, dow] = expression.trim().split(/\s+/);
  const parts = [];
  if (minute.startsWith('*/')) {
    parts.push(`ogni ${minute.slice(2)} minuti`);
  } else if (minute === '*') {
    parts.push('ogni minuto');
  } else {
    parts.push(`al minuto ${minute}`);
  }
  if (hour.startsWith('*/')) {
    parts.push(`ogni ${hour.slice(2)} ore`);
  } else if (hour !== '*') {
    parts.push(`alle ore ${hour}`);
  }
  if (day !== '*') {
    parts.push(`il giorno ${day} del mese`);
  }
  if (month !== '*') {
    parts.push(`nel mese ${month}`);
  }
  if (dow === '1-5') {
    parts.push('dal lunedì al venerdì');
  } else if (dow === '0,6') {
    parts.push('nel weekend');
  } else if (dow !== '*') {
    parts.push(`il giorno settimanale ${dow}`);
  }
  return parts.join(', ');
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

const ScheduledBackups = () => {
  const [scheduledBackups, setScheduledBackups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingBackup, setEditingBackup] = useState(null);
  const [loading, setLoading] = useState(false);
  const emptyForm = {
    connectionId: '',
    database: '',
    schedule: '',
    enabled: true,
    retentionMode: 'days',
    retentionValue: 0
  };
  const [formData, setFormData] = useState(emptyForm);
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
  const [customOpenFields, setCustomOpenFields] = useState({
    minute: false,
    hour: false,
    day: false,
    month: false,
    dayOfWeek: false
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
        const nextCustom = customSchedule || cronFromFields(emptyCustomForm);
        setFormData({
          ...formData,
          schedule: 'custom'
        });
        setShowCustomForm(true);
        setCustomFormData(parseCronExpression(nextCustom));
        setCustomSchedule(nextCustom);
        setCustomOpenFields(openFieldsFromCron(parseCronExpression(nextCustom)));
      } else {
        setFormData({
          ...formData,
          schedule: value
        });
        setCustomSchedule('');
        setShowCustomForm(false);
        setCustomFormData(emptyCustomForm);
        setCustomOpenFields({
          minute: false,
          hour: false,
          day: false,
          month: false,
          dayOfWeek: false
        });
      }
    } else {
      const nextValue = e.target.type === 'checkbox' ? e.target.checked : value;
      setFormData({
        ...formData,
        [name]: nextValue
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
    setCustomSchedule(cronFromFields(newFormData));
  };

  const handleCronFieldSelect = (field, selected) => {
    if (selected === CUSTOM_FIELD_VALUE) {
      setCustomOpenFields((prev) => ({ ...prev, [field]: true }));
      const presets = cronFieldPresets(field);
      if (presets.includes(customFormData[field])) {
        handleCustomFormChange(field, '');
      }
      return;
    }
    setCustomOpenFields((prev) => ({ ...prev, [field]: false }));
    handleCustomFormChange(field, selected);
  };

  const handleCronExpressionChange = (value) => {
    setCustomSchedule(value);
    const parts = String(value || '').trim().split(/\s+/);
    if (parts.length === 5) {
      const parsed = parseCronExpression(value);
      setCustomFormData(parsed);
      setCustomOpenFields(openFieldsFromCron(parsed));
    }
  };

  const saveScheduledBackup = async () => {
    try {
      setLoading(true);
      
      // Validazione campi
      if (!formData.connectionId) {
        toast.error('Seleziona una connessione');
        return;
      }
      
      if (!formData.schedule || (formData.schedule === 'custom' && !isValidCronExpression(customSchedule))) {
        toast.error('Seleziona una schedulazione valida');
        return;
      }

      const retentionValue = Number(formData.retentionValue);
      if (!Number.isInteger(retentionValue) || retentionValue < 0) {
        toast.error('Il valore di conservazione deve essere un intero >= 0');
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
            schedule: scheduleToSave,
            retentionMode: formData.retentionMode,
            retentionValue
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
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Errore generale nel salvataggio:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Errore sconosciuto nel salvataggio';
      toast.error('Errore nel salvataggio: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setCustomSchedule('');
    setShowCustomForm(false);
    setCustomFormData(emptyCustomForm);
    setCustomOpenFields({
      minute: false,
      hour: false,
      day: false,
      month: false,
      dayOfWeek: false
    });
    setAvailableDatabases([]);
    setEditingBackup(null);
    setShowAddForm(false);
    setShowEditForm(false);
  };

  const editScheduledBackup = (backup) => {
    const isPreset = scheduleOptions.some((option) => option.value === backup.schedule);
    setEditingBackup(backup);
    setFormData({
      connectionId: backup.connectionId,
      database: backup.database,
      schedule: isPreset ? backup.schedule : 'custom',
      enabled: backup.enabled !== false,
      retentionMode: backup.retentionMode === 'count' ? 'count' : 'days',
      retentionValue: backup.retentionValue ?? backup.retentionDays ?? 0
    });
    if (!isPreset) {
      const parsed = parseCronExpression(backup.schedule);
      setShowCustomForm(true);
      setCustomSchedule(backup.schedule);
      setCustomFormData(parsed);
      setCustomOpenFields(openFieldsFromCron(parsed));
    } else {
      setShowCustomForm(false);
      setCustomSchedule('');
      setCustomFormData(emptyCustomForm);
      setCustomOpenFields({
        minute: false,
        hour: false,
        day: false,
        month: false,
        dayOfWeek: false
      });
    }
    setShowAddForm(false);
    setShowEditForm(true);
  };

  const updateScheduledBackup = async () => {
    if (!editingBackup) {
      return;
    }

    try {
      setLoading(true);

      if (!formData.schedule || (formData.schedule === 'custom' && !isValidCronExpression(customSchedule))) {
        toast.error('Seleziona una schedulazione valida');
        return;
      }

      const retentionValue = Number(formData.retentionValue);
      if (!Number.isInteger(retentionValue) || retentionValue < 0) {
        toast.error('Il valore di conservazione deve essere un intero >= 0');
        return;
      }

      const scheduleToSave = formData.schedule === 'custom' ? customSchedule : formData.schedule;
      const response = await axios.put(`/api/scheduled-backups/${editingBackup.id}`, {
        schedule: scheduleToSave,
        enabled: formData.enabled,
        retentionMode: formData.retentionMode,
        retentionValue
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Risposta non valida dal server');
      }

      toast.success('Schedulazione aggiornata');
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento: ' + (error.response?.data?.message || error.message));
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Backup schedulati"
        subtitle="Pianifica dump automatici e definisci la conservazione"
        actions={
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Nuova schedulazione</span>
          </button>
        }
      />

      {/* Form per nuova/modifica schedulazione */}
      {(showAddForm || showEditForm) && (
        <div className="card p-6">
          <h2 className="card-title mb-5">
            {showEditForm ? 'Modifica schedulazione' : 'Nuova schedulazione'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Connessione</label>
              {showEditForm ? (
                <input
                  type="text"
                  readOnly
                  value={getConnectionName(formData.connectionId)}
                  className="field-input bg-slate-50"
                />
              ) : (
                <select
                  name="connectionId"
                  value={formData.connectionId}
                  onChange={handleInputChange}
                  className="field-input"
                >
                  <option value="">Seleziona una connessione</option>
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name} ({connection.host}:{connection.port})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {showEditForm ? (
            <div>
              <label className="field-label">Database</label>
              <input
                type="text"
                readOnly
                value={formData.database}
                className="field-input bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Per cambiare connessione o database elimina la schedulazione e creane una nuova.
              </p>
            </div>
            ) : (
            <div className="md:col-span-2">
              <label className="field-label">
                Database ({availableDatabases.filter(db => db.selected).length} selezionati)
              </label>
              {formData.connectionId ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                      Seleziona i database per il backup
                    </span>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={selectAllDatabases}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        Seleziona tutti
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllDatabases}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Deseleziona
                      </button>
                    </div>
                  </div>
                  
                  {availableDatabases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-3">
                      {availableDatabases.map((db, index) => (
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
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <Database className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Nessun database configurato per questa connessione</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Database className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Seleziona prima una connessione</p>
                </div>
              )}
            </div>
            )}
            <div className="md:col-span-2">
              <label className="field-label">Schedulazione</label>
              <select
                name="schedule"
                value={formData.schedule}
                onChange={handleInputChange}
                className="field-input"
              >
                <option value="">Seleziona una schedulazione</option>
                {scheduleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formData.schedule === 'custom' && showCustomForm && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700">Schedulazione personalizzata</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Scegli un valore predefinito oppure Personalizzato per scrivere il campo cron a mano.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CRON_FIELDS.map((field) => {
                      const isCustom = customOpenFields[field.key] || !cronFieldPresets(field.key).includes(customFormData[field.key]);
                      return (
                        <div key={field.key}>
                          <label className="field-label">{field.label}</label>
                          <select
                            value={fieldSelectValue(field.key, customFormData[field.key])}
                            onChange={(e) => handleCronFieldSelect(field.key, e.target.value)}
                            className="field-input"
                          >
                            {field.presets.map((preset) => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                            <option value={CUSTOM_FIELD_VALUE}>Personalizzato…</option>
                          </select>
                          {isCustom && (
                            <input
                              type="text"
                              value={customFormData[field.key]}
                              onChange={(e) => handleCustomFormChange(field.key, e.target.value.trim())}
                              className="field-input font-mono mt-2"
                              placeholder={field.hint}
                            />
                          )}
                          <p className="text-xs text-slate-500 mt-1.5">{field.hint}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`mt-4 rounded-lg border p-3 ${
                    isValidCronExpression(customSchedule)
                      ? 'border-indigo-100 bg-indigo-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}>
                    <label className="field-label">Espressione cron</label>
                    <input
                      type="text"
                      value={customSchedule}
                      onChange={(e) => handleCronExpressionChange(e.target.value)}
                      className="field-input font-mono"
                      placeholder="min ora giorno mese giorno-settimana"
                      spellCheck={false}
                    />
                    <p className={`text-xs mt-1.5 ${
                      isValidCronExpression(customSchedule) ? 'text-slate-600' : 'text-rose-600'
                    }`}>
                      {isValidCronExpression(customSchedule)
                        ? describeCron(customSchedule)
                        : 'Inserisci 5 campi cron validi, ad esempio 0 */2 * * 1-5'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="field-label">Conservazione</label>
              <div className="flex flex-wrap gap-4 mb-2">
                <label className="inline-flex items-center space-x-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="retentionMode"
                    value="days"
                    checked={formData.retentionMode === 'days'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                  />
                  <span>Giorni di conservazione</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="retentionMode"
                    value="count"
                    checked={formData.retentionMode === 'count'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                  />
                  <span>Numero di backup conservati</span>
                </label>
              </div>
              <input
                type="number"
                name="retentionValue"
                min="0"
                step="1"
                value={formData.retentionValue}
                onChange={handleInputChange}
                className="field-input"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {formData.retentionMode === 'count'
                  ? '0 = disabilitata. Esempio: backup ogni ora e 12 file = ultime 12 ore.'
                  : '0 = disabilitata. I backup di questa operazione più vecchi verranno eliminati automaticamente.'}
              </p>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center space-x-2 text-sm text-slate-700 mb-1">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                />
                <span>Schedulazione attiva</span>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            {showEditForm ? (
              <button
                onClick={updateScheduledBackup}
                disabled={loading || !formData.schedule || (formData.schedule === 'custom' && !isValidCronExpression(customSchedule))}
                className="btn-primary"
              >
                {loading ? 'Salvando...' : 'Aggiorna schedulazione'}
              </button>
            ) : (
              <button
                onClick={saveScheduledBackup}
                disabled={loading || !formData.connectionId || availableDatabases.filter(db => db.selected).length === 0 || !formData.schedule || (formData.schedule === 'custom' && !isValidCronExpression(customSchedule))}
                className="btn-primary"
              >
                {loading ? 'Salvando...' : 'Salva schedulazione'}
              </button>
            )}
            <button onClick={resetForm} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista backup schedulati */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Schedulazioni</h2>
        </div>
        <div className="p-5">
          {scheduledBackups.length === 0 ? (
            <div className="empty-state">
              <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600">Nessun backup schedulato</p>
              <p className="text-sm text-slate-400 mt-1">Crea il tuo primo backup automatico</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledBackups.map((backup) => (
                <div key={backup.id} className="list-row">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {getConnectionName(backup.connectionId)}
                        </h3>
                        <span className={`badge ${
                          backup.enabled 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {backup.enabled ? 'Attivo' : 'Disabilitato'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Database: {backup.database}</p>
                      <p className="text-sm text-slate-500">{describeCron(backup.schedule)}</p>
                      <p className="text-xs text-slate-400 font-mono">Cron: {backup.schedule}</p>
                      <p className="text-sm text-slate-500">
                        Conservazione:{' '}
                        {Number(backup.retentionValue ?? backup.retentionDays) > 0
                          ? backup.retentionMode === 'count'
                            ? `${backup.retentionValue} backup`
                            : `${backup.retentionValue ?? backup.retentionDays} giorni`
                          : 'disabilitata'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Creato il {new Date(backup.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editScheduledBackup(backup)}
                        className="btn-icon-info"
                        title="Modifica schedulazione"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteScheduledBackup(backup.id)}
                        className="btn-icon-danger"
                        title="Elimina schedulazione"
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