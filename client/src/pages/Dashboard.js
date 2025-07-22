import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Clock, 
  FolderOpen, 
  Play,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    connections: 0,
    scheduledBackups: 0,
    backupFiles: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [connectionsRes, scheduledRes, backupsRes] = await Promise.all([
        axios.get('/api/connections'),
        axios.get('/api/scheduled-backups'),
        axios.get('/api/backups')
      ]);

      setStats({
        connections: connectionsRes.data.length,
        scheduledBackups: scheduledRes.data.length,
        backupFiles: backupsRes.data.length
      });
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche:', error);
    }
  };

  const quickActions = [
    {
      title: 'Nuova Connessione',
      description: 'Aggiungi una nuova connessione MySQL',
      icon: Plus,
      link: '/connections',
      color: 'bg-blue-500'
    },
    {
      title: 'Backup Manuale',
      description: 'Esegui un backup immediato',
      icon: Play,
      link: '/connections',
      color: 'bg-green-500'
    },
    {
      title: 'Nuovo Backup Schedulato',
      description: 'Crea un nuovo backup automatico',
      icon: Clock,
      link: '/scheduled-backups',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>Gestione Backup MySQL</span>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connessioni</p>
              <p className="text-2xl font-bold text-gray-900">{stats.connections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Backup Schedulati</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduledBackups}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">File di Backup</p>
              <p className="text-2xl font-bold text-gray-900">{stats.backupFiles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni Rapide */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Azioni Rapide</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.link}
                  className="block p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stato del Sistema */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Stato del Sistema</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Server Backend</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Database MySQL</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Connessioni: {stats.connections}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Backup Automatici</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Attivi: {stats.scheduledBackups}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 