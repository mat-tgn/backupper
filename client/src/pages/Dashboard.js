import React, { useState, useEffect } from 'react';
import {
  Database,
  Clock,
  FolderOpen,
  Play,
  Plus,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageHeader from '../components/PageHeader';

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

  const statCards = [
    { label: 'Connessioni', value: stats.connections, icon: Database, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Backup schedulati', value: stats.scheduledBackups, icon: Clock, tone: 'bg-violet-50 text-violet-600' },
    { label: 'File di backup', value: stats.backupFiles, icon: FolderOpen, tone: 'bg-emerald-50 text-emerald-600' },
  ];

  const quickActions = [
    {
      title: 'Nuova connessione',
      description: 'Collega un server MySQL',
      icon: Plus,
      link: '/connections',
      tone: 'bg-indigo-600'
    },
    {
      title: 'Backup manuale',
      description: 'Esegui un dump immediato',
      icon: Play,
      link: '/connections',
      tone: 'bg-emerald-600'
    },
    {
      title: 'Nuova schedulazione',
      description: 'Automatizza i backup',
      icon: Clock,
      link: '/scheduled-backups',
      tone: 'bg-violet-600'
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Stato e azioni rapide per i backup MySQL"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2.5 ${stat.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Azioni rapide</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="group rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-card"
              >
                <div className={`mb-4 inline-flex rounded-lg p-2.5 text-white ${action.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-primary-700">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="card-title">Stato del sistema</h2>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-600">Server backend</span>
            <span className="badge bg-emerald-50 text-emerald-700">Online</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-600">Connessioni MySQL</span>
            <span className="badge bg-amber-50 text-amber-800">{stats.connections} configurate</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-slate-600">Backup automatici</span>
            <span className="badge bg-indigo-50 text-indigo-700">{stats.scheduledBackups} attivi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
