import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Home,
  Database,
  Clock,
  FolderOpen,
  HardDrive,
  X
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: Home, label: 'Dashboard', hint: 'Panoramica' },
  { path: '/connections', icon: Database, label: 'Connessioni', hint: 'Server MySQL' },
  { path: '/scheduled-backups', icon: Clock, label: 'Schedulazioni', hint: 'Backup automatici' },
  { path: '/backup-files', icon: FolderOpen, label: 'Archivio', hint: 'File salvati' },
];

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const [versionLabel, setVersionLabel] = useState(null);

  useEffect(() => {
    axios.get('/api/updates')
      .then(({ data }) => {
        setVersionLabel(data.current?.shortSha || data.current?.version || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    onClose?.();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (
    <>
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.svg"
            alt="Backupper"
            className="h-8 w-auto max-w-[140px]"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="items-center gap-2 text-white" style={{ display: 'none' }}>
            <HardDrive className="h-6 w-6 text-indigo-300" />
            <span className="text-sm font-semibold">Backupper</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigazione
        </p>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className={`block text-[11px] ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.hint}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {versionLabel && (
        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          Revisione <span className="font-mono text-slate-400">{versionLabel}</span>
        </div>
      )}
    </>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {nav}
      </aside>
    </>
  );
};

export default Sidebar;
