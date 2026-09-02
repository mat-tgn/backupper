const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const updater = require('./updater');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage per connessioni, backup schedulati e impostazioni
let connections = [];
let scheduledBackups = [];
let settings = {
  retentionDays: 0 // giorni di conservazione (0 = disabilitata)
};

// Directory per i backup, dati e log
const backupDir = path.join(__dirname, 'backups');
const dataDir = path.join(__dirname, 'data');
const logsDir = path.join(__dirname, '..', 'logs');
const logFile = path.join(logsDir, 'backupper.log');
fs.ensureDirSync(backupDir);
fs.ensureDirSync(dataDir);
fs.ensureDirSync(logsDir);

function log(level, message, details) {
  const ts = new Date().toISOString();
  const detailStr = details !== undefined
    ? ` ${typeof details === 'string' ? details : JSON.stringify(details)}`
    : '';
  const line = `[${ts}] [${level}] ${message}${detailStr}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  try {
    fs.appendFileSync(logFile, line + '\n');
  } catch (err) {
    console.error('Impossibile scrivere sul file di log:', err.message);
  }
}

// File per salvare le connessioni
const connectionsFile = path.join(dataDir, 'connections.json');
const scheduledBackupsFile = path.join(dataDir, 'scheduled_backups.json');
const settingsFile = path.join(dataDir, 'settings.json');

function normalizeRetentionDays(value, fallback = 0) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0) {
    return fallback;
  }
  return days;
}

function normalizeRetentionMode(value) {
  return value === 'count' ? 'count' : 'days';
}

function getRetentionPolicy(job) {
  if (!job) {
    return { mode: 'days', value: 0 };
  }
  const mode = normalizeRetentionMode(job.retentionMode);
  const rawValue = job.retentionValue !== undefined
    ? job.retentionValue
    : job.retentionDays;
  return {
    mode,
    value: normalizeRetentionDays(rawValue, 0)
  };
}

function normalizeScheduledRetention(job, fallbackDays = 0) {
  if (job.retentionMode === undefined && job.retentionValue === undefined) {
    return {
      ...job,
      retentionMode: 'days',
      retentionValue: normalizeRetentionDays(job.retentionDays, fallbackDays)
    };
  }
  return {
    ...job,
    retentionMode: normalizeRetentionMode(job.retentionMode),
    retentionValue: normalizeRetentionDays(
      job.retentionValue !== undefined ? job.retentionValue : job.retentionDays,
      0
    )
  };
}

// Carica le connessioni salvate
function loadConnections() {
  try {
    if (fs.existsSync(connectionsFile)) {
      const data = fs.readFileSync(connectionsFile, 'utf8');
      connections = JSON.parse(data);
      console.log(`Caricate ${connections.length} connessioni`);
    }
  } catch (error) {
    console.error('Errore nel caricamento delle connessioni:', error);
  }
}

// Salva le connessioni
function saveConnections() {
  try {
    fs.writeFileSync(connectionsFile, JSON.stringify(connections, null, 2));
    // Rimuoviamo il log per evitare troppi messaggi
  } catch (error) {
    console.error('Errore nel salvataggio delle connessioni:', error);
  }
}

// Carica i backup schedulati salvati
function loadScheduledBackups() {
  try {
    if (fs.existsSync(scheduledBackupsFile)) {
      const data = fs.readFileSync(scheduledBackupsFile, 'utf8');
      scheduledBackups = JSON.parse(data);

      // Migra retention da connessione/globale → per operazione schedulata
      const globalRetention = normalizeRetentionDays(settings.retentionDays, 0);
      let migrated = false;
      scheduledBackups = scheduledBackups.map((job) => {
        if (job.retentionMode === undefined || job.retentionValue === undefined) {
          const connection = connections.find((c) => c.id === job.connectionId);
          migrated = true;
          return normalizeScheduledRetention(
            {
              ...job,
              retentionDays: job.retentionDays !== undefined
                ? job.retentionDays
                : connection?.retentionDays
            },
            globalRetention
          );
        }
        return normalizeScheduledRetention(job, 0);
      });
      if (migrated) {
        saveScheduledBackups();
        console.log('Migrata retention sulle operazioni schedulate');
      }

      console.log(`Caricati ${scheduledBackups.length} backup schedulati`);
      
      // Riattiva i backup schedulati
      scheduledBackups.forEach(backup => {
        if (backup.enabled) {
          scheduleBackup(backup);
        }
      });
    }
  } catch (error) {
    console.error('Errore nel caricamento dei backup schedulati:', error);
  }
}

// Salva i backup schedulati
function saveScheduledBackups() {
  try {
    fs.writeFileSync(scheduledBackupsFile, JSON.stringify(scheduledBackups, null, 2));
    // Rimuoviamo il log per evitare troppi messaggi
  } catch (error) {
    console.error('Errore nel salvataggio dei backup schedulati:', error);
  }
}

// Carica le impostazioni
function loadSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      settings = { ...settings, ...JSON.parse(data) };
      console.log(`Impostazioni caricate (retention: ${settings.retentionDays} giorni)`);
    } else {
      saveSettings();
    }
  } catch (error) {
    console.error('Errore nel caricamento delle impostazioni:', error);
  }
}

// Salva le impostazioni
function saveSettings() {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Errore nel salvataggio delle impostazioni:', error);
  }
}

// Estrae la data di creazione di un file di backup
function getBackupCreatedAt(file, stats) {
  const dateMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  let createdAt = stats.birthtime;

  if (dateMatch) {
    const dateStr = dateMatch[1];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    const hour = dateStr.substring(11, 13);
    const minute = dateStr.substring(14, 16);
    const second = dateStr.substring(17, 19);
    const millisecond = dateStr.substring(20, 23);
    createdAt = new Date(year, month - 1, day, hour, minute, second, millisecond);
  } else if (stats.birthtime.getTime() === 0) {
    createdAt = stats.mtime;
  }

  return createdAt;
}

// Elenca i file di backup ordinati dal più recente
function listBackupFiles() {
  const files = fs.readdirSync(backupDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        createdAt: getBackupCreatedAt(file, stats)
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const BACKUP_TS_RE = '\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z';

function findScheduledJobForBackup(fileName) {
  const withJobId = fileName.match(
    new RegExp(`^scheduled_backup_(${UUID_RE})_(${UUID_RE})_.+_${BACKUP_TS_RE}\\.sql$`, 'i')
  );
  if (withJobId) {
    const job = scheduledBackups.find((j) => j.id === withJobId[1]);
    if (job) {
      return job;
    }
  }

  const legacyScheduled = fileName.match(
    new RegExp(`^scheduled_backup_(${UUID_RE})_(.+)_(${BACKUP_TS_RE})\\.sql$`, 'i')
  );
  if (legacyScheduled) {
    const connectionId = legacyScheduled[1];
    const database = legacyScheduled[2];
    return scheduledBackups.find(
      (j) => j.connectionId === connectionId && j.database === database
    ) || null;
  }

  return null;
}

function deleteExpiredBackupFile(fileName, reason) {
  try {
    fs.unlinkSync(path.join(backupDir, fileName));
    console.log(`Backup scaduto eliminato: ${fileName} (${reason})`);
    return true;
  } catch (error) {
    console.error(`Errore eliminazione backup scaduto ${fileName}:`, error.message);
    return false;
  }
}

// Elimina i backup schedulati oltre la retention dell'operazione (giorni o numero)
function cleanupExpiredBackups() {
  let deleted = 0;
  const now = new Date();
  const filesByJob = new Map();

  for (const file of listBackupFiles()) {
    const job = findScheduledJobForBackup(file.name);
    if (!job) {
      continue;
    }
    if (!filesByJob.has(job.id)) {
      filesByJob.set(job.id, { job, files: [] });
    }
    filesByJob.get(job.id).files.push(file);
  }

  for (const { job, files } of filesByJob.values()) {
    const { mode, value } = getRetentionPolicy(job);
    if (!value || value <= 0) {
      continue;
    }

    let toDelete = [];
    if (mode === 'count') {
      toDelete = files.slice(value);
    } else {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - value);
      toDelete = files.filter((file) => new Date(file.createdAt) < cutoff);
    }

    const reason = mode === 'count'
      ? `retention ${value} file`
      : `retention ${value}g`;

    for (const file of toDelete) {
      if (deleteExpiredBackupFile(file.name, reason)) {
        deleted += 1;
      }
    }
  }

  if (deleted > 0) {
    console.log(`Cleanup retention: eliminati ${deleted} backup scaduti`);
  }

  return { deleted };
}

// Carica i dati all'avvio (settings e connessioni prima, per migrare retention sui job)
loadSettings();
loadConnections();
loadScheduledBackups();
cleanupExpiredBackups();

// Cleanup automatico ogni giorno a mezzanotte
cron.schedule('0 0 * * *', () => {
  cleanupExpiredBackups();
});

// API Routes

// Test connessione MySQL
app.post('/api/test-connection', async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port) || 3306,
      user,
      password,
      database
    });
    
    await connection.ping();
    await connection.end();
    
    res.json({ success: true, message: 'Connessione riuscita!' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cerca database disponibili
app.post('/api/discover-databases', async (req, res) => {
  try {
    const { host, port, user, password } = req.body;
    
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port) || 3306,
      user,
      password
    });
    
    const [rows] = await connection.execute('SHOW DATABASES');
    await connection.end();
    
    const databases = rows.map(row => row.Database).filter(db => 
      !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db)
    );
    
    res.json({ success: true, databases });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Salva connessione
app.post('/api/connections', (req, res) => {
  try {
    const { retentionDays: _ignoredRetention, ...connectionFields } = req.body;
    const connection = {
      id: uuidv4(),
      ...connectionFields,
      createdAt: new Date().toISOString()
    };
    
    connections.push(connection);
    saveConnections(); // Salva automaticamente
    res.json({ success: true, connection });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lista connessioni
app.get('/api/connections', (req, res) => {
  res.json(connections);
});

// Elimina connessione
app.delete('/api/connections/:id', (req, res) => {
  const { id } = req.params;
  connections = connections.filter(conn => conn.id !== id);
  saveConnections(); // Salva automaticamente
  res.json({ success: true });
});

// Aggiorna connessione
app.put('/api/connections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    
    if (connectionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Connessione non trovata' });
    }

    const { retentionDays: _ignoredRetentionUpdate, ...connectionFields } = req.body;

    // Aggiorna la connessione mantenendo l'ID e la data di creazione
    connections[connectionIndex] = {
      ...connections[connectionIndex],
      ...connectionFields,
      updatedAt: new Date().toISOString()
    };
    
    saveConnections(); // Salva automaticamente
    res.json({
      success: true,
      connection: connections[connectionIndex]
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Esegue mysqldump/mariadb-dump senza shell (password con caratteri speciali sicure)
function runDumpCommand(bin, connection, database, backupPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--skip-ssl',
      '-h', String(connection.host),
      '-P', String(connection.port || 3306),
      '-u', String(connection.user),
      `-p${connection.password || ''}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      String(database)
    ];

    log('INFO', `Avvio dump con ${bin}`, {
      host: connection.host,
      port: connection.port || 3306,
      user: connection.user,
      database,
      backupPath
    });

    const out = fs.createWriteStream(backupPath);
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stdout.pipe(out);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      out.destroy();
      reject(new Error(`${bin} non disponibile: ${err.message}`));
    });

    child.on('close', (code) => {
      out.end(() => {
        if (code === 0) {
          const size = fs.existsSync(backupPath) ? fs.statSync(backupPath).size : 0;
          log('INFO', `Dump completato con ${bin}`, { backupPath, size });
          resolve({ bin, stderr: stderr.trim() });
          return;
        }
        try {
          if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        } catch (_) { /* ignore */ }
        const detail = stderr.trim() || `exit code ${code}`;
        reject(new Error(`${bin} fallito: ${detail}`));
      });
    });
  });
}

