
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Icons } from '../icons';

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/import': 'Import Dati',
  '/settings': 'Parametri di Calcolo',
  '/proposal': 'Proposta d\'Ordine',
  '/quick-analysis': 'Analisi Rapida',
  '/csv-proposal': 'Genera Proposta da CSV',
  '/archived-proposals': 'Storico Proposte',
};


const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'AR Auto';

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
         <button onClick={onMenuClick} className="text-gray-500 focus:outline-none lg:hidden mr-4">
            <Icons.Menu className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">{title}</h1>
      </div>
    </header>
  );
};

export default Header;
