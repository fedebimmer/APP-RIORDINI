import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Role } from '../../types';
import { Icons } from '../icons';
import Badge from '../ui/Badge';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: ['Admin', 'Operativo'] },
  { to: '/import', label: 'Import Dati', icon: Icons.Upload, roles: ['Admin'] },
  { to: '/proposal', label: 'Proposta d\'ordine', icon: Icons.Cart, roles: ['Admin', 'Operativo'] },
  // FIX: Corrected icon name from `Icons.FileText` to `Icons.File` to match the export from `components/icons.tsx`.
  { to: '/archived-proposals', label: 'Storico Proposte', icon: Icons.File, roles: ['Admin', 'Operativo'] },
  { to: '/csv-proposal', label: 'Proposta da CSV', icon: Icons.Excel, roles: ['Admin', 'Operativo'] },
  { to: '/quick-analysis', label: 'Analisi Rapida', icon: Icons.Wand, roles: ['Admin', 'Operativo']},
  { to: '/settings', label: 'Parametri', icon: Icons.Settings, roles: ['Admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { proposal } = useData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      ></div>
      <div
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform lg:relative lg:translate-x-0 lg:w-64 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">AR Auto</h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 dark:text-gray-400">
            <Icons.Close className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }`
              }
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </div>
              {item.to === '/proposal' && proposal.length > 0 && (
                <Badge color="blue">{proposal.length}</Badge>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center mr-3">
              <Icons.User className="w-6 h-6 text-blue-600"/>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{user?.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Icons.Logout className="w-5 h-5 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;