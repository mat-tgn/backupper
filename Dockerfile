# Dockerfile per Backupper
FROM node:18-alpine

# Installa mysqldump
RUN apk add --no-cache mysql-client

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Installa le dipendenze
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copia il codice sorgente
COPY . .

# Build del frontend (CI=false: i warning ESLint non bloccano la build)
ENV CI=false
RUN cd frontend && npm run build

# Espone le porte
EXPOSE 3001 3000

# Comando di avvio
CMD ["npm", "run", "dev"] 