async function runDatabaseDump(connection, database, backupPath) {
  const bins = ['mysqldump', 'mariadb-dump'];
  const errors = [];

  for (const bin of bins) {
    try {
      return await runDumpCommand(bin, connection, database, backupPath);
    } catch (err) {
      log('WARN', err.message);
      errors.push(err.message);
    }
  }

  const message = errors.join(' | ');
  log('ERROR', 'Backup fallito', { database, message });
  throw new Error(message);
}

// Backup manuale
app.post('/api/backup', async (req, res) => {
  try {
    const { connectionId, database } = req.body;
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connessione non trovata' });
    }

    if (!database) {
      return res.status(400).json({ success: false, message: 'Database non specificato' });
    }

    log('INFO', 'Richiesta backup manuale', {
      connectionId,
      host: connection.host,
      database
    });

    // Verifica connettività prima del dump
    const mysqlConnection = await mysql.createConnection({
      host: connection.host,
      port: parseInt(connection.port) || 3306,
      user: connection.user,
      password: connection.password,
      database
    });
    await mysqlConnection.ping();
    await mysqlConnection.end();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${connectionId}_${database}_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);

    const result = await runDatabaseDump(connection, database, backupPath);

    res.json({
      success: true,
      message: 'Backup completato con successo',
      backupFile: backupFileName,
      tool: result.bin
    });
  } catch (error) {
    log('ERROR', 'Errore backup manuale', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crea backup schedulato
app.post('/api/scheduled-backups', (req, res) => {
  try {
    const {
      connectionId,
      database,
      schedule,
      enabled = true,
      retentionMode,
      retentionValue,
      retentionDays
    } = req.body;
    
    console.log('Creazione backup schedulato:', {
      connectionId,
      database,
      schedule,
      enabled,
      retentionMode,
      retentionValue
    });
    
    // Verifica che la connessione esista
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) {
      return res.status(400).json({ success: false, message: 'Connessione non trovata' });
    }

    if (retentionMode !== undefined && retentionMode !== 'days' && retentionMode !== 'count') {
      return res.status(400).json({
        success: false,
        message: 'retentionMode deve essere "days" o "count"'
      });
    }

    const incomingRetentionValue = retentionValue !== undefined ? retentionValue : retentionDays;
    if (incomingRetentionValue !== undefined) {
      const amount = Number(incomingRetentionValue);
      if (!Number.isInteger(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Il valore di conservazione deve essere un intero >= 0 (0 = disabilitata)'
        });
      }
    }
    
    const scheduledBackup = {
      id: uuidv4(),
      connectionId,
      database,
      schedule,
      enabled,
      retentionMode: normalizeRetentionMode(retentionMode),
      retentionValue: normalizeRetentionDays(incomingRetentionValue, 0),
      createdAt: new Date().toISOString()
    };
    
    scheduledBackups.push(scheduledBackup);
    
    console.log('Backup schedulato salvato:', scheduledBackup.id);
    
    // Salva solo alla fine per evitare riavvii continui
    try {
      saveScheduledBackups();
    } catch (error) {
      console.error('Errore salvataggio backup schedulati:', error);
    }
    
    // Schedula il backup se abilitato
    if (enabled) {
      scheduleBackup(scheduledBackup);
    }
    
    res.json({ success: true, scheduledBackup });
  } catch (error) {
    console.error('Errore creazione backup schedulato:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lista backup schedulati
app.get('/api/scheduled-backups', (req, res) => {
  res.json(scheduledBackups);
});

// Elimina backup schedulato
app.delete('/api/scheduled-backups/:id', (req, res) => {
  const { id } = req.params;
  scheduledBackups = scheduledBackups.filter(backup => backup.id !== id);
  saveScheduledBackups(); // Salva automaticamente
  res.json({ success: true });
});

app.get('/api/updates', async (req, res) => {
  try {
    res.json(await updater.checkUpdate());
  } catch (error) {
    log('ERROR', 'Controllo aggiornamenti fallito', error.message);
    res.status(502).json({ success: false, message: error.message });
  }
});

app.get('/api/updates/status', (req, res) => {
  res.json(updater.getUpdateStatus());
});

app.post('/api/updates/apply', async (req, res) => {
  try {
    const result = await updater.applyUpdate();
    res.json(result);
    if (result.restarting) {
      setTimeout(() => process.exit(0), 1500);
    }
  } catch (error) {
    log('ERROR', 'Applicazione aggiornamento fallita', error.message);
    const status = error.code === 'UPDATE_IN_PROGRESS' ? 409 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

// Impostazioni applicazione
app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  try {
    const { retentionDays } = req.body;

    if (retentionDays !== undefined) {
      const days = Number(retentionDays);
      if (!Number.isInteger(days) || days < 0) {
        return res.status(400).json({
          success: false,
          message: 'retentionDays deve essere un intero >= 0 (0 = disabilitata)'
        });
      }
      settings.retentionDays = days;
    }

    saveSettings();
    const cleanup = cleanupExpiredBackups();

    res.json({
      success: true,
      settings,
      deletedOnSave: cleanup.deleted
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lista file di backup (dal più recente)
app.get('/api/backups', (req, res) => {
  try {
    res.json(listBackupFiles());
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download file di backup
app.get('/api/backups/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(backupDir, filename);
    
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File non trovato' });
    }
    
    // Imposta gli header per il download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/sql');
    
    // Invia il file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Elimina file di backup
app.delete('/api/backups/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(backupDir, filename);
    
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File non trovato' });
    }
    
    // Elimina il file
    fs.unlinkSync(filePath);
    
    res.json({ success: true, message: 'File eliminato con successo' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Funzione per schedulare backup
function scheduleBackup(scheduledBackup) {
  const connection = connections.find(c => c.id === scheduledBackup.connectionId);
  if (!connection) {
    log('WARN', 'Schedule saltato: connessione non trovata', scheduledBackup.connectionId);
    return;
  }

  cron.schedule(scheduledBackup.schedule, async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `scheduled_backup_${scheduledBackup.id}_${scheduledBackup.connectionId}_${scheduledBackup.database}_${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);

      log('INFO', 'Avvio backup schedulato', {
        id: scheduledBackup.id,
        database: scheduledBackup.database,
        schedule: scheduledBackup.schedule
      });

      await runDatabaseDump(connection, scheduledBackup.database, backupPath);
      log('INFO', `Backup schedulato completato: ${backupFileName}`);
      cleanupExpiredBackups();
    } catch (error) {
      log('ERROR', 'Errore backup schedulato', error.message);
    }
  });

  log('INFO', 'Backup schedulato attivato', {
    id: scheduledBackup.id,
    schedule: scheduledBackup.schedule,
    database: scheduledBackup.database
  });
}

// Servi i file statici del client React (solo se è stata fatta la build)
const clientBuildDir = path.join(__dirname, '../client/build');
const clientIndex = path.join(clientBuildDir, 'index.html');

if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientBuildDir));
  app.get('*', (req, res) => {
    res.sendFile(clientIndex);
  });
} else {
  app.get('*', (req, res) => {
    res.status(503).type('text').send(
      'Frontend non compilato. In sviluppo apri http://localhost:3000 (npm run dev) ' +
      'oppure genera la build con: cd client && npm run build'
    );
  });
}

// Avvia server
app.listen(PORT, () => {
  log('INFO', `Server Backupper avviato sulla porta ${PORT}`);
  log('INFO', `File di log: ${logFile}`);
}); 