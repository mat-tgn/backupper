#!/bin/bash

# Script per avviare Backupper
echo "🚀 Avvio di Backupper..."

# Verifica se Docker è installato
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non è installato. Installa Docker prima di continuare."
    exit 1
fi

# Verifica se Docker Compose è installato
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose non è installato. Installa Docker Compose prima di continuare."
    exit 1
fi

# Verifica se i container sono già in esecuzione
if docker-compose ps | grep -q "backupper"; then
    echo "⚠️  I container sono già in esecuzione."
    echo "Vuoi riavviarli? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🔄 Riavvio dei container..."
        docker-compose down
        docker-compose up -d
    else
        echo "✅ I container sono già attivi."
        echo "📱 Frontend: http://localhost:3000"
        echo "🔧 Backend API: http://localhost:3001"
        echo "🗄️  phpMyAdmin: http://localhost:8080"
        exit 0
    fi
else
    echo "🔨 Avvio dei container..."
    docker-compose up -d
fi

# Attendi che i container siano pronti
echo "⏳ Attendo che i servizi siano pronti..."
sleep 10

# Verifica lo stato dei container
if docker-compose ps | grep -q "Up"; then
    echo "✅ Backupper avviato con successo!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "🗄️  phpMyAdmin: http://localhost:8080"
    echo ""
    echo "📊 Credenziali database di test:"
    echo "   Host: localhost"
    echo "   Porta: 3306"
    echo "   Utente: backupper_user"
    echo "   Password: backupper_pass"
    echo "   Database: test_db"
    echo ""
    echo "🛑 Per fermare l'applicazione: docker-compose down"
else
    echo "❌ Errore nell'avvio dei container."
    echo "Controlla i log con: docker-compose logs"
    exit 1
fi 