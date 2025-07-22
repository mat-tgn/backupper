const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage per connessioni e backup schedulati
let connections = [];
let scheduledBackups = [];

// Directory per i backup e dati
const backupDir = path.join(__dirname, 'backups');
const dataDir = path.join(__dirname, 'data');
fs.ensureDirSync(backupDir);
fs.ensureDirSync(dataDir);

// File per salvare le connessioni
const connectionsFile = path.join(dataDir, 'connections.json');
const scheduledBackupsFile = path.join(dataDir, 'scheduled_backups.json');

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

// Carica i dati all'avvio
loadConnections();
loadScheduledBackups();

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
    const connection = {
      id: uuidv4(),
      ...req.body,
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
    
    // Aggiorna la connessione mantenendo l'ID e la data di creazione
    connections[connectionIndex] = {
      ...connections[connectionIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    saveConnections(); // Salva automaticamente
    res.json({ success: true, connection: connections[connectionIndex] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Backup manuale
app.post('/api/backup', async (req, res) => {
  try {
    const { connectionId, database } = req.body;
    const connection = connections.find(c => c.id === connectionId);
    
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connessione non trovata' });
    }
    
    const mysqlConnection = await mysql.createConnection({
      host: connection.host,
      port: parseInt(connection.port) || 3306,
      user: connection.user,
      password: connection.password,
      database: database || connection.database
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${database}_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Esegui backup usando il comando appropriato (mysqldump o mariadb-dump)
    const { exec } = require('child_process');
    
    // Prova prima mysqldump, se fallisce usa mariadb-dump
    const tryMysqldump = () => {
      const mysqldumpCmd = `mysqldump --skip-ssl -h ${connection.host} -P ${connection.port} -u ${connection.user} -p${connection.password} ${database} > ${backupPath}`;
      
      exec(mysqldumpCmd, (error, stdout, stderr) => {
        if (error) {
          console.log('mysqldump fallito, provo mariadb-dump...');
          // Se mysqldump fallisce, prova mariadb-dump
          const mariadbDumpCmd = `mariadb-dump --skip-ssl -h ${connection.host} -P ${connection.port} -u ${connection.user} -p${connection.password} ${database} > ${backupPath}`;
          
          exec(mariadbDumpCmd, (mariadbError, mariadbStdout, mariadbStderr) => {
            if (mariadbError) {
              console.error('Errore backup:', mariadbError);
              return res.status(500).json({ success: false, message: 'Errore durante il backup' });
            }
            
            res.json({
              success: true,
              message: 'Backup completato con successo',
              backupFile: backupFileName
            });
          });
        } else {
          res.json({
            success: true,
            message: 'Backup completato con successo',
            backupFile: backupFileName
          });
        }
      });
    };
    
    tryMysqldump();
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crea backup schedulato
app.post('/api/scheduled-backups', (req, res) => {
  try {
    const { connectionId, database, schedule, enabled = true } = req.body;
    
    console.log('Creazione backup schedulato:', { connectionId, database, schedule, enabled });
    
    // Verifica che la connessione esista
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) {
      return res.status(400).json({ success: false, message: 'Connessione non trovata' });
    }
    
    const scheduledBackup = {
      id: uuidv4(),
      connectionId,
      database,
      schedule,
      enabled,
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

// Lista file di backup
app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        // Estrai la data dal nome del file se possibile
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        let createdAt = stats.birthtime;
        
        if (dateMatch) {
          // Converti la data dal nome del file (formato: 2025-07-22T15-23-56-495Z)
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
          // Se birthtime non è disponibile, usa mtime
          createdAt = stats.mtime;
        }
        
        return {
          name: file,
          size: stats.size,
          createdAt: createdAt
        };
      });
    
    res.json(backupFiles);
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
  if (!connection) return;
  
  cron.schedule(scheduledBackup.schedule, async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `scheduled_backup_${scheduledBackup.database}_${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);
      
            const { exec } = require('child_process');
      
      // Prova prima mysqldump, se fallisce usa mariadb-dump
      const tryMysqldump = () => {
        const mysqldumpCmd = `mysqldump --skip-ssl -h ${connection.host} -P ${connection.port} -u ${connection.user} -p${connection.password} ${scheduledBackup.database} > ${backupPath}`;
        
        exec(mysqldumpCmd, (error, stdout, stderr) => {
          if (error) {
            console.log('mysqldump fallito, provo mariadb-dump...');
            // Se mysqldump fallisce, prova mariadb-dump
            const mariadbDumpCmd = `mariadb-dump --skip-ssl -h ${connection.host} -P ${connection.port} -u ${connection.user} -p${connection.password} ${scheduledBackup.database} > ${backupPath}`;
            
            exec(mariadbDumpCmd, (mariadbError, mariadbStdout, mariadbStderr) => {
              if (mariadbError) {
                console.error('Errore backup schedulato:', mariadbError);
              } else {
                console.log(`Backup schedulato completato: ${backupFileName}`);
              }
            });
          } else {
            console.log(`Backup schedulato completato: ${backupFileName}`);
          }
        });
      };
      
      tryMysqldump();
    } catch (error) {
      console.error('Errore backup schedulato:', error);
    }
  });
}

// Servi i file statici del client React
app.use(express.static(path.join(__dirname, '../client/build')));

// Gestisci tutte le route del client React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Avvia server
app.listen(PORT, () => {
  console.log(`Server Backupper avviato sulla porta ${PORT}`);
}); 