# Dockerfile per Backupper
FROM node:18-alpine

# Installa mysqldump
RUN apk add --no-cache mysql-client

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Installa le dipendenze
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copia il codice sorgente
COPY . .

# Build del client (CI=false: i warning ESLint non bloccano la build)
ENV CI=false
RUN cd client && npm run build

# Espone le porte
EXPOSE 3001 3000

# Comando di avvio
CMD ["npm", "run", "dev"] 