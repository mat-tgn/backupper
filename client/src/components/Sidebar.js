import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Home, 
  Database, 
  Clock, 
  FolderOpen,
  HardDrive
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [versionLabel, setVersionLabel] = useState(null);

  useEffect(() => {
    axios.get('/api/updates')
      .then(({ data }) => {
        setVersionLabel(data.current?.shortSha || data.current?.version || null);
      })
      .catch(() => {});
  }, []);

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/connections', icon: Database, label: 'Connessioni' },
    { path: '/scheduled-backups', icon: Clock, label: 'Backup Schedulati' },
    { path: '/backup-files', icon: FolderOpen, label: 'File di Backup' },
  ];

  return (
    <div className="bg-white shadow-lg w-64 flex-shrink-0 relative">
      <div className="p-6">
        <div className="flex items-center justify-center">
          <img 
            src="/logo.svg" 
            alt="Backupper Logo" 
            className="h-12 w-auto"
            onError={(e) => {
              // Fallback se il logo non viene caricato
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="flex items-center space-x-3" style={{ display: 'none' }}>
            <HardDrive className="h-8 w-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">Backupper</h1>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {versionLabel && (
        <div className="absolute bottom-0 left-0 w-64 px-6 py-4 text-xs text-gray-400">
          Revisione {versionLabel}
        </div>
      )}
    </div>
  );
};

export default Sidebar; 