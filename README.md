# Backupper - Gestione Backup MySQL con GUI

Un'applicazione web moderna per gestire backup di database MySQL con interfaccia grafica intuitiva.

## 🚀 Caratteristiche

- **Interfaccia Web Moderna**: GUI React con design responsive
- **Gestione Connessioni**: Aggiungi e gestisci connessioni MySQL
- **Backup Manuali**: Esegui backup on-demand
- **Backup Schedulati**: Automatizza i backup con cron expressions
- **Gestione File**: Visualizza, scarica ed elimina file di backup
- **Container Docker**: Facile deployment con Docker Compose
- **phpMyAdmin**: Interfaccia opzionale per gestione database

## 📋 Prerequisiti

- Docker e Docker Compose
- Node.js 18+ (per sviluppo locale)

## 🛠️ Installazione

### Con Docker (Raccomandato)

1. **Clona il repository**:
   ```bash
   git clone <repository-url>
   cd backupper
   ```

2. **Avvia l'applicazione**:
   ```bash
   docker-compose up -d
   ```

3. **Accedi all'applicazione**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - phpMyAdmin: http://localhost:8080

### Sviluppo Locale

1. **Installa le dipendenze**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```

## 🗄️ Configurazione Database

### Database di Test (incluso)

L'applicazione include un database MySQL di test con le seguenti credenziali:

- **Host**: localhost (o mysql nel container)
- **Porta**: 3306
- **Utente**: backupper_user
- **Password**: backupper_pass
- **Database**: test_db

### Connessione a Database Esterni

1. Vai alla sezione "Connessioni"
2. Clicca "Nuova Connessione"
3. Inserisci i dettagli del tuo database MySQL
4. Testa la connessione
5. Salva la connessione

## 📊 Utilizzo

### Dashboard
- Visualizza statistiche generali
- Accedi rapidamente alle funzioni principali
- Monitora lo stato del sistema

### Connessioni
- Aggiungi nuove connessioni MySQL
- Testa la connettività
- Esegui backup manuali
- Gestisci connessioni esistenti

### Backup Schedulati
- Crea backup automatici
- Scegli tra schedulazioni predefinite
- Usa espressioni cron personalizzate
- Monitora i backup schedulati

### File di Backup
- Visualizza tutti i file di backup
- Scarica backup specifici
- Elimina file non necessari
- Monitora lo spazio utilizzato

## ⚙️ Configurazione Avanzata

### Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
NODE_ENV=production
PORT=3001
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=backupper_user
MYSQL_PASSWORD=backupper_pass
MYSQL_DATABASE=test_db
```

### Volumi Docker

I backup sono salvati nel volume `./backend/backups` che viene montato nel container.

### Rete Docker

L'applicazione utilizza una rete Docker dedicata per la comunicazione tra servizi.

## 🔧 Sviluppo

### Struttura del Progetto

```
backupper/
├── frontend/              # Frontend React
│   ├── src/
│   │   ├── components/    # Componenti React
│   │   ├── pages/        # Pagine dell'applicazione
│   │   └── App.js        # Componente principale
│   └── package.json
├── backend/               # Backend Node.js
│   ├── index.js          # Server Express
│   ├── backups/          # Directory backup
│   └── package.json
├── docker-compose.yml     # Configurazione Docker
├── Dockerfile            # Immagine Docker
└── README.md
```

### Script Disponibili

```bash
# Sviluppo
npm run dev              # Avvia backend e frontend
npm run backend          # Solo backend
npm run frontend         # Solo frontend

# Docker
npm run docker:build     # Build immagine Docker
npm run docker:up        # Avvia container
npm run docker:down      # Ferma container
```

## 🐛 Risoluzione Problemi

### Problemi di Connessione MySQL

1. Verifica che il database sia raggiungibile
2. Controlla le credenziali
3. Assicurati che mysqldump sia installato

### Problemi Docker

1. Ricostruisci l'immagine:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. Verifica i log:
   ```bash
   docker-compose logs backupper
   ```

### Problemi di Backup

1. Verifica i permessi della directory backup
2. Controlla che mysqldump sia disponibile
3. Verifica la connessione al database

## 📝 Licenza

MIT License - vedi il file LICENSE per i dettagli.

## 🤝 Contributi

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📞 Supporto

Per supporto e domande:
- Apri una issue su GitHub
- Contatta il team di sviluppo

---

**Backupper** - Gestione backup MySQL semplificata 🗄️✨ 